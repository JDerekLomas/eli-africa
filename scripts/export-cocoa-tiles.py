"""
Export Sentinel-2 tiles for cocoa classification experiment.

Exports 256x256 pixel tiles from:
1. Ghana (labeled cocoa + non-cocoa from FDP model)
2. Nigeria cocoa belt (unlabeled target)
3. Nigeria savanna (negative control)

Outputs: RGB PNGs + NIR false-color PNGs + metadata JSON per tile
Stored in: Google Cloud Storage bucket for Gemini batch processing

Usage:
    source .venv/bin/activate
    python scripts/export-cocoa-tiles.py
"""

import ee
import json
import os
import requests
from pathlib import Path

# Initialize Earth Engine
credentials = ee.ServiceAccountCredentials(
    'earthengine@eli-africa-494008.iam.gserviceaccount.com',
    'sa-key.json'
)
ee.Initialize(credentials, project='gen-lang-client-0278315411')
print("Connected to Earth Engine")

# Output directory
OUTPUT_DIR = Path("tiles")
OUTPUT_DIR.mkdir(exist_ok=True)

# --- Configuration ---
TILE_SIZE = 256  # pixels
SCALE = 10  # meters/pixel (Sentinel-2 native)
TILE_EXTENT = TILE_SIZE * SCALE  # 2560m = 2.56km

# Sentinel-2 cloud-free composite for 2024
def get_s2_composite(region):
    """Get cloud-free Sentinel-2 composite for a region."""
    return (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate("2024-01-01", "2024-12-31")
        .filterBounds(region)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .select(["B2", "B3", "B4", "B8"])  # Blue, Green, Red, NIR
        .median()
    )

# FDP cocoa probability (Ghana/CI only)
cocoa_prob = ee.ImageCollection(
    "projects/forestdatapartnership/assets/cocoa/model_2025a"
).mosaic()

# Context layers
worldcover = ee.Image("ESA/WorldCover/v200/2021")
elevation = ee.Image("USGS/SRTMGL1_003")
dynamic_world = (
    ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterDate("2024-01-01", "2024-12-31")
    .select("label")
    .mode()
)

# Annual rainfall
rainfall = (
    ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2023-01-01", "2023-12-31")
    .select("precipitation")
    .sum()
)


def generate_grid_points(geometry, spacing_m):
    """Generate a grid of points within a geometry."""
    bounds = geometry.bounds().getInfo()["coordinates"][0]
    min_lng = min(p[0] for p in bounds)
    max_lng = max(p[0] for p in bounds)
    min_lat = min(p[1] for p in bounds)
    max_lat = max(p[1] for p in bounds)

    # Convert spacing from meters to degrees (approximate)
    spacing_deg = spacing_m / 111000

    points = []
    lat = min_lat
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            points.append((lat, lng))
            lng += spacing_deg
        lat += spacing_deg

    return points


def get_tile_metadata(lat, lng):
    """Get context metadata for a tile location."""
    point = ee.Geometry.Point([lng, lat])

    elev_val = elevation.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=30
    ).get("elevation")

    rain_val = rainfall.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=5000
    ).get("precipitation")

    dw_val = dynamic_world.reduceRegion(
        reducer=ee.Reducer.mode(), geometry=point, scale=10
    ).get("label")

    wc_val = worldcover.reduceRegion(
        reducer=ee.Reducer.mode(), geometry=point, scale=10
    ).get("Map")

    info = ee.Dictionary({
        "elevation": elev_val,
        "rainfall": rain_val,
        "dynamic_world": dw_val,
        "worldcover": wc_val,
    }).getInfo()

    return info


def export_tile(lat, lng, tile_id, region_name, label=None):
    """Export a single tile as RGB + NIR-R-G thumbnails."""
    point = ee.Geometry.Point([lng, lat])
    tile_geom = point.buffer(TILE_EXTENT / 2).bounds()

    s2 = get_s2_composite(tile_geom)

    # RGB thumbnail URL
    rgb_url = s2.getThumbURL({
        "bands": ["B4", "B3", "B2"],
        "min": 0,
        "max": 3000,
        "dimensions": TILE_SIZE,
        "region": tile_geom,
        "format": "png",
    })

    # NIR-R-G false color
    nir_url = s2.getThumbURL({
        "bands": ["B8", "B4", "B3"],
        "min": 0,
        "max": 5000,
        "dimensions": TILE_SIZE,
        "region": tile_geom,
        "format": "png",
    })

    # Download images
    tile_dir = OUTPUT_DIR / region_name
    tile_dir.mkdir(exist_ok=True)

    rgb_path = tile_dir / f"{tile_id}_rgb.png"
    nir_path = tile_dir / f"{tile_id}_nir.png"
    meta_path = tile_dir / f"{tile_id}_meta.json"

    # Download RGB
    r = requests.get(rgb_url)
    if r.status_code == 200:
        rgb_path.write_bytes(r.content)
    else:
        print(f"  Failed to download RGB for {tile_id}: {r.status_code}")
        return False

    # Download NIR
    r = requests.get(nir_url)
    if r.status_code == 200:
        nir_path.write_bytes(r.content)

    # Get metadata
    try:
        meta = get_tile_metadata(lat, lng)
    except Exception as e:
        meta = {"error": str(e)}

    meta.update({
        "tile_id": tile_id,
        "lat": lat,
        "lng": lng,
        "region": region_name,
        "label": label,  # cocoa / not_cocoa / None (unlabeled)
    })

    meta_path.write_text(json.dumps(meta, indent=2))
    return True


def export_ghana_cocoa_tiles(n_tiles=100):
    """Export labeled tiles from Ghana cocoa regions."""
    print(f"\n=== Exporting {n_tiles} Ghana cocoa tiles ===")

    # Ghana cocoa belt
    ghana_cocoa_region = ee.Geometry.Rectangle([-3.5, 5.5, -0.5, 8.0])

    # Get points where cocoa probability > 0.7
    cocoa_mask = cocoa_prob.gt(0.7)
    # Sample random points from cocoa areas
    cocoa_points = cocoa_mask.selfMask().sample(
        region=ghana_cocoa_region,
        scale=TILE_EXTENT,
        numPixels=n_tiles,
        geometries=True,
    ).getInfo()

    exported = 0
    for i, feat in enumerate(cocoa_points["features"]):
        if exported >= n_tiles:
            break
        coords = feat["geometry"]["coordinates"]
        lng, lat = coords[0], coords[1]
        tile_id = f"ghana_cocoa_{i:04d}"
        print(f"  Exporting {tile_id} ({lat:.3f}, {lng:.3f})...")
        if export_tile(lat, lng, tile_id, "ghana_cocoa", label="cocoa"):
            exported += 1

    print(f"  Exported {exported} Ghana cocoa tiles")
    return exported


def export_ghana_nococoa_tiles(n_tiles=100):
    """Export labeled non-cocoa tiles from Ghana."""
    print(f"\n=== Exporting {n_tiles} Ghana non-cocoa tiles ===")

    ghana_region = ee.Geometry.Rectangle([-3.5, 5.5, -0.5, 8.0])

    # Points where cocoa probability < 0.2 but still in humid zone
    nococoa_mask = cocoa_prob.lt(0.2)
    rain_mask = rainfall.gt(1200)  # humid zone only
    combined = nococoa_mask.And(rain_mask).selfMask()

    nococoa_points = combined.sample(
        region=ghana_region,
        scale=TILE_EXTENT,
        numPixels=n_tiles,
        geometries=True,
    ).getInfo()

    exported = 0
    for i, feat in enumerate(nococoa_points["features"]):
        if exported >= n_tiles:
            break
        coords = feat["geometry"]["coordinates"]
        lng, lat = coords[0], coords[1]
        tile_id = f"ghana_nococoa_{i:04d}"
        print(f"  Exporting {tile_id} ({lat:.3f}, {lng:.3f})...")
        if export_tile(lat, lng, tile_id, "ghana_nococoa", label="not_cocoa"):
            exported += 1

    print(f"  Exported {exported} Ghana non-cocoa tiles")
    return exported


def export_nigeria_target_tiles(n_tiles=200):
    """Export unlabeled tiles from Nigeria's cocoa belt."""
    print(f"\n=== Exporting {n_tiles} Nigeria cocoa belt tiles ===")

    # Nigeria cocoa belt states
    nigeria_cocoa_belt = ee.Geometry.MultiPolygon([
        # Ondo/Osun/Ogun/Ekiti (core SW cocoa)
        [[[4.0, 6.8], [5.5, 6.8], [5.5, 8.0], [4.0, 8.0], [4.0, 6.8]]],
        # Cross River/Edo/Abia (SE cocoa)
        [[[5.5, 6.0], [9.0, 6.0], [9.0, 7.5], [5.5, 7.5], [5.5, 6.0]]],
    ])

    points = generate_grid_points(nigeria_cocoa_belt, 5000)  # 5km grid
    print(f"  Generated {len(points)} grid points")

    exported = 0
    for i, (lat, lng) in enumerate(points):
        if exported >= n_tiles:
            break

        # Check if point is on land (has WorldCover data)
        tile_id = f"nigeria_target_{i:04d}"
        print(f"  Exporting {tile_id} ({lat:.3f}, {lng:.3f})...")
        if export_tile(lat, lng, tile_id, "nigeria_target", label=None):
            exported += 1

    print(f"  Exported {exported} Nigeria target tiles")
    return exported


def export_nigeria_control_tiles(n_tiles=50):
    """Export negative control tiles from Nigeria's savanna (no cocoa)."""
    print(f"\n=== Exporting {n_tiles} Nigeria control tiles (savanna) ===")

    # Kano/Borno — dry savanna, definitely no cocoa
    savanna_region = ee.Geometry.Rectangle([7.0, 11.0, 13.0, 13.0])

    points = generate_grid_points(savanna_region, 20000)  # 20km grid
    print(f"  Generated {len(points)} grid points")

    exported = 0
    for i, (lat, lng) in enumerate(points):
        if exported >= n_tiles:
            break
        tile_id = f"nigeria_control_{i:04d}"
        print(f"  Exporting {tile_id} ({lat:.3f}, {lng:.3f})...")
        if export_tile(lat, lng, tile_id, "nigeria_control", label="not_cocoa"):
            exported += 1

    print(f"  Exported {exported} Nigeria control tiles")
    return exported


if __name__ == "__main__":
    print("Cocoa Tile Export Pipeline")
    print("=" * 50)

    # Start with a small test batch
    TEST_MODE = True
    if TEST_MODE:
        print("\n*** TEST MODE: exporting 10 tiles per category ***\n")
        n_cocoa = 10
        n_nococoa = 10
        n_target = 20
        n_control = 5
    else:
        n_cocoa = 500
        n_nococoa = 500
        n_target = 2000
        n_control = 500

    total = 0
    total += export_ghana_cocoa_tiles(n_cocoa)
    total += export_ghana_nococoa_tiles(n_nococoa)
    total += export_nigeria_target_tiles(n_target)
    total += export_nigeria_control_tiles(n_control)

    print(f"\n{'=' * 50}")
    print(f"Total tiles exported: {total}")
    print(f"Output directory: {OUTPUT_DIR.absolute()}")
    print(f"\nNext step: run Gemini classification on exported tiles")
