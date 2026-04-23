import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const EXPERT_CONTEXT = `You are analyzing high-resolution (~0.6m/pixel) satellite imagery for agricultural land use classification in tropical/subtropical Africa.

Key visual differences between land cover types at this resolution:
- **Oil palm plantation**: Star-shaped/feathery crowns radiating from center, very regular spacing (9-10m), individual trees clearly distinguishable, uniform monoculture
- **Cocoa agroforestry**: Lumpy heterogeneous canopy, cocoa grows UNDER taller shade trees, irregular spacing, bare soil/leaf litter visible between patches, footpaths
- **Rubber plantation**: Tall uniform canopy, deciduous (bare in dry season), regular rows, rounded crowns
- **Natural/degraded forest**: Highly varied canopy heights, emergent tall trees, no regular pattern, very dense
- **Smallholder cropland**: Geometric field boundaries, bare soil between crops, seasonal variation, small plots (<2ha)
- **Urban/settlement**: Buildings, roads, compounds visible
- **Savanna/grassland**: Scattered trees, dry grass, seasonal burning

Be honest about uncertainty. Describe what you see before classifying.`;

interface AnalyzeRequest {
  lat: number;
  lng: number;
  locationName?: string;
  elevation?: number;
  rainfall?: number;
}

export async function POST(request: Request) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { lat, lng, locationName, elevation, rainfall } = body;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Fetch ESRI tile at zoom 18 (~0.6m)
    const zoom = 18;
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );

    // Fetch center tile + context tile (zoom 16)
    const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
    const zoom16 = 16;
    const n16 = Math.pow(2, zoom16);
    const x16 = Math.floor(((lng + 180) / 360) * n16);
    const y16 = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n16
    );
    const contextUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom16}/${y16}/${x16}`;

    const [tileRes, contextRes] = await Promise.all([
      fetch(tileUrl),
      fetch(contextUrl),
    ]);

    if (!tileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch satellite imagery" }, { status: 502 });
    }

    const tileBuffer = Buffer.from(await tileRes.arrayBuffer());
    const tileB64 = tileBuffer.toString("base64");

    const contextBuffer = contextRes.ok ? Buffer.from(await contextRes.arrayBuffer()) : null;
    const contextB64 = contextBuffer?.toString("base64");

    // Build location context
    const locParts = [];
    locParts.push(`Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    if (locationName) locParts.push(`Location: ${locationName}`);
    if (elevation != null) locParts.push(`Elevation: ${elevation}m`);
    if (rainfall != null) locParts.push(`Annual rainfall: ${Math.round(rainfall)}mm`);

    const prompt = `${EXPERT_CONTEXT}

## Location
${locParts.join("\n")}

## Images
Image 1: High-resolution (~0.6m/pixel, ~150m x 150m area)
Image 2: Wider context (~2.5m/pixel, ~600m x 600m area)

## Task
1. Describe the land cover visible in both images
2. If trees: what type of vegetation and why? Give specific visual evidence
3. If agriculture: what crop(s) might this be? What visual features support each possibility?
4. What could this be confused with?
5. What additional information would increase certainty?
6. Overall assessment and confidence (low/medium/high)`;

    // Build Gemini request parts
    const parts: Array<Record<string, unknown>> = [
      { text: prompt },
      { inline_data: { mime_type: "image/jpeg", data: tileB64 } },
    ];
    if (contextB64) {
      parts.push({ inline_data: { mime_type: "image/jpeg", data: contextB64 } });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: `Gemini error: ${geminiRes.status}`, details: errText.slice(0, 200) }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    // Generate analysis ID from coordinates
    const id = `${lat.toFixed(4)}_${lng.toFixed(4)}`.replace(/[.-]/g, (c) =>
      c === "." ? "d" : "n"
    );

    // Save analysis to disk
    const analysisData = {
      id,
      analysis,
      tileImage: `data:image/jpeg;base64,${tileB64}`,
      contextImage: contextB64 ? `data:image/jpeg;base64,${contextB64}` : null,
      lat,
      lng,
      timestamp: new Date().toISOString().split("T")[0],
    };

    try {
      const dir = path.join(process.cwd(), "data", "analyses");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${id}.json`),
        JSON.stringify(analysisData)
      );
    } catch {
      // Non-critical — analysis still returned even if save fails
    }

    return NextResponse.json({ ...analysisData, permalink: `/a/${id}` });
  } catch (err) {
    console.error("Analyze error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
