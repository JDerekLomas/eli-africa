export interface SiteSelectionCriteria {
  climateZone: "arid" | "semi-arid" | "sub-humid" | "humid" | "any";
  minCroplandPct: number;      // 0-100
  maxRainfallMm: number;       // annual max
  minRainfallMm: number;       // annual min
  minPopDensity: number;       // people per km2
  ndviTrend: "declining" | "stable" | "improving" | "any";
}

export const DEFAULT_CRITERIA: SiteSelectionCriteria = {
  climateZone: "semi-arid",
  minCroplandPct: 20,
  maxRainfallMm: 800,
  minRainfallMm: 200,
  minPopDensity: 50,
  ndviTrend: "declining",
};

// Rainfall thresholds for climate zones (annual mm)
const CLIMATE_ZONES = {
  arid: { min: 0, max: 250 },
  "semi-arid": { min: 250, max: 600 },
  "sub-humid": { min: 600, max: 1200 },
  humid: { min: 1200, max: 5000 },
  any: { min: 0, max: 5000 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSiteSelectionImage(ee: any, criteria: SiteSelectionCriteria, africaGeom: any) {
  // Annual rainfall
  const annualRain = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2023-01-01", "2023-12-31")
    .select("precipitation")
    .sum()
    .clip(africaGeom);

  // Cropland fraction at ~10km
  const cropland = ee.Image("ESA/WorldCover/v200/2021").eq(40).clip(africaGeom);
  const cropFraction = cropland
    .reduceResolution(ee.Reducer.mean(), false, 1024)
    .reproject({ crs: "EPSG:4326", scale: 10000 })
    .multiply(100); // convert to %

  // Population
  const pop = ee.ImageCollection("WorldPop/GP/100m/pop/2020")
    .mosaic()
    .clip(africaGeom);

  // NDVI trend
  const ndviEarly = ee.ImageCollection("MODIS/061/MOD13A2")
    .filterDate("2003-01-01", "2007-12-31")
    .select("NDVI").mean().multiply(0.0001).clip(africaGeom);
  const ndviLate = ee.ImageCollection("MODIS/061/MOD13A2")
    .filterDate("2019-01-01", "2023-12-31")
    .select("NDVI").mean().multiply(0.0001).clip(africaGeom);
  const ndviChange = ndviLate.subtract(ndviEarly);

  // Build mask from criteria
  let mask = ee.Image(1);

  // Climate zone / rainfall range
  const zone = CLIMATE_ZONES[criteria.climateZone];
  mask = mask
    .and(annualRain.gte(Math.max(zone.min, criteria.minRainfallMm)))
    .and(annualRain.lte(Math.min(zone.max, criteria.maxRainfallMm)));

  // Cropland percentage
  mask = mask.and(cropFraction.gte(criteria.minCroplandPct));

  // Population density
  mask = mask.and(pop.gte(criteria.minPopDensity));

  // NDVI trend
  if (criteria.ndviTrend === "declining") {
    mask = mask.and(ndviChange.lt(-0.02));
  } else if (criteria.ndviTrend === "improving") {
    mask = mask.and(ndviChange.gt(0.02));
  } else if (criteria.ndviTrend === "stable") {
    mask = mask.and(ndviChange.gte(-0.02)).and(ndviChange.lte(0.02));
  }

  return {
    image: mask.selfMask(),
    visParams: {
      min: 0,
      max: 1,
      palette: ["#00ff88"],
    },
  };
}
