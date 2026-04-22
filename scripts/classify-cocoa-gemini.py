"""
Proof-of-concept: Classify satellite tiles as cocoa/not-cocoa using Gemini Vision.
Few-shot approach: show Ghana examples, classify Nigeria tiles.
"""

import base64
import json
import os
import sys
from pathlib import Path

# Load Gemini API key from sourcelibrary config
env_path = Path.home() / "sourcelibrary" / ".env.production.local"
api_key = None
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        api_key = line.split("=", 1)[1].strip()
        break

if not api_key:
    print("Error: No GEMINI_API_KEY found")
    sys.exit(1)

print(f"Using Gemini API key: {api_key[:10]}...")

import requests

TILES_DIR = Path("tiles")
MODEL = "gemini-2.5-flash"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"


def load_image_b64(path):
    """Load an image as base64."""
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def build_prompt(target_rgb_path, target_nir_path, target_meta):
    """Build the few-shot classification prompt."""

    # Load reference examples
    ghana_cocoa_rgb = load_image_b64(TILES_DIR / "ghana_cocoa" / "ghana_cocoa_0000_rgb.png")
    ghana_cocoa_nir = load_image_b64(TILES_DIR / "ghana_cocoa" / "ghana_cocoa_0000_nir.png")
    ghana_cocoa2_rgb = load_image_b64(TILES_DIR / "ghana_cocoa" / "ghana_cocoa_0001_rgb.png")

    ghana_nococoa_rgb = load_image_b64(TILES_DIR / "ghana_nococoa" / "ghana_nococoa_0000_rgb.png")
    ghana_nococoa2_rgb = load_image_b64(TILES_DIR / "ghana_nococoa" / "ghana_nococoa_0002_rgb.png")

    control_rgb = load_image_b64(TILES_DIR / "nigeria_control" / "nigeria_control_0002_rgb.png")

    target_rgb = load_image_b64(target_rgb_path)
    target_nir = load_image_b64(target_nir_path)

    elevation = target_meta.get("elevation", "unknown")
    rainfall = target_meta.get("rainfall", "unknown")
    if isinstance(rainfall, float):
        rainfall = f"{rainfall:.0f}"

    parts = [
        {"text": """You are an agricultural remote sensing expert analyzing Sentinel-2 satellite imagery to identify cocoa farms in West Africa.

Cocoa farms in satellite imagery typically show:
- Dense, dark green canopy (evergreen tree crop)
- Irregular field boundaries (unlike geometric grain fields)
- Mixed with shade trees (agroforestry pattern)
- Located in humid/sub-humid zones with 1200-3000mm annual rainfall
- Often on gentle slopes below 600m elevation
- Distinct from oil palm (more uniform, lighter green, regular spacing)
- Distinct from natural forest (more heterogeneous canopy, visible paths/clearings)

Here are CONFIRMED COCOA farm examples from Ghana (labeled ground truth):

Example 1 - COCOA (RGB):"""},
        {"inline_data": {"mime_type": "image/png", "data": ghana_cocoa_rgb}},
        {"text": "Example 1 - COCOA (NIR false-color, red = healthy vegetation):"},
        {"inline_data": {"mime_type": "image/png", "data": ghana_cocoa_nir}},
        {"text": "Example 2 - COCOA (RGB):"},
        {"inline_data": {"mime_type": "image/png", "data": ghana_cocoa2_rgb}},
        {"text": """These cocoa tiles show dense dark-green tree canopy with irregular boundaries, roads/paths visible, and mixed agroforestry texture.

Here are NON-COCOA examples from the same climate zone:

Example 3 - NOT COCOA (degraded forest/scrubland in Ghana):"""},
        {"inline_data": {"mime_type": "image/png", "data": ghana_nococoa_rgb}},
        {"text": "Example 4 - NOT COCOA (another non-cocoa area in Ghana):"},
        {"inline_data": {"mime_type": "image/png", "data": ghana_nococoa2_rgb}},
        {"text": "Example 5 - NOT COCOA (dry savanna farmland in northern Nigeria - geometric fields, no tree canopy):"},
        {"inline_data": {"mime_type": "image/png", "data": control_rgb}},
        {"text": f"""Now analyze this UNKNOWN tile from Nigeria's cocoa belt region:

Target tile (RGB):"""},
        {"inline_data": {"mime_type": "image/png", "data": target_rgb}},
        {"text": "Target tile (NIR false-color):"},
        {"inline_data": {"mime_type": "image/png", "data": target_nir}},
        {"text": f"""Location: {target_meta.get('lat', '?')}°N, {target_meta.get('lng', '?')}°E
Elevation: {elevation}m
Annual rainfall: {rainfall}mm

Based on the visual patterns compared to the Ghana reference examples, classify this tile.

Respond in this exact JSON format:
{{
  "classification": "COCOA" or "NOT_COCOA" or "UNCERTAIN",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of visual features that support your classification",
  "sub_type": "monoculture" or "agroforestry" or "N/A",
  "alternative": "If not cocoa, what land use do you think this is?"
}}"""},
    ]

    return parts


def classify_tile(tile_name, rgb_path, nir_path, meta_path):
    """Classify a single tile using Gemini."""
    meta = json.loads(meta_path.read_text())
    parts = build_prompt(rgb_path, nir_path, meta)

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
        },
    }

    r = requests.post(API_URL, json=payload, timeout=60)
    if r.status_code != 200:
        print(f"  API error: {r.status_code} - {r.text[:200]}")
        return None

    result = r.json()
    text = result["candidates"][0]["content"]["parts"][0]["text"]

    # Parse JSON from response
    try:
        # Extract JSON from markdown code block if present
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        # Find JSON object in text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(text[start:end])
        else:
            parsed = json.loads(text.strip())
    except json.JSONDecodeError:
        parsed = {"raw_response": text}

    parsed["tile_id"] = tile_name
    parsed["lat"] = meta.get("lat")
    parsed["lng"] = meta.get("lng")
    return parsed


def main():
    print("Cocoa Classification with Gemini Vision")
    print("=" * 50)

    results = []

    # Classify Nigeria target tiles
    target_dir = TILES_DIR / "nigeria_target"
    tiles = sorted(set(
        p.stem.replace("_rgb", "").replace("_nir", "").replace("_meta", "")
        for p in target_dir.glob("*_rgb.png")
    ))

    print(f"\nClassifying {len(tiles)} Nigeria target tiles...\n")

    for tile_name in tiles:
        rgb = target_dir / f"{tile_name}_rgb.png"
        nir = target_dir / f"{tile_name}_nir.png"
        meta = target_dir / f"{tile_name}_meta.json"

        if not all(p.exists() for p in [rgb, nir, meta]):
            continue

        print(f"  {tile_name}...", end=" ", flush=True)
        result = classify_tile(tile_name, rgb, nir, meta)
        if result:
            cls = result.get("classification", "?")
            conf = result.get("confidence", "?")
            reason = result.get("reasoning", "")[:80]
            print(f"{cls} (confidence: {conf}) - {reason}")
            results.append(result)
        else:
            print("FAILED")

    # Also classify control tiles for validation
    control_dir = TILES_DIR / "nigeria_control"
    control_tiles = sorted(set(
        p.stem.replace("_rgb", "").replace("_nir", "").replace("_meta", "")
        for p in control_dir.glob("*_rgb.png")
    ))

    print(f"\nClassifying {len(control_tiles)} Nigeria control tiles (should be NOT_COCOA)...\n")

    for tile_name in control_tiles:
        rgb = control_dir / f"{tile_name}_rgb.png"
        nir = control_dir / f"{tile_name}_nir.png"
        meta = control_dir / f"{tile_name}_meta.json"

        if not all(p.exists() for p in [rgb, nir, meta]):
            continue

        print(f"  {tile_name}...", end=" ", flush=True)
        result = classify_tile(tile_name, rgb, nir, meta)
        if result:
            cls = result.get("classification", "?")
            conf = result.get("confidence", "?")
            reason = result.get("reasoning", "")[:80]
            print(f"{cls} (confidence: {conf}) - {reason}")
            results.append(result)
        else:
            print("FAILED")

    # Save results
    output_path = Path("tiles/classification_results.json")
    output_path.write_text(json.dumps(results, indent=2))
    print(f"\n{'=' * 50}")
    print(f"Results saved to: {output_path}")

    # Summary
    cocoa = [r for r in results if r.get("classification") == "COCOA"]
    not_cocoa = [r for r in results if r.get("classification") == "NOT_COCOA"]
    uncertain = [r for r in results if r.get("classification") == "UNCERTAIN"]
    print(f"\nSummary:")
    print(f"  COCOA: {len(cocoa)}")
    print(f"  NOT_COCOA: {len(not_cocoa)}")
    print(f"  UNCERTAIN: {len(uncertain)}")
    print(f"  Total: {len(results)}")


if __name__ == "__main__":
    main()
