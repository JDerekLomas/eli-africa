"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  onMapClick?: (lat: number, lng: number) => void;
}

// Client-side tile URL cache — preloaded on mount
const urlCache = new Map<string, string>();
let preloading = false;
let preloadPromise: Promise<void> | null = null;

function preloadAllTileUrls(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloading = true;
  preloadPromise = fetch("/api/ee-preload")
    .then((r) => r.json())
    .then((data) => {
      if (data.tiles) {
        Object.entries(data.tiles).forEach(([id, url]) => {
          urlCache.set(id, url as string);
        });
      }
      preloading = false;
    })
    .catch((err) => {
      console.error("Preload failed:", err);
      preloading = false;
    });
  return preloadPromise;
}

async function fetchTileUrl(layerId: string): Promise<string> {
  // Wait for preload if in progress
  if (preloading && preloadPromise) await preloadPromise;

  const cached = urlCache.get(layerId);
  if (cached) return cached;

  // Fallback: fetch individually
  const res = await fetch("/api/ee-tiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layerId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  urlCache.set(layerId, data.tileUrl);
  return data.tileUrl;
}

export default function EEMap({ activeLayers, layerOpacity, onMapClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<Record<string, L.TileLayer>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // Preload all tile URLs on mount
  useEffect(() => {
    preloadAllTileUrls();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [9.05, 7.49],
      zoom: 6,
      zoomControl: false,
      // Smoother zooming
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Base map without labels
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 18 }
    ).addTo(map);

    // Labels on top
    map.createPane("labels");
    map.getPane("labels")!.style.zIndex = "650";
    map.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, pane: "labels" }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const markerRef = { current: null as L.CircleMarker | null };
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 6, color: "#fff", fillColor: "#3b82f6", fillOpacity: 1, weight: 2,
      }).addTo(map);
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    setMapReady(true);

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Custom tile events (vulnerability, site-selection)
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, url, opacity } = (e as CustomEvent).detail;
      const map = mapRef.current;
      if (!map) return;
      if (tileLayersRef.current[id]) map.removeLayer(tileLayersRef.current[id]);
      const layer = L.tileLayer(url, { maxZoom: 18, opacity });
      layer.addTo(map);
      tileLayersRef.current[id] = layer;
    };
    window.addEventListener("custom-tile", handler);
    return () => window.removeEventListener("custom-tile", handler);
  }, [mapReady]);

  // Sync layers — toggles are instant because URLs are preloaded
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    Object.entries(activeLayers).forEach(([layerId, visible]) => {
      if (layerId === "vulnerability-index" || layerId === "site-selection") return;

      if (visible && !tileLayersRef.current[layerId]) {
        fetchTileUrl(layerId)
          .then((tileUrl) => {
            if (!mapRef.current || !activeLayers[layerId]) return;
            const layer = L.tileLayer(tileUrl, {
              maxZoom: 18,
              opacity: layerOpacity[layerId] ?? 0.8,
            });
            layer.addTo(map);
            tileLayersRef.current[layerId] = layer;
          })
          .catch((err) => console.error(`Layer ${layerId}:`, err));
      } else if (!visible && tileLayersRef.current[layerId]) {
        map.removeLayer(tileLayersRef.current[layerId]);
        delete tileLayersRef.current[layerId];
      }
    });
  }, [activeLayers, mapReady]);

  // Opacity
  useEffect(() => {
    Object.entries(layerOpacity).forEach(([layerId, opacity]) => {
      const layer = tileLayersRef.current[layerId];
      if (layer && typeof layer.setOpacity === "function") {
        layer.setOpacity(opacity);
      }
    });
  }, [layerOpacity]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
