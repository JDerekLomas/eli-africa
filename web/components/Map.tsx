"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  activeLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  onMapClick?: (lat: number, lng: number) => void;
}

// Client-side tile URL cache
const urlCache = new Map<string, string>();

async function fetchTileUrl(layerId: string): Promise<string> {
  const cached = urlCache.get(layerId);
  if (cached) return cached;

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

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [2, 20],
      zoom: 4,
      zoomControl: false,
    });

    // Base map without labels
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 18 }
    ).addTo(map);

    // Labels layer on top of everything (added to a high-z pane)
    map.createPane("labels");
    map.getPane("labels")!.style.zIndex = "650";
    map.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, pane: "labels" }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 6, color: "#fff", fillColor: "#3b82f6", fillOpacity: 1, weight: 2,
      }).addTo(map);
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    const markerRef = { current: null as L.CircleMarker | null };

    mapRef.current = map;
    setMapReady(true);

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Listen for custom tile events (vulnerability, site-selection)
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

  // Sync layers with activeLayers state
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    Object.entries(activeLayers).forEach(([layerId, visible]) => {
      if (layerId === "vulnerability-index" || layerId === "site-selection") return;

      if (visible && !tileLayersRef.current[layerId]) {
        // Fetch and add
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
  }, [activeLayers, mapReady]); // intentionally exclude layerOpacity to avoid re-fetching

  // Opacity updates
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
