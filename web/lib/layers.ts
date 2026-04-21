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
  {
    id: "oil-palm",
    name: "Oil Palm Plantations",
    description: "BIOPAMA 10m — industrial & smallholder oil palm (2019)",
    palette: ["#ff9900", "#cc6600"],
    min: 1,
    max: 2,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "maize",
    name: "Maize (WorldCereal)",
    description: "ESA WorldCereal 2021 — 10m global maize detection",
    palette: ["#FFD700"],
    min: 0,
    max: 100,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "cereals",
    name: "Cereals (WorldCereal)",
    description: "ESA WorldCereal 2021 — 10m winter & spring cereals",
    palette: ["#DAA520"],
    min: 0,
    max: 100,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "cassava-suitability",
    name: "Cassava Suitability",
    description: "CropSuite — climate suitability for cassava in Africa (~1km)",
    palette: ["#f7fcb1", "#addd8e", "#31a354"],
    min: 0,
    max: 100,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "maize-suitability",
    name: "Maize Suitability",
    description: "CropSuite — climate suitability for maize in Africa (~1km)",
    palette: ["#ffffd4", "#fed98e", "#fe9929"],
    min: 0,
    max: 100,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "rice-suitability",
    name: "Rice Suitability",
    description: "CropSuite — climate suitability for rice in Africa (~1km)",
    palette: ["#f0f9e8", "#7bccc4", "#0868ac"],
    min: 0,
    max: 100,
    defaultVisible: false,
    category: "agriculture",
  },
  {
    id: "cocoa",
    name: "Cocoa Farms",
    description: "FDP 10m cocoa map + Nigeria suitability estimate",
    palette: ["#ffffcc", "#d9a066", "#8B4513"],
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
      const popLog = pop.max(1).log10();
      return { image: popLog.selfMask(), visParams: { palette: ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"], min: 0, max: 3 } };
    }
    case "gfsad-cropland": {
      const gfsad = ee.Image("USGS/GFSAD1000_V1");
      return { image: gfsad.lte(5).and(gfsad.gte(1)).selfMask(), visParams: { palette: ["#2ecc71"], min: 0, max: 1 } };
    }
    case "maize": {
      const maize = ee.ImageCollection("ESA/WorldCereal/2021/MODELS/v100")
        .filter(ee.Filter.eq("product", "maize"))
        .select("classification")
        .mosaic();
      return { image: maize.eq(100).selfMask(), visParams: { palette: ["#FFD700"], min: 0, max: 1 } };
    }
    case "cereals": {
      const winter = ee.ImageCollection("ESA/WorldCereal/2021/MODELS/v100")
        .filter(ee.Filter.eq("product", "wintercereals"))
        .select("classification")
        .mosaic();
      const spring = ee.ImageCollection("ESA/WorldCereal/2021/MODELS/v100")
        .filter(ee.Filter.eq("product", "springcereals"))
        .select("classification")
        .mosaic();
      const cereals = winter.eq(100).or(spring.eq(100)).selfMask();
      return { image: cereals, visParams: { palette: ["#DAA520"], min: 0, max: 1 } };
    }
    case "cassava-suitability": {
      const cassava = ee.ImageCollection("projects/sat-io/open-datasets/CROP_SUITE/crop_suitability")
        .filter(ee.Filter.eq("scenario", "historical_1991-2010_rf_var"))
        .first()
        .select("cassava");
      return { image: cassava.selfMask(), visParams: { palette: ["#f7fcb1", "#addd8e", "#31a354"], min: 0, max: 100 } };
    }
    case "maize-suitability": {
      const maizeSuit = ee.ImageCollection("projects/sat-io/open-datasets/CROP_SUITE/crop_suitability")
        .filter(ee.Filter.eq("scenario", "historical_1991-2010_rf_var"))
        .first()
        .select("maize");
      return { image: maizeSuit.selfMask(), visParams: { palette: ["#ffffd4", "#fed98e", "#fe9929"], min: 0, max: 100 } };
    }
    case "rice-suitability": {
      const riceSuit = ee.ImageCollection("projects/sat-io/open-datasets/CROP_SUITE/crop_suitability")
        .filter(ee.Filter.eq("scenario", "historical_1991-2010_rf_var"))
        .first()
        .select("rice");
      return { image: riceSuit.selfMask(), visParams: { palette: ["#f0f9e8", "#7bccc4", "#0868ac"], min: 0, max: 100 } };
    }
    case "oil-palm": {
      const palm = ee.ImageCollection("BIOPAMA/GlobalOilPalm/v1")
        .select("classification")
        .mosaic();
      // 1 = industrial, 2 = smallholder, 3 = other land
      return { image: palm.lte(2).selfMask(), visParams: { palette: ["#ff9900", "#cc6600"], min: 1, max: 2 } };
    }
    case "cocoa": {
      const cocoa = ee.ImageCollection("projects/forestdatapartnership/assets/cocoa/model_2025a")
        .mosaic();
      // Also create a Nigeria cocoa suitability estimate
      // Cocoa needs: 1200-3000mm rain, 21-32C, elevation <600m, high NDVI (tree cover)
      const nigeria = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
        .filter(ee.Filter.eq("country_na", "Nigeria"));
      const nigeriaGeom = nigeria.geometry();

      const rain = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate("2023-01-01", "2023-12-31").select("precipitation").sum();
      const rainSuitable = rain.gte(1200).and(rain.lte(3000));

      const ndvi = ee.ImageCollection("MODIS/061/MOD13A2")
        .filterDate("2023-01-01", "2023-12-31").select("NDVI").mean().multiply(0.0001);
      const ndviSuitable = ndvi.gte(0.4); // tree/forest cover

      const elev = ee.Image("USGS/SRTMGL1_003");
      const elevSuitable = elev.lte(600);

      const nigeriaCocoa = rainSuitable.and(ndviSuitable).and(elevSuitable)
        .clip(nigeriaGeom).selfMask();

      // Merge: FDP cocoa + Nigeria suitability estimate
      const combined = ee.ImageCollection([cocoa.selfMask(), nigeriaCocoa]).mosaic();
      return { image: combined, visParams: { palette: ["#ffffcc", "#d9a066", "#8B4513"], min: 0.3, max: 1 } };
    }
    default:
      throw new Error(`Unknown layer: ${layerId}`);
  }
}
