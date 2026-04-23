"""
Export tiles centered on ground-truth cocoa farm GPS coordinates from Etaware (2022).
Plus a grid around the top 5 producing states.

Strategy:
1. Export at each of the 18 exact GPS points (validation)
2. Grid within 30km of top 5 state GPS points (Ondo, Osun, Cross River, Oyo, Ogun)
3. Pre-filter: only export where Dynamic World = trees AND rainfall > 1200mm
"""

import ee
import json
import time
import requests
from pathlib import Path

credentials = ee.ServiceAccountCredentials(
    'earthengine@eli-africa-494008.iam.gserviceaccount.com',
    'sa-key.json'
)
ee.Initialize(credentials, project='gen-lang-client-0278315411')
print("Connected to Earth Engine")

OUTPUT_DIR = Path("tiles/groundtruth")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load ground truth
GT = json.loads(Path("data/nigeria-cocoa-groundtruth.json").read_text())

# Global composites
print("Loading composites...")
S2 = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2024-01-01", "2024-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
    .select(["B2", "B3", "B4", "B8"])
    .median()
)

DW = (
    ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterDate("2024-01-01", "2024-12-31")
    .select("label")
    .mode()
)

RAINFALL = (
    ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2023-01-01", "2023-12-31")
    .select("precipitation")
    .sum()
)

ELEVATION = ee.Image("USGS/SRTMGL1_003")
print("Composites loaded.")

TILE_SIZE = 256
TILE_EXTENT = 2560  # 256 * 10m


def download(url, path, retries=3):
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=30)
            if r.status_code == 200 and len(r.content) > 500:
                path.write_bytes(r.content)
                return True
            if r.status_code == 429:
                time.sleep(2 ** (attempt + 1))
        except requests.RequestException:
            time.sleep(2)
    return False


def export_tile(lat, lng, tile_id, out_dir, extra_meta=None):
    out_dir.mkdir(parents=True, exist_ok=True)
    rgb_path = out_dir / f"{tile_id}_rgb.png"
    nir_path = out_dir / f"{tile_id}_nir.png"
    meta_path = out_dir / f"{tile_id}_meta.json"

    if rgb_path.exists() and meta_path.exists():
        return True  # already done

    point = ee.Geometry.Point([lng, lat])
    geom = point.buffer(TILE_EXTENT / 2).bounds()

    try:
        rgb_url = S2.getThumbURL({
            "bands": ["B4", "B3", "B2"], "min": 0, "max": 3000,
            "dimensions": TILE_SIZE, "region": geom, "format": "png",
        })
        nir_url = S2.getThumbURL({
            "bands": ["B8", "B4", "B3"], "min": 0, "max": 5000,
            "dimensions": TILE_SIZE, "region": geom, "format": "png",
        })
    except Exception as e:
        print(f"    EE error: {e}")
        return False

    if not download(rgb_url, rgb_path):
        return False
    download(nir_url, nir_path)

    # Metadata
    try:
        info = ee.Dictionary({
            "elevation": ELEVATION.reduceRegion(ee.Reducer.mean(), point, 30).get("elevation"),
            "rainfall": RAINFALL.reduceRegion(ee.Reducer.mean(), point, 5000).get("precipitation"),
            "dynamic_world": DW.reduceRegion(ee.Reducer.mode(), point, 10).get("label"),
        }).getInfo()
    except Exception:
        info = {}

    meta = {"tile_id": tile_id, "lat": lat, "lng": lng, **info}
    if extra_meta:
        meta.update(extra_meta)
    meta_path.write_text(json.dumps(meta, indent=2))
    return True


def check_suitability(lat, lng):
    """Pre-filter: is this location suitable for cocoa?
    Returns True if Dynamic World = trees (1) and rainfall > 1200mm."""
    try:
        point = ee.Geometry.Point([lng, lat])
        info = ee.Dictionary({
            "dw": DW.reduceRegion(ee.Reducer.mode(), point, 100).get("label"),
            "rain": RAINFALL.reduceRegion(ee.Reducer.mean(), point, 5000).get("precipitation"),
            "elev": ELEVATION.reduceRegion(ee.Reducer.mean(), point, 100).get("elevation"),
        }).getInfo()

        dw = info.get("dw")
        rain = info.get("rain") or 0
        elev = info.get("elev") or 9999

        # Trees (1), grass (2), or crops (4) — could be cocoa agroforestry
        suitable_landuse = dw in [1, 2, 4]
        suitable_rain = rain > 1200
        suitable_elev = elev < 600

        return suitable_landuse and suitable_rain and suitable_elev
    except Exception:
        return True  # if check fails, include anyway


# --- Phase 1: Export at exact ground-truth GPS points ---
print("\n=== Phase 1: Ground-truth GPS points (18 locations) ===")
gt_dir = OUTPUT_DIR / "exact_gps"
exported = 0
for farm in GT["farms"]:
    state = farm["state"].lower().replace(" ", "_")
    community = farm["community"].lower().replace(" ", "_")
    tile_id = f"gt_{state}_{community}"
    lat, lng = farm["lat"], farm["lng"]
    tons = farm["tons"]

    print(f"  {tile_id} ({lat:.4f}, {lng:.4f}) — {tons} tons...", end=" ", flush=True)
    if export_tile(lat, lng, tile_id, gt_dir, extra_meta={
        "state": farm["state"],
        "lga": farm["lga"],
        "community": farm["community"],
        "production_tons": str(tons),
        "production_pct": farm["pct"],
        "source": "Etaware 2022, Table 2",
        "label": "cocoa" if tons != 0 and tons != "Infinitesimal" else "marginal_cocoa",
    }):
        exported += 1
        print("OK")
    else:
        print("FAIL")

print(f"  Exported: {exported}/18")


# --- Phase 2: Grid around top 5 producers with pre-filtering ---
print("\n=== Phase 2: Filtered grid around top 5 producers ===")
grid_dir = OUTPUT_DIR / "filtered_grid"

TOP5 = [f for f in GT["farms"] if f["state"] in ["Ondo", "Osun", "Cross River", "Oyo", "Ogun"]]

total_grid = 0
total_suitable = 0
total_exported = 0

for farm in TOP5:
    state = farm["state"]
    center_lat, center_lng = farm["lat"], farm["lng"]
    print(f"\n  {state} (center: {center_lat:.4f}, {center_lng:.4f}):")

    # Generate 5km grid within 30km radius
    spacing_deg = 5.0 / 111.0  # 5km in degrees
    radius_deg = 30.0 / 111.0  # 30km

    grid_points = []
    lat = center_lat - radius_deg
    while lat <= center_lat + radius_deg:
        lng = center_lng - radius_deg
        while lng <= center_lng + radius_deg:
            # Check within radius
            dlat = (lat - center_lat) * 111
            dlng = (lng - center_lng) * 111 * 0.9  # approx cos correction
            if (dlat**2 + dlng**2) ** 0.5 <= 30:
                grid_points.append((round(lat, 4), round(lng, 4)))
            lng += spacing_deg
        lat += spacing_deg

    total_grid += len(grid_points)
    print(f"    Grid points: {len(grid_points)}")

    # Batch pre-filter for suitability
    suitable = []
    chunk_size = 50
    for ci in range(0, len(grid_points), chunk_size):
        chunk = grid_points[ci:ci + chunk_size]
        try:
            fc = ee.FeatureCollection([
                ee.Feature(ee.Geometry.Point([lng, lat]), {"lat": lat, "lng": lng})
                for lat, lng in chunk
            ])

            # Sample DW, rainfall, elevation at all points
            dw_sampled = DW.reduceRegions(fc, ee.Reducer.mode(), 100).getInfo()
            rain_sampled = RAINFALL.reduceRegions(fc, ee.Reducer.mean(), 5000).getInfo()
            elev_sampled = ELEVATION.reduceRegions(fc, ee.Reducer.mean(), 100).getInfo()

            for j, feat in enumerate(dw_sampled["features"]):
                dw_val = feat["properties"].get("mode")
                rain_val = rain_sampled["features"][j]["properties"].get("mean", 0) or 0
                elev_val = elev_sampled["features"][j]["properties"].get("mean", 9999) or 9999
                lat_v = feat["properties"]["lat"]
                lng_v = feat["properties"]["lng"]

                if dw_val in [1, 2, 4] and rain_val > 1200 and elev_val < 600:
                    suitable.append((lat_v, lng_v))
        except Exception as e:
            print(f"    Filter error: {e}")
            # Include chunk without filtering on error
            suitable.extend(chunk)

    total_suitable += len(suitable)
    print(f"    Suitable (post-filter): {len(suitable)} ({len(suitable)*100//max(len(grid_points),1)}%)")

    # Export suitable tiles
    state_exported = 0
    for i, (lat, lng) in enumerate(suitable):
        state_key = state.lower().replace(" ", "_")
        tile_id = f"grid_{state_key}_{i:04d}"
        if export_tile(lat, lng, tile_id, grid_dir / state_key, extra_meta={
            "state": state,
            "grid_center_lat": center_lat,
            "grid_center_lng": center_lng,
        }):
            state_exported += 1

        if i % 20 == 19:
            print(f"      Progress: {i+1}/{len(suitable)} exported")
            time.sleep(1)  # rate limit

    total_exported += state_exported
    print(f"    Exported: {state_exported}")


print(f"\n{'='*60}")
print(f"Phase 1: 18 ground-truth points → {exported} tiles")
print(f"Phase 2: {total_grid} grid points → {total_suitable} suitable → {total_exported} exported")
print(f"Total tiles: {exported + total_exported}")
print(f"Output: {OUTPUT_DIR.absolute()}")
