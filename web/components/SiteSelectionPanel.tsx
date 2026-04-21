"use client";

import { SiteSelectionCriteria, DEFAULT_CRITERIA } from "@/lib/site-selection";

interface SiteSelectionPanelProps {
  criteria: SiteSelectionCriteria;
  onChange: (criteria: SiteSelectionCriteria) => void;
  onSearch: () => void;
  loading: boolean;
  active: boolean;
}

export default function SiteSelectionPanel({
  criteria,
  onChange,
  onSearch,
  loading,
  active,
}: SiteSelectionPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Site Selection</h3>
        {active && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Active</span>
        )}
      </div>
      <p className="text-xs text-gray-400">
        Define criteria to find candidate sites for field trials or interventions.
      </p>

      {/* Climate Zone */}
      <div>
        <label className="text-xs text-gray-300">Climate Zone</label>
        <select
          value={criteria.climateZone}
          onChange={(e) => onChange({ ...criteria, climateZone: e.target.value as SiteSelectionCriteria["climateZone"] })}
          className="w-full mt-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
        >
          <option value="any">Any</option>
          <option value="arid">Arid (&lt;250mm)</option>
          <option value="semi-arid">Semi-arid (250-600mm)</option>
          <option value="sub-humid">Sub-humid (600-1200mm)</option>
          <option value="humid">Humid (&gt;1200mm)</option>
        </select>
      </div>

      {/* Rainfall Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-300">Min Rainfall (mm)</label>
          <input
            type="number"
            value={criteria.minRainfallMm}
            onChange={(e) => onChange({ ...criteria, minRainfallMm: Number(e.target.value) })}
            className="w-full mt-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
          />
        </div>
        <div>
          <label className="text-xs text-gray-300">Max Rainfall (mm)</label>
          <input
            type="number"
            value={criteria.maxRainfallMm}
            onChange={(e) => onChange({ ...criteria, maxRainfallMm: Number(e.target.value) })}
            className="w-full mt-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
          />
        </div>
      </div>

      {/* Cropland % */}
      <div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-300">Min Cropland Coverage</span>
          <span className="text-gray-500">{criteria.minCroplandPct}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={80}
          value={criteria.minCroplandPct}
          onChange={(e) => onChange({ ...criteria, minCroplandPct: Number(e.target.value) })}
          className="w-full h-1 accent-emerald-500"
        />
      </div>

      {/* Population */}
      <div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-300">Min Population Density</span>
          <span className="text-gray-500">{criteria.minPopDensity}/km²</span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          value={criteria.minPopDensity}
          onChange={(e) => onChange({ ...criteria, minPopDensity: Number(e.target.value) })}
          className="w-full h-1 accent-emerald-500"
        />
      </div>

      {/* NDVI Trend */}
      <div>
        <label className="text-xs text-gray-300">Vegetation Trend</label>
        <select
          value={criteria.ndviTrend}
          onChange={(e) => onChange({ ...criteria, ndviTrend: e.target.value as SiteSelectionCriteria["ndviTrend"] })}
          className="w-full mt-1 bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
        >
          <option value="any">Any</option>
          <option value="declining">Declining (degradation)</option>
          <option value="stable">Stable</option>
          <option value="improving">Improving</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSearch}
          disabled={loading}
          className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-medium transition"
        >
          {loading ? "Searching..." : active ? "Update Search" : "Find Sites"}
        </button>
        <button
          onClick={() => onChange(DEFAULT_CRITERIA)}
          className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
