import { NextResponse } from "next/server";
import { getEE } from "@/lib/ee-init";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { lat, lng, dataset } = await request.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }

    const ee = await getEE();
    const point = ee.Geometry.Point([lng, lat]);

    let collection, band: string, scale: number, reducer: string;

    if (dataset === "rainfall") {
      // CHIRPS annual totals
      const years = Array.from({ length: 21 }, (_, i) => 2003 + i);
      const annuals = years.map((y) =>
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
          .filterDate(`${y}-01-01`, `${y}-12-31`)
          .select("precipitation")
          .sum()
          .set("year", y)
      );
      collection = ee.ImageCollection.fromImages(annuals);
      band = "precipitation";
      scale = 5000;
      reducer = "mean";
    } else {
      // NDVI annual means
      const years = Array.from({ length: 21 }, (_, i) => 2003 + i);
      const annuals = years.map((y) =>
        ee.ImageCollection("MODIS/061/MOD13A2")
          .filterDate(`${y}-01-01`, `${y}-12-31`)
          .select("NDVI")
          .mean()
          .multiply(0.0001)
          .set("year", y)
      );
      collection = ee.ImageCollection.fromImages(annuals);
      band = "NDVI";
      scale = 1000;
      reducer = "mean";
    }

    const result = await new Promise((resolve, reject) => {
      const reduced = collection.map((img: ReturnType<typeof ee.Image>) => {
        const val = img.reduceRegion({
          reducer: reducer === "mean" ? ee.Reducer.mean() : ee.Reducer.sum(),
          geometry: point,
          scale: scale,
        });
        return ee.Feature(null, {
          year: img.get("year"),
          value: val.get(band),
        });
      });

      ee.FeatureCollection(reduced).getInfo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data: any, err: string) => {
          if (err) reject(new Error(err));
          else resolve(data);
        }
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features = (result as any).features || [];
    const timeseries = features.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => ({
        year: f.properties.year,
        value: f.properties.value,
      })
    );

    return NextResponse.json({ timeseries, lat, lng, dataset });
  } catch (err) {
    console.error("Timeseries error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
