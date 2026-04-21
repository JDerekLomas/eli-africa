export interface LayerDef {
  id: string;
  name: string;
  description: string;
  palette: string[];
  min: number;
  max: number;
  defaultVisible: boolean;
  category: "agriculture" | "climate" | "population";
}

export const LAYERS: LayerDef[] = [
  {
    id: "esa-cropland",
    name: "Cropland Extent",
    description: "ESA WorldCover 2021 — 10m resolution cropland",
    palette: ["#f5a623"],
    min: 0,
    max: 1,
    defaultVisible: true,
    category: "agriculture",
  },
  {
    id: "modis-cropland",
    name: "MODIS Cropland",
    description: "MODIS Land Cover — 500m cropland & crop/vegetation mosaics",
    palette: ["#e74c3c"],
    min: 0,
    max: 1,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "ndvi",
    name: "Vegetation Health (NDVI)",
    description: "MODIS NDVI 2023 mean — brown (stressed) to green (healthy)",
    palette: ["#8B4513", "#FFFF00", "#006400"],
    min: 0,
    max: 0.8,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "chirps-precip",
    name: "Annual Rainfall",
    description: "CHIRPS 2023 total precipitation (mm)",
    palette: ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],
    min: 0,
    max: 2000,
    defaultVisible: false,
    category: "climate",
  },
  {
    id: "population",
    name: "Population Density",
    description: "WorldPop 2020 — people per 1km grid cell",
    palette: ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
    min: 0,
    max: 1000,
    defaultVisible: false,
    category: "population",
  },
  {
    id: "gfsad-cropland",
    name: "GFSAD Cropland",
    description: "USGS Global Food Security — 1km cropland classification",
    palette: ["#2ecc71"],
    min: 0,
    max: 1,
    defaultVisible: false,
    category: "agriculture",
  },
];

// No clip — let EE render globally, much faster. Map is zoomed to Africa anyway.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEEImage(ee: any, layerId: string) {
  switch (layerId) {
    case "esa-cropland": {
      const wc = ee.Image("ESA/WorldCover/v200/2021");
      return { image: wc.eq(40).selfMask(), visParams: { palette: ["#f5a623"], min: 0, max: 1 } };
    }
    case "modis-cropland": {
      const modis = ee.ImageCollection("MODIS/061/MCD12Q1")
        .filterDate("2022-01-01", "2022-12-31")
        .first()
        .select("LC_Type1");
      return { image: modis.eq(12).or(modis.eq(14)).selfMask(), visParams: { palette: ["#e74c3c"], min: 0, max: 1 } };
    }
    case "ndvi": {
      const ndvi = ee.ImageCollection("MODIS/061/MOD13A2")
        .filterDate("2023-01-01", "2023-12-31")
        .select("NDVI")
        .mean()
        .multiply(0.0001);
      return { image: ndvi, visParams: { palette: ["#8B4513", "#FFFF00", "#006400"], min: 0, max: 0.8 } };
    }
    case "chirps-precip": {
      const chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate("2023-01-01", "2023-12-31")
        .select("precipitation")
        .sum();
      return { image: chirps, visParams: { palette: ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"], min: 0, max: 2000 } };
    }
    case "population": {
      const pop = ee.ImageCollection("WorldPop/GP/100m/pop/2020").mosaic();
      return { image: pop, visParams: { palette: ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"], min: 0, max: 1000 } };
    }
    case "gfsad-cropland": {
      const gfsad = ee.Image("USGS/GFSAD1000_V1");
      return { image: gfsad.lte(5).and(gfsad.gte(1)).selfMask(), visParams: { palette: ["#2ecc71"], min: 0, max: 1 } };
    }
    default:
      throw new Error(`Unknown layer: ${layerId}`);
  }
}
