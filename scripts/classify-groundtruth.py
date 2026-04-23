"""
Classify all ground-truth tiles using Gemini.
Processes tiles in batches with rate limiting and progress saving.
"""

import base64
import json
import time
import sys
from pathlib import Path

# Load Gemini API key
env_path = Path.home() / "sourcelibrary" / ".env.production.local"
api_keys = []
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY") and "=" in line:
        key = line.split("=", 1)[1].strip()
        if key:
            api_keys.append(key)

print(f"Loaded {len(api_keys)} API keys")

import requests

TILES_DIR = Path("tiles/groundtruth")
RESULTS_FILE = TILES_DIR / "classification_results.json"
MODEL = "gemini-2.5-flash"

# Reference tiles (Ghana)
REF_DIR = Path("tiles")

def load_b64(path):
    return base64.b64encode(path.read_bytes()).decode("utf-8")

# Pre-load reference images
print("Loading reference images...")
REFS = {
    "cocoa1_rgb": load_b64(REF_DIR / "ghana_cocoa/ghana_cocoa_0000_rgb.png"),
    "cocoa1_nir": load_b64(REF_DIR / "ghana_cocoa/ghana_cocoa_0000_nir.png"),
    "cocoa2_rgb": load_b64(REF_DIR / "ghana_cocoa/ghana_cocoa_0001_rgb.png"),
    "nococoa1_rgb": load_b64(REF_DIR / "ghana_nococoa/ghana_nococoa_0000_rgb.png"),
    "nococoa2_rgb": load_b64(REF_DIR / "ghana_nococoa/ghana_nococoa_0002_rgb.png"),
    "control_rgb": load_b64(REF_DIR / "nigeria_control/nigeria_control_0002_rgb.png"),
}
print("References loaded.")


def build_prompt(target_rgb_b64, target_nir_b64, meta):
    elevation = meta.get("elevation", "unknown")
    rainfall = meta.get("rainfall", "unknown")
    if isinstance(rainfall, float):
        rainfall = f"{rainfall:.0f}"

    parts = [
        {"text": f"""Is this a cocoa farm? Cocoa in satellite imagery = dense dark-green tree canopy, irregular field boundaries, agroforestry (mixed shade trees). NOT cocoa = geometric crop fields, savanna grassland, urban, sparse vegetation, oil palm (uniform rows).

Tile (RGB):"""},
        {"inline_data": {"mime_type": "image/png", "data": target_rgb_b64}},
        {"text": f"""Elevation: {elevation}m, Rainfall: {rainfall}mm. Reply ONLY JSON: {{"classification":"COCOA"|"NOT_COCOA"|"UNCERTAIN","confidence":0.0-1.0,"reasoning":"20 words max","sub_type":"monoculture"|"agroforestry"|"N/A"}}"""},
    ]
    return parts


def classify(tile_id, rgb_path, nir_path, meta, api_key):
    rgb_b64 = load_b64(rgb_path)
    nir_b64 = load_b64(nir_path)
    parts = build_prompt(rgb_b64, nir_b64, meta)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
    }

    for attempt in range(3):
        try:
            r = requests.post(url, json=payload, timeout=90)
            if r.status_code == 429:
                wait = 2 ** (attempt + 2)
                print(f" [rate limited, waiting {wait}s]", end="", flush=True)
                time.sleep(wait)
                continue
            if r.status_code != 200:
                return {"error": f"HTTP {r.status_code}", "tile_id": tile_id}

            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(text[start:end])
            else:
                parsed = {"raw_response": text[:200]}

            parsed["tile_id"] = tile_id
            parsed["lat"] = meta.get("lat")
            parsed["lng"] = meta.get("lng")
            parsed["state"] = meta.get("state", "")
            parsed["production_tons"] = meta.get("production_tons", "")
            return parsed

        except (requests.RequestException, json.JSONDecodeError, KeyError) as e:
            if attempt < 2:
                time.sleep(2)
            else:
                return {"error": str(e), "tile_id": tile_id}

    return {"error": "max retries", "tile_id": tile_id}


def load_results():
    if RESULTS_FILE.exists():
        return json.loads(RESULTS_FILE.read_text())
    return []


def save_results(results):
    RESULTS_FILE.write_text(json.dumps(results, indent=2))


def find_all_tiles():
    """Find all tiles across groundtruth directories."""
    tiles = []

    # Exact GPS tiles
    gps_dir = TILES_DIR / "exact_gps"
    if gps_dir.exists():
        for rgb in sorted(gps_dir.glob("*_rgb.png")):
            tid = rgb.stem.replace("_rgb", "")
            nir = gps_dir / f"{tid}_nir.png"
            meta_f = gps_dir / f"{tid}_meta.json"
            if nir.exists() and meta_f.exists():
                tiles.append((tid, rgb, nir, meta_f, "exact_gps"))

    # Filtered grid tiles
    grid_dir = TILES_DIR / "filtered_grid"
    if grid_dir.exists():
        for state_dir in sorted(grid_dir.iterdir()):
            if not state_dir.is_dir():
                continue
            for rgb in sorted(state_dir.glob("*_rgb.png")):
                tid = rgb.stem.replace("_rgb", "")
                nir = state_dir / f"{tid}_nir.png"
                meta_f = state_dir / f"{tid}_meta.json"
                if nir.exists() and meta_f.exists():
                    tiles.append((tid, rgb, nir, meta_f, state_dir.name))

    return tiles


def main():
    print("Cocoa Classification — Ground Truth + Filtered Grid")
    print("=" * 60)

    tiles = find_all_tiles()
    print(f"Found {len(tiles)} tiles to classify")

    # Load existing results to resume
    results = load_results()
    done_ids = {r["tile_id"] for r in results}
    remaining = [(t, r, n, m, s) for t, r, n, m, s in tiles if t not in done_ids]
    print(f"Already done: {len(done_ids)}, Remaining: {len(remaining)}")

    if not remaining:
        print("All tiles classified!")
    else:
        key_idx = 0
        for i, (tid, rgb_path, nir_path, meta_path, source) in enumerate(remaining):
            meta = json.loads(meta_path.read_text())
            api_key = api_keys[key_idx % len(api_keys)]
            key_idx += 1

            print(f"  [{i+1}/{len(remaining)}] {tid}...", end=" ", flush=True)
            result = classify(tid, rgb_path, nir_path, meta, api_key)
            result["source"] = source

            cls = result.get("classification", "?")
            conf = result.get("confidence", "?")
            print(f"{cls} ({conf})")

            results.append(result)

            # Save every 25 tiles
            if (i + 1) % 25 == 0:
                save_results(results)
                print(f"    --- saved progress ({len(results)} total) ---")

            # Rate limit: ~1 req/sec, rotate keys
            time.sleep(0.5)

        save_results(results)

    # Summary
    print(f"\n{'='*60}")
    print(f"Total classified: {len(results)}")

    cocoa = [r for r in results if r.get("classification") == "COCOA"]
    not_cocoa = [r for r in results if r.get("classification") == "NOT_COCOA"]
    uncertain = [r for r in results if r.get("classification") == "UNCERTAIN"]
    errors = [r for r in results if "error" in r]

    print(f"  COCOA: {len(cocoa)}")
    print(f"  NOT_COCOA: {len(not_cocoa)}")
    print(f"  UNCERTAIN: {len(uncertain)}")
    print(f"  Errors: {len(errors)}")

    # Per-state breakdown
    print(f"\nPer-source breakdown:")
    sources = sorted(set(r.get("source", "?") for r in results))
    for src in sources:
        src_results = [r for r in results if r.get("source") == src]
        src_cocoa = sum(1 for r in src_results if r.get("classification") == "COCOA")
        print(f"  {src}: {src_cocoa}/{len(src_results)} COCOA ({src_cocoa*100//max(len(src_results),1)}%)")

    # Validate ground-truth tiles
    print(f"\nGround-truth validation:")
    gt_results = [r for r in results if r.get("source") == "exact_gps"]
    for r in gt_results:
        cls = r.get("classification", "?")
        conf = r.get("confidence", "?")
        tons = r.get("production_tons", "?")
        state = r.get("state", "?")
        print(f"  {r['tile_id']:35s} {cls:12s} (conf: {conf}) — {state}, {tons} tons")


if __name__ == "__main__":
    main()
