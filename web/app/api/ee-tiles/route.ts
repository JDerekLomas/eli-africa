import { NextResponse } from "next/server";
import { getEE } from "@/lib/ee-init";
import { buildEEImage } from "@/lib/layers";
import { buildVulnerabilityImage, VulnerabilityWeights } from "@/lib/vulnerability";
import { buildSiteSelectionImage, SiteSelectionCriteria } from "@/lib/site-selection";

export const maxDuration = 60;

// Cache tile URLs (they last a few hours)
const tileCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let africaGeom: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAfricaGeom(ee: any) {
  if (!africaGeom) {
    africaGeom = ee
      .FeatureCollection("USDOS/LSIB_SIMPLE/2017")
      .filter(ee.Filter.eq("wld_rgn", "Africa"))
      .geometry();
  }
  return africaGeom;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTileUrl(ee: any, image: any, visParams: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    image.getMapId(visParams, (obj: { urlFormat?: string }, err: string) => {
      if (err) reject(new Error(err));
      else resolve(obj.urlFormat!);
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { layerId, layerIds, weights, criteria } = body;

    const ee = await getEE();

    // Batch mode: return multiple tile URLs at once
    if (layerIds && Array.isArray(layerIds)) {
      const results: Record<string, string> = {};
      await Promise.all(
        layerIds.map(async (id: string) => {
          const cached = tileCache.get(id);
          if (cached && Date.now() - cached.ts < CACHE_TTL) {
            results[id] = cached.url;
            return;
          }
          const { image, visParams } = buildEEImage(ee, id);
          const url = await getTileUrl(ee, image, visParams);
          tileCache.set(id, { url, ts: Date.now() });
          results[id] = url;
        })
      );
      return NextResponse.json({ tiles: results });
    }

    // Single layer mode
    if (!layerId) {
      return NextResponse.json({ error: "layerId or layerIds required" }, { status: 400 });
    }

    // Check cache for standard layers
    if (!weights && !criteria) {
      const cached = tileCache.get(layerId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return NextResponse.json({ tileUrl: cached.url });
      }
    }

    let image, visParams;

    if (layerId === "vulnerability-index") {
      const geom = await getAfricaGeom(ee);
      ({ image, visParams } = buildVulnerabilityImage(ee, weights as VulnerabilityWeights, geom));
    } else if (layerId === "site-selection") {
      const geom = await getAfricaGeom(ee);
      ({ image, visParams } = buildSiteSelectionImage(ee, criteria as SiteSelectionCriteria, geom));
    } else {
      ({ image, visParams } = buildEEImage(ee, layerId));
    }

    const tileUrl = await getTileUrl(ee, image, visParams);

    // Cache standard layers
    if (!weights && !criteria) {
      tileCache.set(layerId, { url: tileUrl, ts: Date.now() });
    }

    return NextResponse.json({ tileUrl });
  } catch (err) {
    console.error("EE tile error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
