"""
Replicate cocoa classification using Random Forest on Sentinel-2.

Based on methodology from:
- "Critical Assessment of Cocoa Classification with Limited Reference Data"
  (Remote Sensing 2024, doi:10.3390/rs16030598)
- 85.1% overall accuracy using Sentinel-2 + NDVI + GLCM + Random Forest

Our replication:
1. Sentinel-2 composite (12 bands) for 2024
2. Vegetation indices: NDVI, EVI, SAVI, NDWI
3. GLCM texture features from NIR band
4. Training labels from FDP cocoa probability map (Ghana)
5. Random Forest classifier in Earth Engine
6. Apply to Nigeria cocoa belt
"""

import ee
import json
from pathlib import Path

credentials = ee.ServiceAccountCredentials(
    'earthengine@eli-africa-494008.iam.gserviceaccount.com',
    'sa-key.json'
)
ee.Initialize(credentials, project='gen-lang-client-0278315411')
print("Connected to Earth Engine")

# --- Study area ---
# Ghana training area (where FDP labels exist)
ghana_cocoa_belt = ee.Geometry.Rectangle([-3.5, 5.0, 0.5, 8.0])

# Nigeria target area
nigeria_cocoa_belt = ee.Geometry.Rectangle([3.5, 6.5, 9.5, 8.5])

# --- Sentinel-2 composite ---
print("Building Sentinel-2 composite...")
s2 = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2024-01-01", "2024-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    .select([
        "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12",
    ])
    .median()
)

# --- Vegetation indices ---
print("Computing vegetation indices...")
ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
evi = s2.expression(
    "2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))",
    {"NIR": s2.select("B8"), "RED": s2.select("B4"), "BLUE": s2.select("B2")}
).rename("EVI")
savi = s2.expression(
    "((NIR - RED) / (NIR + RED + 0.5)) * 1.5",
    {"NIR": s2.select("B8"), "RED": s2.select("B4")}
).rename("SAVI")
ndwi = s2.normalizedDifference(["B3", "B8"]).rename("NDWI")

# --- GLCM texture features from NIR band ---
print("Computing GLCM texture...")
# Convert NIR to integer for GLCM
nir_int = s2.select("B8").multiply(10).toInt()
glcm = nir_int.glcmTexture(size=3)
# Select key texture metrics
texture = glcm.select([
    "B8_asm",       # Angular Second Moment (homogeneity)
    "B8_contrast",  # Contrast
    "B8_corr",      # Correlation
    "B8_ent",       # Entropy
    "B8_idm",       # Inverse Difference Moment
    "B8_savg",      # Sum Average
    "B8_var",       # Variance
])

# --- Combine all features ---
features = s2.addBands(ndvi).addBands(evi).addBands(savi).addBands(ndwi).addBands(texture)
print(f"Feature stack: {features.bandNames().getInfo()}")

# --- Training labels from FDP ---
print("Loading FDP cocoa probability labels...")
cocoa_prob = ee.ImageCollection(
    "projects/forestdatapartnership/assets/cocoa/model_2025a"
).mosaic()

# Create binary labels: cocoa (prob > 0.7) vs non-cocoa (prob < 0.2)
cocoa_label = cocoa_prob.gt(0.7).rename("label")  # 1 = cocoa
nococoa_label = cocoa_prob.lt(0.2).rename("label")  # stays 0

# Also add WorldCover for non-cocoa classes
worldcover = ee.Image("ESA/WorldCover/v200/2021")
# Non-cocoa classes: cropland (40), built-up (50), grassland (30), water (80)
cropland_label = worldcover.eq(40).And(cocoa_prob.lt(0.2)).rename("label")

# --- Sample training points ---
print("Sampling training data from Ghana...")

# Sample cocoa points
cocoa_training = features.addBands(ee.Image.constant(1).rename("label")).sample(
    region=ghana_cocoa_belt,
    scale=10,
    numPixels=5000,
    seed=42,
    geometries=True,
).filter(ee.Filter.notNull(features.bandNames().getInfo()))

# Need to filter to actual cocoa areas
cocoa_mask = cocoa_prob.gt(0.7)
# Use a smaller region for faster sampling
ghana_sample_region = ee.Geometry.Rectangle([-2.5, 6.0, -1.0, 7.5])  # Ashanti/Western

# Sample from cocoa areas (label=1)
cocoa_labeled = features.addBands(cocoa_mask.rename("label"))
cocoa_samples = cocoa_labeled.updateMask(cocoa_mask).sample(
    region=ghana_sample_region,
    scale=100,
    numPixels=1000,
    seed=42,
    tileScale=4,
)

# Sample from non-cocoa areas (label=0)
nococoa_mask = cocoa_prob.lt(0.2)
nococoa_labeled = features.addBands(ee.Image.constant(0).rename("label"))
nococoa_samples = nococoa_labeled.updateMask(nococoa_mask).sample(
    region=ghana_sample_region,
    scale=100,
    numPixels=1000,
    seed=43,
    tileScale=4,
)

# Merge
training_data = cocoa_samples.merge(nococoa_samples)
print(f"Training samples: {training_data.size().getInfo()}")

# --- Train Random Forest ---
print("Training Random Forest classifier...")
band_names = features.bandNames().getInfo()

classifier = ee.Classifier.smileRandomForest(
    numberOfTrees=100,
).train(
    features=training_data,
    classProperty="label",
    inputProperties=band_names,
)

# --- Classify Ghana (validation) ---
print("Classifying Ghana (validation)...")
ghana_classified = features.clip(ghana_cocoa_belt).classify(classifier)

# --- Validate ---
print("Computing accuracy on Ghana holdout...")
# Split training data 70/30
training_data = training_data.randomColumn("random", seed=44)
train_split = training_data.filter(ee.Filter.lt("random", 0.7))
test_split = training_data.filter(ee.Filter.gte("random", 0.7))

# Retrain on 70%
classifier_val = ee.Classifier.smileRandomForest(
    numberOfTrees=100,
).train(
    features=train_split,
    classProperty="label",
    inputProperties=band_names,
)

# Validate on 30%
validated = test_split.classify(classifier_val)
confusion = validated.errorMatrix("label", "classification")

print("\n=== VALIDATION RESULTS ===")
print(f"Confusion matrix: {confusion.array().getInfo()}")
print(f"Overall accuracy: {confusion.accuracy().getInfo():.4f}")
print(f"Kappa: {confusion.kappa().getInfo():.4f}")
print(f"Producer's accuracy: {confusion.producersAccuracy().getInfo()}")
print(f"Consumer's accuracy: {confusion.consumersAccuracy().getInfo()}")

# --- Feature importance ---
print("\nFeature importance:")
importance = classifier.explain().get("importance").getInfo()
sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
for feat, imp in sorted_imp[:10]:
    print(f"  {feat:20s}: {imp:.2f}")

# --- Classify Nigeria ---
print("\nClassifying Nigeria cocoa belt...")
nigeria_classified = features.clip(nigeria_cocoa_belt).classify(classifier)

# Get cocoa area in Nigeria
nigeria_cocoa_area = nigeria_classified.eq(1).multiply(ee.Image.pixelArea()).divide(1e6)  # km2
# Skip area calculation (too large for interactive compute)
# Instead just get tile URLs for visualization

print("\nGenerating tile URLs...")
vis_params = {"min": 0, "max": 1, "palette": ["#00000000", "#8B4513"]}

# Use getMapId with callback (JS API style)
nigeria_map = nigeria_classified.getMapId(vis_params)
print(f"Nigeria cocoa map: {nigeria_map['tile_fetcher'].url_format}")

ghana_map = ghana_classified.getMapId(vis_params)
print(f"Ghana cocoa map: {ghana_map['tile_fetcher'].url_format}")

print("\nDone!")
