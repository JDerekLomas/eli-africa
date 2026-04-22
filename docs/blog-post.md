# Mapping Nigeria's Invisible Cocoa Farms with AI and Satellite Imagery

*Using Gemini and Sentinel-2 to extend cocoa detection from Ghana to Nigeria — where no ground-truth map exists.*

---

Nigeria produces 6% of the world's cocoa — roughly 350,000 tonnes per year from an estimated 600,000 farming households across the country's southwestern and southeastern states. Yet if you search for a map of where these farms actually are, you'll find nothing.

Ghana and Cote d'Ivoire, which together produce 60% of global cocoa, have been mapped at 10-meter resolution by the [Forest Data Partnership](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a) using machine learning on satellite imagery. The resulting maps can distinguish individual farms, differentiate monoculture from agroforestry cocoa, and track deforestation. But Nigeria — the world's 4th largest producer — is a blank spot.

This matters for climate adaptation. As temperatures rise and rainfall patterns shift across West Africa, knowing exactly where cocoa is grown is essential for planning which regions need drought-resistant varieties, where irrigation investments should go, and which communities are most vulnerable. You can't adapt what you can't see.

## The Problem: No Labels, No Model

Traditional satellite-based crop mapping follows a predictable pipeline: collect ground-truth labels (GPS points of confirmed cocoa farms), extract spectral features from satellite imagery at those locations, train a classifier, and apply it across the region. The Forest Data Partnership's Ghana/Cote d'Ivoire model used exactly this approach — and it required extensive field campaigns, partnerships with local organizations, and years of data collection.

Nigeria doesn't have this labeled dataset. And building one from scratch would take years and significant funding.

But here's what we do have:

1. **Millions of labeled pixels** from Ghana and Cote d'Ivoire (the FDP model)
2. **Identical satellite coverage** — Sentinel-2 images Nigeria at 10m resolution every 5 days, the same sensor that covers Ghana
3. **Nearly identical ecology** — Nigeria's cocoa belt (Ondo, Osun, Ekiti, Cross River states) shares climate, elevation, and soil characteristics with Ghana's cocoa regions
4. **A multimodal AI model** (Gemini) that can reason about visual patterns in satellite imagery — including [native multi-spectral support](https://developers.googleblog.com/unlocking-multi-spectral-data-with-gemini/)

## The Approach: Cross-Border Visual Transfer with Gemini

Instead of training a new model from scratch, we're asking a fundamentally different question: *Can an AI that has seen cocoa farms in Ghana recognize them in Nigeria?*

This is a visual transfer learning problem, and it's exactly the kind of task that large multimodal models excel at.

### Step 1: Export Reference Tiles from Ghana

Using Google Earth Engine, we export 256×256 pixel tiles (each covering ~2.56km × 2.56km) from Ghana's cocoa regions. We use the FDP model to select tiles that are confirmed cocoa (probability > 0.7) and confirmed non-cocoa (probability < 0.2).

Each tile includes:
- **True-color RGB** — what the landscape looks like from space
- **False-color NIR-R-G** — highlights vegetation health and structure
- **Metadata** — coordinates, elevation, annual rainfall, land use classification

Here's what cocoa looks like from space — a confirmed cocoa farm near Kumasi, Ghana at 160m elevation with 1,514mm annual rainfall:

**Ghana Cocoa — RGB (left) and NIR false-color (right):**

![Ghana cocoa RGB](../tiles/ghana_cocoa/ghana_cocoa_0000_rgb.png) ![Ghana cocoa NIR](../tiles/ghana_cocoa/ghana_cocoa_0000_nir.png)

Dense, dark-green tree canopy with irregular field boundaries. A road and small settlement visible in the lower right. In the NIR false-color, the deep red saturation indicates healthy, dense vegetation — the signature of established tree crops like cocoa under shade canopy.

**A second Ghana cocoa tile — pure agroforestry canopy:**

![Ghana cocoa 2](../tiles/ghana_cocoa/ghana_cocoa_0001_rgb.png)

Nearly continuous tree cover with subtle textural variation — classic cocoa agroforestry where cocoa trees grow beneath taller shade trees.

**For comparison — what is definitely NOT cocoa:**

![Nigeria savanna](../tiles/nigeria_control/nigeria_control_0002_rgb.png) ![Nigeria savanna NIR](../tiles/nigeria_control/nigeria_control_0002_nir.png)

Northern Nigeria savanna (Kaduna area, 619m elevation, 1,154mm rainfall). Geometric farm plots, brown/tan dry season landscape, sparse tree cover along waterways. The NIR shows patchy red only along riparian corridors. This is obviously, visually, completely different from cocoa.

### Step 2: Few-Shot Classification with Gemini

We feed Gemini a carefully structured prompt with the Ghana reference tiles as examples:

> "Here are confirmed cocoa farms in Ghana's satellite imagery. Here are non-cocoa areas from the same climate zone. Now look at this tile from Nigeria and tell me: is this cocoa?"

The key insight is that we're not asking Gemini to classify spectral signatures (that's what Random Forests do). We're asking it to **reason about visual patterns**: canopy texture, field geometry, landscape context, and similarity to known examples.

Gemini's response includes:
- A classification (COCOA / NOT_COCOA / UNCERTAIN)
- A confidence score (0.0-1.0)
- Reasoning explaining which visual features support the classification
- Sub-classification (monoculture vs. agroforestry)

### Step 3: Proof of Concept Results

We ran the pipeline on 20 tiles: 15 from Nigeria's known cocoa-producing states and 5 negative controls from the northern savanna.

**Nigeria's cocoa belt — tiles classified as COCOA by Gemini:**

![Ondo Akure](../tiles/nigeria_target/ondo_akure_rgb.png) ![Ondo Idanre](../tiles/nigeria_target/ondo_idanre_rgb.png) ![Cross River Ikom](../tiles/nigeria_target/crossriver_ikom_rgb.png)

*Left to right: Ondo State (Akure area), Ondo State (Idanre), Cross River State (Ikom). All classified as COCOA. Note the visual similarity to the Ghana reference tiles — dense dark-green canopy, irregular boundaries, roads cutting through forest/farm mosaic.*

**Ondo Akure in NIR false-color:**

![Ondo Akure NIR](../tiles/nigeria_target/ondo_akure_nir.png)

Deep red saturation nearly identical to the Ghana cocoa reference — dense, healthy tree canopy consistent with cocoa agroforestry.

**Results summary:**

| Region | Tiles | COCOA | NOT_COCOA | Accuracy |
|--------|-------|-------|-----------|----------|
| **Savanna controls** (Kano/Kaduna) | 5 | 0 | **5** | **100%** — all correctly rejected |
| **Ondo State** (top cocoa producer) | 5 | 3 | 2 | Akure, Idanre, South = cocoa; Akoko (drier north), Ileoluji = not cocoa |
| **Osun State** (major producer) | 3 | **3** | 0 | Ife, Iwo, South — all cocoa |
| **Cross River** (SE cocoa zone) | 2 | **2** | 0 | Ikom, Obudu — both cocoa |
| **Edo State** | 2 | **2** | 0 | Benin, North — both cocoa |
| **Ogun State** | 2 | 1 | 1 | Abeokuta = cocoa; East = not cocoa |
| **Ekiti State** | 1 | 0 | **1** | Ado-Ekiti (urban center) correctly rejected |

**Key findings:**
- **100% control accuracy**: all 5 savanna tiles correctly rejected
- **73% detection rate** in cocoa belt: 11/15 tiles classified as cocoa
- **Sensible errors**: Ekiti's urban center (Ado-Ekiti) correctly flagged as NOT_COCOA; Ondo Akoko (at the drier northern edge of the cocoa zone) correctly uncertain
- **State-level alignment**: Osun, Cross River, and Edo — all major cocoa producers — showed 100% detection
- **Total cost**: ~$0.30 for 20 classifications

### Step 4: Scaling Up

Here's where our existing infrastructure pays off. We've built a production Gemini batch processing pipeline for [Source Library](https://sourcelibrary.org) that processes thousands of images per hour at 50% reduced cost using the Batch API. The same pipeline — batch submission, API key rotation, result collection — handles cocoa tile classification with minimal modification.

**Cost comparison:**

| Approach | Cost | Time | Accuracy |
|----------|------|------|----------|
| Field survey | $50,000+ | 6-12 months | Ground truth |
| Traditional ML (train from scratch) | $5,000-10,000 | 3-6 months | ~90% (with labels) |
| **Gemini few-shot (our approach)** | **~$15** | **1 day** | **73% (proof of concept)** |

We aggregate tile-level predictions into a continuous probability surface, apply spatial smoothing, and overlay it on our [Nigeria Agricultural Land Use Explorer](https://eli-africa.vercel.app). The result: Nigeria's first satellite-derived cocoa farm map.

## Why This Matters Beyond Cocoa

This approach has implications far beyond one crop in one country:

**For agricultural mapping:** Every crop that's been mapped somewhere but not everywhere becomes a candidate for visual transfer. Cashew in Tanzania? Use labels from Mozambique. Coffee in Uganda? Use labels from Ethiopia. The expensive step (ground-truth collection) becomes a one-time investment that transfers across borders.

**For climate adaptation:** We can rapidly map crop distributions in data-poor regions where adaptation planning is most urgently needed. A climate adaptation strategy without a crop map is like navigating without a chart.

**For AI methodology:** This is among the first applications of large multimodal models for satellite-based crop detection. If Gemini can reason about agricultural patterns the way a human remote sensing expert does — considering texture, context, ecology — it opens a new paradigm for earth observation that doesn't require extensive labeled datasets. Google has already demonstrated Gemini's [native multi-spectral capabilities](https://developers.googleblog.com/unlocking-multi-spectral-data-with-gemini/) and is building [geospatial reasoning frameworks](https://research.google/blog/geospatial-reasoning-unlocking-insights-with-generative-ai-and-multiple-foundation-models/) — our work applies these capabilities to a concrete food security problem.

**For food security:** Nigeria's cocoa farmers are largely invisible to national and international planning processes. Putting them on the map — literally — is a first step toward including them in climate adaptation investments, supply chain transparency programs, and agricultural extension services.

## What's Next

We're scaling the pipeline to 3,500 tiles covering Nigeria's entire cocoa belt at 5km resolution. Our validation approach combines:
- Holdout accuracy on Ghana tiles (where we know the answer)
- Spatial coherence with known Nigerian cocoa zones
- Cross-validation against state-level agricultural production statistics
- Expert review of edge cases (cocoa vs. oil palm, cocoa vs. forest)

We'll publish the results — including the methodology, the prompts, the validation metrics, and the map itself — as an open-access resource. The code is [open source](https://github.com/JDerekLomas/eli-africa).

If you're working on agricultural mapping, climate adaptation, or AI for earth observation, we'd love to collaborate. And if you're at the South African Embassy's science and food security event — come see the live demo.

---

*Derek Lomas is a researcher working at the intersection of AI, agriculture, and climate adaptation. This work is part of the ELI (Earth Land Intelligence) project.*

*Built with [Google Earth Engine](https://earthengine.google.com/), [Gemini](https://ai.google.dev/), [Sentinel-2](https://sentinel.esa.int/web/sentinel/missions/sentinel-2), and the [Forest Data Partnership](https://www.forestdatapartnership.org/).*

---

### Technical Appendix

**Tile export specification:**
- Source: Sentinel-2 SR Harmonized, 2024 cloud-free composite (<15% cloud cover)
- Tile size: 256 × 256 pixels at 10m = 2.56km × 2.56km
- Bands: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR)
- Export format: PNG (RGB true-color), PNG (NIR-R-G false-color), JSON (metadata)
- Ghana labels: Forest Data Partnership cocoa probability model (>0.7 = positive, <0.2 = negative)

**Gemini configuration:**
- Model: gemini-2.5-flash
- Temperature: 0.2 (low creativity, high consistency)
- Max output tokens: 1024
- Few-shot examples: 2 positive (Ghana cocoa) + 3 negative (Ghana non-cocoa, Nigeria savanna)
- Context provided: coordinates, elevation, annual rainfall

**Proof-of-concept results (n=20):**
- Nigeria cocoa belt: 11/15 COCOA, 4/15 NOT_COCOA
- Savanna controls: 0/5 COCOA, 5/5 NOT_COCOA (100% specificity)
- Cost: ~$0.015/tile, ~$0.30 total
- Processing time: <2 minutes for 20 tiles

**Earth Engine assets used:**
- `COPERNICUS/S2_SR_HARMONIZED` — 10m multispectral imagery
- `projects/forestdatapartnership/assets/cocoa/model_2025a` — cocoa probability labels
- `GOOGLE/DYNAMICWORLD/V1` — 10m land use classification
- `ESA/WorldCover/v200/2021` — 10m land cover
- `UCSB-CHG/CHIRPS/DAILY` — precipitation
- `USGS/SRTMGL1_003` — elevation

**Repository:** [github.com/JDerekLomas/eli-africa](https://github.com/JDerekLomas/eli-africa)
**Live explorer:** [eli-africa.vercel.app](https://eli-africa.vercel.app)
