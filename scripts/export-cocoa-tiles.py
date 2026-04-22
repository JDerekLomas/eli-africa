"""
Export Sentinel-2 tiles for cocoa classification experiment.

Uses grid-based sampling (not random EE sampling) for reliability.
Exports in batches with retry logic and progress tracking.

Usage:
    source .venv/bin/activate
    python scripts/export-cocoa-tiles.py [--test] [--resume]
"""

import ee
import json
import sys
import time
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize Earth Engine
credentials = ee.ServiceAccountCredentials(
    'earthengine@eli-africa-494008.iam.gserviceaccount.com',
    'sa-key.json'
)
ee.Initialize(credentials, project='gen-lang-client-0278315411')
print("Connected to Earth Engine")

# --- Configuration ---
TILE_SIZE = 256
SCALE = 10
TILE_EXTENT = TILE_SIZE * SCALE  # 2560m
OUTPUT_DIR = Path("tiles")
PROGRESS_FILE = OUTPUT_DIR / "progress.json"
MAX_WORKERS = 4  # parallel downloads
MAX_RETRIES = 3

# Precompute global images once (not per-tile)
print("Loading global composites...")
S2 = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2024-01-01", "2024-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
    .select(["B2", "B3", "B4", "B8"])
    .median()
)

COCOA_PROB = ee.ImageCollection(
    "projects/forestdatapartnership/assets/cocoa/model_2025a"
).mosaic()

ELEVATION = ee.Image("USGS/SRTMGL1_003")

RAINFALL = (
    ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2023-01-01", "2023-12-31")
    .select("precipitation")
    .sum()
)

DW = (
    ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterDate("2024-01-01", "2024-12-31")
    .select("label")
    .mode()
)

WORLDCOVER = ee.Image("ESA/WorldCover/v200/2021")
print("Composites loaded.")


def generate_grid(bbox, spacing_km):
    """Generate lat/lng grid within a bounding box.
    bbox: (min_lng, min_lat, max_lng, max_lat)
    spacing_km: grid spacing in km
    """
    min_lng, min_lat, max_lng, max_lat = bbox
    spacing_deg = spacing_km / 111.0
    points = []
    lat = min_lat
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            points.append((round(lat, 4), round(lng, 4)))
            lng += spacing_deg
        lat += spacing_deg
    return points


def get_thumb_url(image, bands, vis_min, vis_max, region):
    """Get a thumbnail URL from EE."""
    return image.getThumbURL({
        "bands": bands,
        "min": vis_min,
        "max": vis_max,
        "dimensions": TILE_SIZE,
        "region": region,
        "format": "png",
    })


def download_with_retry(url, path, retries=MAX_RETRIES):
    """Download a URL to a file with retries."""
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=30)
            if r.status_code == 200 and len(r.content) > 500:
                path.write_bytes(r.content)
                return True
            if r.status_code == 429:
                wait = 2 ** (attempt + 1)
                time.sleep(wait)
                continue
        except (requests.RequestException, ConnectionError):
            if attempt < retries - 1:
                time.sleep(2)
    return False


def get_metadata(lat, lng):
    """Get context metadata. Returns dict, never fails."""
    try:
        point = ee.Geometry.Point([lng, lat])
        info = ee.Dictionary({
            "elevation": ELEVATION.reduceRegion(ee.Reducer.mean(), point, 30).get("elevation"),
            "rainfall": RAINFALL.reduceRegion(ee.Reducer.mean(), point, 5000).get("precipitation"),
            "dynamic_world": DW.reduceRegion(ee.Reducer.mode(), point, 10).get("label"),
            "worldcover": WORLDCOVER.reduceRegion(ee.Reducer.mode(), point, 10).get("Map"),
        }).getInfo()
        return info
    except Exception:
        return {}


def export_tile(lat, lng, tile_id, out_dir, label=None, cocoa_prob_val=None):
    """Export a single tile. Returns True on success."""
    out_dir.mkdir(parents=True, exist_ok=True)

    rgb_path = out_dir / f"{tile_id}_rgb.png"
    nir_path = out_dir / f"{tile_id}_nir.png"
    meta_path = out_dir / f"{tile_id}_meta.json"

    # Skip if already exported
    if rgb_path.exists() and nir_path.exists() and meta_path.exists():
        return True

    point = ee.Geometry.Point([lng, lat])
    tile_geom = point.buffer(TILE_EXTENT / 2).bounds()

    try:
        rgb_url = get_thumb_url(S2, ["B4", "B3", "B2"], 0, 3000, tile_geom)
        nir_url = get_thumb_url(S2, ["B8", "B4", "B3"], 0, 5000, tile_geom)
    except Exception as e:
        print(f"    EE error for {tile_id}: {e}")
        return False

    if not download_with_retry(rgb_url, rgb_path):
        return False
    download_with_retry(nir_url, nir_path)

    meta = get_metadata(lat, lng)
    meta.update({
        "tile_id": tile_id,
        "lat": lat,
        "lng": lng,
        "label": label,
    })
    if cocoa_prob_val is not None:
        meta["cocoa_probability"] = cocoa_prob_val
    meta_path.write_text(json.dumps(meta, indent=2))
    return True


def load_progress():
    """Load set of completed tile IDs."""
    if PROGRESS_FILE.exists():
        return set(json.loads(PROGRESS_FILE.read_text()))
    return set()


def save_progress(completed):
    """Save set of completed tile IDs."""
    PROGRESS_FILE.write_text(json.dumps(sorted(completed)))


def export_batch(tiles, out_dir, desc):
    """Export a batch of tiles with progress tracking and parallelism."""
    completed = load_progress()
    remaining = [(t, tid) for t, tid in tiles if tid not in completed]

    print(f"\n=== {desc} ===")
    print(f"  Total: {len(tiles)}, Already done: {len(tiles) - len(remaining)}, Remaining: {len(remaining)}")

    exported = 0
    failed = 0

    for i, ((lat, lng, label, prob), tile_id) in enumerate(remaining):
        if i > 0 and i % 50 == 0:
            print(f"  Progress: {i}/{len(remaining)} ({exported} exported, {failed} failed)")
            save_progress(completed)

        success = export_tile(lat, lng, tile_id, out_dir, label=label, cocoa_prob_val=prob)
        if success:
            exported += 1
            completed.add(tile_id)
        else:
            failed += 1

        # Rate limit: ~2 requests/sec to EE
        if i % 10 == 9:
            time.sleep(1)

    save_progress(completed)
    print(f"  Done: {exported} exported, {failed} failed")
    return exported


def build_ghana_cocoa_tiles(n=500, spacing_km=3):
    """Build tile list from Ghana cocoa regions using grid + FDP filter."""
    # Ghana cocoa belt bounding boxes
    bboxes = [
        (-3.2, 5.5, -1.0, 7.5),  # Western/Ashanti
        (-1.0, 6.0, 0.5, 7.5),   # Eastern/Ashanti
    ]
    all_points = []
    for bbox in bboxes:
        all_points.extend(generate_grid(bbox, spacing_km))

    print(f"  Ghana grid: {len(all_points)} candidate points")

    # Filter by FDP cocoa probability > 0.7 using batch getInfo
    # Process in chunks to avoid EE timeout
    cocoa_tiles = []
    chunk_size = 100
    for chunk_start in range(0, len(all_points), chunk_size):
        chunk = all_points[chunk_start:chunk_start + chunk_size]
        try:
            points_fc = ee.FeatureCollection([
                ee.Feature(ee.Geometry.Point([lng, lat]), {"lat": lat, "lng": lng})
                for lat, lng in chunk
            ])
            sampled = COCOA_PROB.reduceRegions(
                collection=points_fc,
                reducer=ee.Reducer.mean(),
                scale=100,
            ).getInfo()

            for feat in sampled["features"]:
                prob = feat["properties"].get("mean")
                if prob is not None and prob > 0.7:
                    lat = feat["properties"]["lat"]
                    lng = feat["properties"]["lng"]
                    cocoa_tiles.append((lat, lng, "cocoa", round(prob, 3)))
                    if len(cocoa_tiles) >= n:
                        break
        except Exception as e:
            print(f"    Chunk error: {e}")
            continue

        if len(cocoa_tiles) >= n:
            break

    print(f"  Found {len(cocoa_tiles)} cocoa tiles (prob > 0.7)")
    return cocoa_tiles[:n]


def build_ghana_nococoa_tiles(n=500, spacing_km=4):
    """Build non-cocoa tile list from Ghana humid zone."""
    bboxes = [
        (-3.2, 5.5, -1.0, 7.5),
        (-1.0, 6.0, 0.5, 7.5),
    ]
    all_points = []
    for bbox in bboxes:
        all_points.extend(generate_grid(bbox, spacing_km))

    print(f"  Ghana non-cocoa grid: {len(all_points)} candidate points")

    nococoa_tiles = []
    chunk_size = 100
    for chunk_start in range(0, len(all_points), chunk_size):
        chunk = all_points[chunk_start:chunk_start + chunk_size]
        try:
            points_fc = ee.FeatureCollection([
                ee.Feature(ee.Geometry.Point([lng, lat]), {"lat": lat, "lng": lng})
                for lat, lng in chunk
            ])
            sampled = COCOA_PROB.reduceRegions(
                collection=points_fc,
                reducer=ee.Reducer.mean(),
                scale=100,
            ).getInfo()

            for feat in sampled["features"]:
                prob = feat["properties"].get("mean")
                if prob is not None and prob < 0.2:
                    lat = feat["properties"]["lat"]
                    lng = feat["properties"]["lng"]
                    nococoa_tiles.append((lat, lng, "not_cocoa", round(prob, 3)))
                    if len(nococoa_tiles) >= n:
                        break
        except Exception as e:
            print(f"    Chunk error: {e}")
            continue

        if len(nococoa_tiles) >= n:
            break

    print(f"  Found {len(nococoa_tiles)} non-cocoa tiles (prob < 0.2)")
    return nococoa_tiles[:n]


def build_nigeria_target_tiles(spacing_km=5):
    """Build grid of tiles across Nigeria's cocoa belt."""
    bboxes = [
        # Ondo/Osun/Ogun/Ekiti (core SW cocoa)
        (4.0, 6.8, 5.8, 8.2),
        # Edo/Delta
        (5.0, 6.2, 6.5, 7.5),
        # Cross River/Akwa Ibom
        (7.5, 5.5, 9.5, 7.0),
    ]
    all_points = []
    for bbox in bboxes:
        all_points.extend(generate_grid(bbox, spacing_km))

    tiles = [(lat, lng, None, None) for lat, lng in all_points]
    print(f"  Nigeria target: {len(tiles)} tiles at {spacing_km}km spacing")
    return tiles


def build_nigeria_control_tiles(n=500, spacing_km=10):
    """Grid of tiles from northern Nigeria savanna."""
    bboxes = [
        (3.0, 10.0, 14.0, 13.5),  # northern savanna belt
    ]
    all_points = []
    for bbox in bboxes:
        all_points.extend(generate_grid(bbox, spacing_km))

    tiles = [(lat, lng, "not_cocoa", None) for lat, lng in all_points[:n]]
    print(f"  Nigeria control: {len(tiles)} tiles at {spacing_km}km spacing")
    return tiles


if __name__ == "__main__":
    test_mode = "--test" in sys.argv

    print(f"\nCocoa Tile Export Pipeline {'(TEST MODE)' if test_mode else '(FULL)'}")
    print("=" * 60)

    if test_mode:
        max_cocoa = 20
        max_nococoa = 20
        max_control = 10
        target_spacing = 15
    else:
        max_cocoa = 500
        max_nococoa = 500
        max_control = 500
        target_spacing = 5

    total = 0

    # Ghana cocoa (labeled positive)
    print("\nBuilding Ghana cocoa tile list...")
    ghana_cocoa = build_ghana_cocoa_tiles(max_cocoa)
    tiles_with_ids = [
        ((lat, lng, label, prob), f"ghana_cocoa_{i:04d}")
        for i, (lat, lng, label, prob) in enumerate(ghana_cocoa)
    ]
    total += export_batch(tiles_with_ids, OUTPUT_DIR / "ghana_cocoa", f"Ghana Cocoa ({len(ghana_cocoa)} tiles)")

    # Ghana non-cocoa (labeled negative)
    print("\nBuilding Ghana non-cocoa tile list...")
    ghana_nococoa = build_ghana_nococoa_tiles(max_nococoa)
    tiles_with_ids = [
        ((lat, lng, label, prob), f"ghana_nococoa_{i:04d}")
        for i, (lat, lng, label, prob) in enumerate(ghana_nococoa)
    ]
    total += export_batch(tiles_with_ids, OUTPUT_DIR / "ghana_nococoa", f"Ghana Non-Cocoa ({len(ghana_nococoa)} tiles)")

    # Nigeria target (unlabeled)
    print("\nBuilding Nigeria target tile list...")
    nigeria_target = build_nigeria_target_tiles(target_spacing)
    tiles_with_ids = [
        ((lat, lng, label, prob), f"nigeria_target_{i:04d}")
        for i, (lat, lng, label, prob) in enumerate(nigeria_target)
    ]
    total += export_batch(tiles_with_ids, OUTPUT_DIR / "nigeria_target_grid", f"Nigeria Target ({len(nigeria_target)} tiles)")

    # Nigeria control (labeled negative)
    print("\nBuilding Nigeria control tile list...")
    nigeria_control = build_nigeria_control_tiles(max_control)
    tiles_with_ids = [
        ((lat, lng, label, prob), f"nigeria_control_{i:04d}")
        for i, (lat, lng, label, prob) in enumerate(nigeria_control)
    ]
    total += export_batch(tiles_with_ids, OUTPUT_DIR / "nigeria_control", f"Nigeria Control ({len(nigeria_control)} tiles)")

    print(f"\n{'=' * 60}")
    print(f"Total tiles exported: {total}")
    print(f"Output: {OUTPUT_DIR.absolute()}")

    # Summary
    for d in OUTPUT_DIR.iterdir():
        if d.is_dir():
            pngs = len(list(d.glob("*_rgb.png")))
            print(f"  {d.name}: {pngs} tiles")
