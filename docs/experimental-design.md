# Experimental Design: Cocoa Farm Detection in Nigeria Using Gemini Vision and Satellite Imagery

## Research Question

Can a large multimodal model (Gemini 3.1) trained on zero-shot visual examples from labeled cocoa regions (Ghana, Cote d'Ivoire) accurately identify cocoa farms in Nigeria, where no ground-truth cocoa maps currently exist?

## Background

Nigeria is the world's 4th largest cocoa producer (~350,000 tonnes/year), yet no high-resolution cocoa map exists for the country. The Forest Data Partnership's 10m cocoa probability model covers Ghana and Cote d'Ivoire but excludes Nigeria. This gap limits climate adaptation planning, supply chain transparency, and agricultural policy for ~600,000 Nigerian cocoa farming households.

Prior work has used Random Forest classifiers and CNNs on Sentinel-2 imagery to map cocoa in Ghana/Cote d'Ivoire at ~90% accuracy. However, these models require extensive labeled training data in the target region. We propose using Gemini 3.1's visual reasoning capabilities to perform cross-border transfer without Nigeria-specific training data.

## Hypothesis

Gemini 3.1, when provided with labeled Sentinel-2 image tiles from Ghana's cocoa regions as few-shot examples, can classify Nigerian satellite tiles as cocoa/not-cocoa with >75% accuracy, as validated against known cocoa-growing areas and agricultural census data.

## Study Area

### Training/Reference Region
- **Ghana cocoa belt**: Ashanti, Western, Eastern regions
- **Cote d'Ivoire**: existing FDP coverage area
- Labels: Forest Data Partnership cocoa probability map (>0.7 = positive, <0.2 = negative)

### Target Region (Nigeria)
- **Primary**: Ondo, Osun, Ogun, Ekiti states (southwestern cocoa belt)
- **Secondary**: Cross River, Edo, Abia states (southeastern cocoa zone)
- **Negative control**: Kano, Borno (savanna, no cocoa)

## Data Sources

| Dataset | Resolution | Purpose | Source |
|---------|-----------|---------|--------|
| Sentinel-2 SR | 10m, 13 bands | Primary imagery | `COPERNICUS/S2_SR_HARMONIZED` |
| FDP Cocoa Model | 10m | Training labels (Ghana/CI) | `projects/forestdatapartnership/assets/cocoa/model_2025a` |
| ESA WorldCover | 10m | Land cover context | `ESA/WorldCover/v200/2021` |
| CHIRPS Rainfall | 5km | Climate similarity validation | `UCSB-CHG/CHIRPS/DAILY` |
| SRTM Elevation | 30m | Terrain context | `USGS/SRTMGL1_003` |
| Dynamic World | 10m | Land use classification | `GOOGLE/DYNAMICWORLD/V1` |

## Methodology

### Phase 1: Tile Export (Earth Engine)

Export 256x256 pixel tiles (2.56km x 2.56km at 10m) as RGB + NIR composites:

**Ghana reference set:**
- 500 tiles from confirmed cocoa areas (FDP probability > 0.7)
- 500 tiles from non-cocoa areas (FDP probability < 0.2, same climate zone)
- Stratified by: pure cocoa, cocoa-agroforestry, forest (non-cocoa), cropland (non-cocoa)

**Nigeria target set:**
- 2,000 tiles from candidate cocoa zones (Ondo, Osun, Cross River)
- 500 tiles from known non-cocoa zones (Kano, savanna regions)
- Grid sampling at 5km intervals within study area

**Export format:** RGB true-color PNG + false-color (NIR-R-G) PNG per tile, with metadata JSON (coordinates, elevation, rainfall, Dynamic World classification).

### Phase 2: Gemini Classification

**Model:** Gemini 3.1 Flash (batch API, 50% cost reduction)

**Prompt design (few-shot with chain-of-thought):**

```
You are an agricultural remote sensing expert analyzing satellite imagery
to identify cocoa farms in West Africa.

Cocoa farms in satellite imagery typically show:
- Dense, dark green canopy (evergreen tree crop)
- Irregular field boundaries (unlike geometric grain fields)
- Mixed with shade trees (agroforestry pattern)
- Located in humid/sub-humid zones with 1200-3000mm annual rainfall
- Often on gentle slopes below 600m elevation
- Distinct from oil palm (more uniform, lighter green, regular spacing)
- Distinct from natural forest (more heterogeneous canopy, visible paths)

Here are reference examples from confirmed cocoa areas in Ghana:
[4-6 positive example tiles]

Here are non-cocoa examples from the same climate zone:
[4-6 negative example tiles — forest, other crops, urban]

Now analyze this tile from Nigeria:
[target tile - RGB]
[target tile - false color NIR-R-G]

Location: {lat}, {lng}
Elevation: {elevation}m
Annual rainfall: {rainfall}mm
Dynamic World classification: {dw_class}

Respond with:
1. **Classification**: COCOA / NOT_COCOA / UNCERTAIN
2. **Confidence**: 0.0-1.0
3. **Reasoning**: What visual features support your classification?
4. **Sub-type**: If cocoa, is it monoculture or agroforestry?
5. **Alternative**: If not cocoa, what crop/land use do you think this is?
```

**Batch configuration:**
- Batch size: 250 tiles per batch (matching existing pipeline)
- Estimated cost: ~$0.005/tile at batch pricing = ~$12.50 for 2,500 tiles
- Processing time: ~2 hours with batch API
- API key rotation using existing 3-key setup

### Phase 3: Validation

**Internal validation (Ghana):**
- Hold out 200 Ghana tiles (100 cocoa, 100 non-cocoa) not shown as examples
- Measure accuracy, precision, recall, F1 against FDP labels
- This gives us a floor for expected performance

**Nigeria validation (indirect):**
- Compare Gemini cocoa predictions against:
  1. Nigerian cocoa production statistics by state (FAOSTAT, NBS)
  2. Known cocoa LGA boundaries from agricultural extension data
  3. Climate suitability from CropSuite model
  4. WorldCover tree crop areas in known cocoa zones
- Spatial coherence: do predictions form contiguous zones matching known cocoa belt?

**Nigeria validation (direct, future):**
- Partner with Nigerian agricultural institutions for ground-truth sampling
- Use Google Street View / Mapillary imagery where available
- Crowdsourced validation via a simple web tool

### Phase 4: Map Generation

- Aggregate tile-level predictions into a continuous probability surface
- Apply spatial smoothing (Gaussian kernel, sigma = 1 tile)
- Threshold at confidence > 0.6 for "likely cocoa"
- Upload as Earth Engine asset for integration into the map explorer
- Compare with existing cocoa suitability estimate

## Experimental Controls

| Control | Purpose |
|---------|---------|
| Ghana holdout set | Measure baseline Gemini accuracy on known labels |
| Kano/savanna tiles | Verify model correctly rejects arid non-cocoa zones |
| Oil palm comparison | Test ability to distinguish cocoa from visually similar tree crop |
| Prompt ablation | Test with/without context info (elevation, rainfall, DW class) |
| Band ablation | Test RGB-only vs. RGB+NIR vs. full multispectral |
| Zero-shot vs. few-shot | Compare performance with 0, 2, 4, 8 reference examples |

## Expected Outcomes

1. **Accuracy metrics** on Ghana holdout: target >85% F1
2. **Nigeria cocoa probability map** at 2.56km resolution (upgradeable)
3. **Methodology validation**: does Gemini transfer learning work for crop detection?
4. **Error analysis**: where does the model fail? (shade-grown vs. forest boundary cases)
5. **Cost analysis**: total pipeline cost vs. traditional approaches

## Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Tile export | 1 day | ~3,500 tiles exported to cloud storage |
| Prompt engineering | 1 day | Optimized prompt with reference examples |
| Batch classification | 1 day | All tiles classified with confidence scores |
| Validation & analysis | 2 days | Accuracy metrics, error analysis |
| Map generation | 1 day | Nigeria cocoa probability layer |
| **Total** | **~6 days** | **Published map + methodology paper** |

## Ethical Considerations

- Cocoa farm mapping could be used for supply chain surveillance — frame as supporting farmers, not monitoring them
- Data should be open and benefit Nigerian cocoa farming communities
- Partner with Nigerian institutions (CRIN, NCDC) rather than extracting data
- Acknowledge limitations of satellite-only detection (no ground verification)

## References

- Forest Data Partnership cocoa model: [EE Catalog](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a)
- Kalischek et al. (2023). "Cocoa plantations are associated with deforestation." [Nature Food](https://www.nature.com/articles/s43016-023-00751-8)
- Critical assessment of cocoa classification with limited reference data. [Remote Sensing 2024](https://www.mdpi.com/2072-4292/16/3/598)
- Google: "Unlocking Multi-Spectral Data with Gemini." [Developers Blog](https://developers.googleblog.com/unlocking-multi-spectral-data-with-gemini/)
- Google: "Geospatial Reasoning with Foundation Models." [Research Blog](https://research.google/blog/geospatial-reasoning-unlocking-insights-with-generative-ai-and-multiple-foundation-models/)
