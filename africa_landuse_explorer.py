"""
Africa Agricultural Land Use Map Explorer
Uses Google Earth Engine + folium with authenticated tile URLs.
"""

import ee
import folium

# --- Initialize Earth Engine ---
credentials = ee.ServiceAccountCredentials(
    'earthengine@eli-africa-494008.iam.gserviceaccount.com',
    'sa-key.json'
)
ee.Initialize(credentials, project='gen-lang-client-0278315411')
print("Connected to Earth Engine")

# --- Define Africa boundary ---
africa = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017").filter(
    ee.Filter.eq("wld_rgn", "Africa")
)
africa_geom = africa.geometry()


def add_ee_layer(map_obj, ee_image, vis_params, name, shown=True):
    """Add an EE image as an authenticated tile layer to a folium map."""
    map_id_dict = ee.Image(ee_image).getMapId(vis_params)
    tile_url = map_id_dict['tile_fetcher'].url_format
    folium.TileLayer(
        tiles=tile_url,
        attr='Google Earth Engine',
        name=name,
        overlay=True,
        control=True,
        show=shown,
    ).add_to(map_obj)


# --- Build layers ---
print("Loading ESA WorldCover...")
worldcover = ee.Image("ESA/WorldCover/v200/2021").clip(africa_geom)
cropland_mask = worldcover.eq(40).selfMask()

print("Loading MODIS Land Cover...")
modis_lc = (
    ee.ImageCollection("MODIS/061/MCD12Q1")
    .filterDate("2022-01-01", "2022-12-31")
    .first()
    .select("LC_Type1")
    .clip(africa_geom)
)
modis_cropland = modis_lc.eq(12).Or(modis_lc.eq(14)).selfMask()

print("Loading NDVI...")
ndvi = (
    ee.ImageCollection("MODIS/061/MOD13A2")
    .filterDate("2023-01-01", "2023-12-31")
    .select("NDVI")
    .mean()
    .multiply(0.0001)
    .clip(africa_geom)
)

print("Loading GFSAD Cropland...")
gfsad = ee.Image("USGS/GFSAD1000_V1").clip(africa_geom)
gfsad_cropland = gfsad.lte(5).And(gfsad.gte(1)).selfMask()

# --- Build the map ---
print("Generating authenticated tile URLs...")
m = folium.Map(location=[0, 20], zoom_start=4, tiles='CartoDB positron')

add_ee_layer(m, cropland_mask,
    {"palette": ["#f5a623"], "min": 0, "max": 1},
    "ESA Cropland (10m)", shown=True)

add_ee_layer(m, modis_cropland,
    {"palette": ["#e74c3c"], "min": 0, "max": 1},
    "MODIS Cropland (500m)", shown=False)

add_ee_layer(m, ndvi,
    {"min": 0, "max": 0.8, "palette": ["#8B4513", "#FFFF00", "#006400"]},
    "NDVI 2023 (vegetation health)", shown=False)

add_ee_layer(m, gfsad_cropland,
    {"palette": ["#2ecc71"], "min": 0, "max": 1},
    "GFSAD Cropland (1km)", shown=False)

add_ee_layer(m, worldcover,
    {"bands": ["Map"], "min": 10, "max": 100},
    "ESA WorldCover 2021 (all classes)", shown=False)

# Layer control toggle
folium.LayerControl().add_to(m)

# --- Save ---
output_path = "africa_landuse_map.html"
m.save(output_path)
print(f"\nMap saved to: {output_path}")
print("Open in browser to explore layers.")
print("Note: tile URLs expire after a few hours. Re-run to refresh.")
