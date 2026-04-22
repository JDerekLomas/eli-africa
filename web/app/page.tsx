"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import LayerPanel from "@/components/LayerPanel";
import VulnerabilityPanel from "@/components/VulnerabilityPanel";
import SiteSelectionPanel from "@/components/SiteSelectionPanel";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import { LAYERS } from "@/lib/layers";
import { DEFAULT_WEIGHTS, VulnerabilityWeights } from "@/lib/vulnerability";
import { DEFAULT_CRITERIA, SiteSelectionCriteria } from "@/lib/site-selection";

const EEMap = dynamic(() => import("@/components/Map").then(m => ({ default: m.default })), { ssr: false });

type Tab = "layers" | "vulnerability" | "sites";

export default function Home() {
  const [tab, setTab] = useState<Tab>("layers");

  // Layer state
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultVisible]))
  );
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>(
    () => Object.fromEntries(LAYERS.map((l) => [l.id, 0.8]))
  );
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());

  // Vulnerability state
  const [weights, setWeights] = useState<VulnerabilityWeights>(DEFAULT_WEIGHTS);
  const [vulnActive, setVulnActive] = useState(false);
  const [vulnLoading, setVulnLoading] = useState(false);

  // Site selection state
  const [criteria, setCriteria] = useState<SiteSelectionCriteria>(DEFAULT_CRITERIA);
  const [sitesActive, setSitesActive] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);

  // Time series state
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);

  const handleToggle = useCallback((id: string) => {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
    setLoadingLayers((prev) => {
      const next = new Set(prev);
      next.add(id);
      setTimeout(() => {
        setLoadingLayers((p) => {
          const n = new Set(p);
          n.delete(id);
          return n;
        });
      }, 8000);
      return next;
    });
  }, []);

  const handleOpacity = useCallback((id: string, val: number) => {
    setLayerOpacity((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleComputeVulnerability = useCallback(async () => {
    setVulnLoading(true);
    try {
      const res = await fetch("/api/ee-tiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layerId: "vulnerability-index", weights }),
      });
      const data = await res.json();
      if (data.tileUrl) {
        setActiveLayers((prev) => ({ ...prev, "vulnerability-index": true }));
        setLayerOpacity((prev) => ({ ...prev, "vulnerability-index": 0.7 }));
        window.dispatchEvent(new CustomEvent("custom-tile", {
          detail: { id: "vulnerability-index", url: data.tileUrl, opacity: 0.7 },
        }));
        setVulnActive(true);
      }
    } catch (err) {
      console.error("Vulnerability compute error:", err);
    } finally {
      setVulnLoading(false);
    }
  }, [weights]);

  const handleSiteSearch = useCallback(async () => {
    setSitesLoading(true);
    try {
      const res = await fetch("/api/ee-tiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layerId: "site-selection", criteria }),
      });
      const data = await res.json();
      if (data.tileUrl) {
        setActiveLayers((prev) => ({ ...prev, "site-selection": true }));
        window.dispatchEvent(new CustomEvent("custom-tile", {
          detail: { id: "site-selection", url: data.tileUrl, opacity: 0.8 },
        }));
        setSitesActive(true);
      }
    } catch (err) {
      console.error("Site selection error:", err);
    } finally {
      setSitesLoading(false);
    }
  }, [criteria]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPoint({ lat, lng });
  }, []);

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {/* Sidebar */}
      <div className="absolute top-0 left-0 bottom-0 w-80 bg-gray-900/90 backdrop-blur-sm text-white overflow-y-auto z-[1000] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-lg font-bold leading-tight">
            Nigeria Agricultural Land Use
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Food Security & Climate Adaptation Explorer
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-700">
          {([
            { id: "layers" as Tab, label: "Layers" },
            { id: "vulnerability" as Tab, label: "Vulnerability" },
            { id: "sites" as Tab, label: "Site Selection" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition ${
                tab === t.id
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "layers" && (
            <LayerPanel
              activeLayers={activeLayers}
              layerOpacity={layerOpacity}
              onToggle={handleToggle}
              onOpacity={handleOpacity}
              loadingLayers={loadingLayers}
            />
          )}
          {tab === "vulnerability" && (
            <VulnerabilityPanel
              weights={weights}
              onChange={setWeights}
              onCompute={handleComputeVulnerability}
              loading={vulnLoading}
              active={vulnActive}
            />
          )}
          {tab === "sites" && (
            <SiteSelectionPanel
              criteria={criteria}
              onChange={setCriteria}
              onSearch={handleSiteSearch}
              loading={sitesLoading}
              active={sitesActive}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <p className="text-[10px] text-gray-500">
            Click anywhere on the map for 20-year time series analysis
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Data: ESA, MODIS, CHIRPS, ERA5, WorldPop, USGS via Google Earth Engine
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 ml-80">
        <EEMap
          activeLayers={activeLayers}
          layerOpacity={layerOpacity}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Time series popup */}
      {selectedPoint && (
        <TimeSeriesChart
          lat={selectedPoint.lat}
          lng={selectedPoint.lng}
          onClose={() => setSelectedPoint(null)}
        />
      )}
    </main>
  );
}
