# Mapping Nigeria's Invisible Cocoa Farms with AI and Satellite Imagery

*Using Gemini 3.1 and Sentinel-2 to extend cocoa detection from Ghana to Nigeria — where no ground-truth map exists.*

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
4. **A multimodal AI model** (Gemini 3.1) that can reason about visual patterns in satellite imagery

## The Approach: Cross-Border Visual Transfer with Gemini

Instead of training a new model from scratch, we're asking a fundamentally different question: *Can an AI that has seen cocoa farms in Ghana recognize them in Nigeria?*

This is a visual transfer learning problem, and it's exactly the kind of task that large multimodal models excel at. Here's how it works:

### Step 1: Export Reference Tiles from Ghana

Using Google Earth Engine, we export 256×256 pixel tiles (each covering ~2.56km × 2.56km) from Ghana's cocoa regions. We use the FDP model to select tiles that are confirmed cocoa (probability > 0.7) and confirmed non-cocoa (probability < 0.2).

Each tile includes:
- **True-color RGB** — what the landscape looks like from space
- **False-color NIR-R-G** — highlights vegetation health and structure
- **Metadata** — coordinates, elevation, annual rainfall, land use classification

![Example: Ghana cocoa tile showing dense dark-green canopy with irregular boundaries, compared to a geometric grain field and uniform oil palm plantation](placeholder-ghana-tiles.png)

*What cocoa looks like from space: dense, dark-green canopy with irregular field boundaries. Compare with the geometric patterns of grain fields (center) or the uniform rows of oil palm plantations (right).*

### Step 2: Few-Shot Classification with Gemini

We feed Gemini 3.1 a carefully structured prompt:

> "Here are examples of cocoa farms in Ghana's satellite imagery. Here are examples of non-cocoa areas in the same climate zone. Now look at this tile from Nigeria and tell me: is this cocoa?"

The key insight is that we're not asking Gemini to classify spectral signatures (that's what Random Forests do). We're asking it to **reason about visual patterns**: canopy texture, field geometry, landscape context, and similarity to known examples.

Gemini's response includes:
- A classification (COCOA / NOT_COCOA / UNCERTAIN)
- A confidence score (0.0-1.0)
- Reasoning ("Dense evergreen canopy with irregular boundaries consistent with agroforestry cocoa, surrounded by degraded forest typical of cocoa frontier zones")
- Sub-classification (monoculture vs. agroforestry)

### Step 3: Batch Processing at Scale

Here's where our existing infrastructure pays off. We've built a production Gemini batch processing pipeline for [Source Library](https://sourcelibrary.org) that processes thousands of images per hour at 50% reduced cost using the Batch API. The same pipeline — batch submission, API key rotation, result collection — handles cocoa tile classification with minimal modification.

**Cost comparison:**

| Approach | Cost | Time | Accuracy |
|----------|------|------|----------|
| Field survey | $50,000+ | 6-12 months | Ground truth |
| Traditional ML (train from scratch) | $5,000-10,000 | 3-6 months | ~90% (with labels) |
| **Gemini few-shot (our approach)** | **~$15** | **1 day** | **TBD (target >75%)** |

The cost of the AI classification step is almost negligible. The real investment is in the experimental design, validation, and domain expertise to interpret results correctly.

### Step 4: Generate the Map

We aggregate tile-level predictions into a continuous probability surface, apply spatial smoothing, and overlay it on our [Nigeria Agricultural Land Use Explorer](https://eli-africa.vercel.app). The result: Nigeria's first satellite-derived cocoa farm map.

## Why This Matters Beyond Cocoa

If this approach works — and the early results are promising — it has implications far beyond one crop in one country:

**For agricultural mapping:** Every crop that's been mapped somewhere but not everywhere becomes a candidate for visual transfer. Cashew in Tanzania? Use labels from Mozambique. Coffee in Uganda? Use labels from Ethiopia. The expensive step (ground-truth collection) becomes a one-time investment that transfers across borders.

**For climate adaptation:** We can rapidly map crop distributions in data-poor regions where adaptation planning is most urgently needed. A climate adaptation strategy without a crop map is like navigating without a chart.

**For AI methodology:** This is among the first applications of large multimodal models for satellite-based crop detection. If Gemini can reason about agricultural patterns the way a human remote sensing expert does — considering texture, context, ecology — it opens a new paradigm for earth observation that doesn't require extensive labeled datasets.

**For food security:** Nigeria's cocoa farmers are largely invisible to national and international planning processes. Putting them on the map — literally — is a first step toward including them in climate adaptation investments, supply chain transparency programs, and agricultural extension services.

## What's Next

We're currently running the full pipeline across Nigeria's cocoa belt. Our validation approach combines:
- Holdout accuracy on Ghana tiles (where we know the answer)
- Spatial coherence with known Nigerian cocoa zones
- Cross-validation against agricultural production statistics
- Expert review of edge cases (cocoa vs. oil palm, cocoa vs. forest)

We'll publish the results — including the methodology, the prompts, the validation metrics, and the map itself — as an open-access resource. The code is [open source](https://github.com/JDerekLomas/eli-africa).

If you're working on agricultural mapping, climate adaptation, or AI for earth observation, we'd love to hear from you. And if you're presenting at the South African Embassy's food security and climate adaptation event — come see the live demo.

---

*Derek Lomas is a researcher working at the intersection of AI, agriculture, and climate adaptation. This work is part of the ELI (Earth Land Intelligence) project.*

*Built with Google Earth Engine, Gemini 3.1, Sentinel-2, and the Forest Data Partnership.*

---

### Technical Appendix

**Tile export specification:**
- Source: Sentinel-2 SR Harmonized, 2024 cloud-free composite
- Tile size: 256 × 256 pixels at 10m = 2.56km × 2.56km
- Bands: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR)
- Export format: PNG (RGB), PNG (NIR-R-G), JSON (metadata)

**Gemini configuration:**
- Model: gemini-3-flash-preview (Batch API)
- Temperature: 0.2 (low creativity, high consistency)
- Max output tokens: 500
- Few-shot examples: 4 positive + 4 negative per request

**Validation metrics:**
- Ghana holdout: Accuracy, Precision, Recall, F1, AUC-ROC
- Nigeria: Spatial correlation with production statistics (Pearson r)
- Error analysis: Confusion matrix by land use type

**Earth Engine assets used:**
- `COPERNICUS/S2_SR_HARMONIZED`
- `projects/forestdatapartnership/assets/cocoa/model_2025a`
- `GOOGLE/DYNAMICWORLD/V1`
- `ESA/WorldCover/v200/2021`
- `UCSB-CHG/CHIRPS/DAILY`
- `USGS/SRTMGL1_003`
