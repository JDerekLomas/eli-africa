import { NextResponse } from "next/server";
import { getEE } from "@/lib/ee-init";
import { buildEEImage, LAYERS } from "@/lib/layers";

export const maxDuration = 60;

// Precompute all tile URLs at once
export async function GET() {
  try {
    const ee = await getEE();
    const results: Record<string, string> = {};

    // Build all layers in parallel
    await Promise.all(
      LAYERS.map(async (layer) => {
        try {
          const { image, visParams } = buildEEImage(ee, layer.id);
          const url = await new Promise<string>((resolve, reject) => {
            image.getMapId(visParams, (obj: { urlFormat?: string }, err: string) => {
              if (err) reject(new Error(err));
              else resolve(obj.urlFormat!);
            });
          });
          results[layer.id] = url;
        } catch {
          // Skip layers that fail (e.g., NICFI)
        }
      })
    );

    return NextResponse.json({ tiles: results });
  } catch (err) {
    console.error("Preload error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
