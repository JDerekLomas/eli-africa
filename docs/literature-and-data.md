# Cocoa Detection from Satellite Imagery: Literature & Available Data

## Available Ground Truth Datasets

### 1. Kalischek et al. — 100,000+ cocoa farm polygons (Ghana/CDI)
- **Paper**: [Nature Food 2023](https://www.nature.com/articles/s43016-023-00751-8) — "Cocoa plantations are associated with deforestation"
- **Data**: Trained neural network on >100,000 geo-referenced cocoa farms
- **Resolution**: 10m (Sentinel-2)
- **Coverage**: Cote d'Ivoire, Ghana
- **Available**: Via [Forest Data Partnership in Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a)
- **Use for us**: Already using FDP probability map. Can sample confirmed cocoa locations at high confidence for ESRI high-res comparison.

### 2. West Africa Cocoa (WAC) Dataset — Company supply chain polygons
- **Source**: [WRI / Global Forest Watch](https://www.globalforestwatch.org/blog/data-and-tools/data-resources-ending-deforestation-cocoa-west-africa/)
- **Data**: Cocoa plot boundaries from 17 cocoa/chocolate companies (aggregated, anonymized)
- **Coverage**: CDI, Ghana (2021)
- **Download**: [GFW cocoa plot heat map](https://www.globalforestwatch.org/)
- **Use for us**: Heat map of cocoa density — can identify areas with high commercial cocoa concentration for validation.

### 3. Trase Spatial Metrics — Cocoa area by department (CDI)
- **Source**: [Trase.earth](https://trase.earth/open-data/datasets/spatial-metrics-ghana-cocoa-cocoa-area)
- **Data**: Cocoa area in hectares per department, derived from 10m Sentinel-2 maps
- **Coverage**: CDI (2019-2021), Ghana
- **Use for us**: Departmental-level validation — compare our AI classification rate against official cocoa area statistics.

### 4. Copernicus/PANGAEA Cocoa Map — Random Forest classification
- **Source**: [Africa Knowledge Platform](https://africa-knowledge-platform.ec.europa.eu/dataset/cocoa-map-cote-divoire-and-ghana)
- **Data**: 2019 cocoa distribution map, Random Forest classification
- **Coverage**: CDI, Ghana
- **Use for us**: Independent validation layer — compare Gemini classifications against this.

### 5. Reference polygons (3,311) — Multi-class land use
- **Paper**: [MDPI Remote Sensing 2024](https://www.mdpi.com/2072-4292/16/3/598) — "Critical Assessment of Cocoa Classification with Limited Reference Data"
- **Data**: 3,311 polygons (cocoa, rubber, shrubland, closed forest) across Ghana and CDI
- **Based on**: 19,196 points including 3,842 cocoa field points (Ghana) + 973 from Cocoa Life
- **Use for us**: Multi-class validation — tests whether we can distinguish cocoa from rubber, forest, shrubland.

### 6. ETH Zurich / Bonet thesis — Deep learning segmentation
- **Source**: [ETH thesis](https://ethz.ch/content/dam/ethz/special-interest/baug/igp/photogrammetry-remote-sensing-dam/documents/pdf/Student_Theses/BA_BonetFilella.pdf)
- **Data**: Cocoa segmentation training data for deep learning
- **Use for us**: Methodology reference — how they structured training data.

### No publicly available cocoa ground truth for Nigeria exists.

---

## Literature: Methods That Work

### Best performing approaches (ranked by published accuracy)

| Method | Data | Accuracy | Paper |
|--------|------|----------|-------|
| CNN + deep learning | Sentinel-2 + 100k farm polygons | ~90% | [Kalischek 2023, Nature Food](https://www.nature.com/articles/s43016-023-00751-8) |
| Random Forest + Sentinel-1 + Sentinel-2 | Combined optical + radar | 97% overall | [MDPI 2024](https://www.mdpi.com/2072-4292/16/3/598) |
| KNN + UAV imagery | Very high res drone images | 99% | [Referenced in MDPI review](https://www.mdpi.com/2072-4292/16/3/598) |
| Random Forest + texture | Sentinel-2 + texture features | ~85% | [Agroforestry Systems 2022](https://link.springer.com/article/10.1007/s10457-022-00791-2) |

### Key findings from the literature

1. **Spectral signatures alone are insufficient** — cocoa and forest have nearly identical spectral properties. Texture and spatial features are essential.

2. **Radar (SAR) dramatically improves accuracy** — Sentinel-1 C-band SAR detects canopy structure and moisture differences invisible in optical imagery. The best method ([97% accuracy](https://www.mdpi.com/2072-4292/16/3/598)) uses combined optical + radar.

3. **Temporal features help** — Multi-date composites capture phenological differences (cocoa harvest season, leaf flush) that single-date images miss.

4. **Oil palm is the main confusion class** — At Sentinel-2 resolution (10m), oil palm and cocoa are frequently confused. At VHR (<1m), crown morphology (star-shaped vs. lumpy) distinguishes them — consistent with our Gemini findings.

5. **Limited training data is a real problem** — The [MDPI 2024 paper](https://www.mdpi.com/2072-4292/16/3/598) specifically studies cocoa classification with limited reference data. Most of West Africa lacks ground truth.

6. **Deep learning outperforms traditional ML at scale** — But requires more training data. Random Forest is preferred when data is limited.

7. **No published work uses LLMs/VLMs for cocoa detection** — Our approach (Gemini vision with expert context) is novel. The closest is [GPT-4V benchmarked on Earth Observation](https://openaccess.thecvf.com/content/CVPR2024W/EarthVision/papers/Zhang_Good_at_Captioning_Bad_at_Counting_Benchmarking_GPT-4V_on_Earth_CVPRW_2024_paper.pdf) which found VLMs good at captioning but poor at counting/spatial reasoning.

### What our approach adds

- **No training data required** — Gemini uses visual reasoning, not statistical classification
- **Explainable** — Gemini explains WHY it classifies something, not just what class
- **Sub-meter crown morphology** — At 0.6m ESRI, we can distinguish oil palm from cocoa by crown shape — something 10m Sentinel-2 cannot do
- **Cross-border transfer** — No Nigeria-specific training data needed
- **Limitations**: Unvalidated at scale, high per-tile API cost vs traditional ML, dependent on ESRI imagery availability and quality

---

## Recommended Next Steps

1. **Download WAC heat map from GFW** — overlay on our map to identify high-confidence cocoa areas in Ghana for more ESRI validation tiles
2. **Sample FDP probability map** — get 50+ coordinates where cocoa probability >0.9, fetch ESRI tiles, run Gemini to build a proper confusion matrix
3. **Add non-cocoa tree crop references** — need ESRI tiles of known rubber, citrus, teak plantations in same region for negative examples
4. **Test Sentinel-1 radar** — available in Earth Engine, could add SAR texture as context for Gemini
5. **Contact CRIN (Cocoa Research Institute of Nigeria)** — they likely have farm GPS coordinates
6. **Contact Mighty Earth** — their [Cocoa Accountability](https://mightyearth.org/cocoa-accountability/) project may have Nigerian cocoa supply chain data
