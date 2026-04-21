"use client";

import { useEffect, useState } from "react";

interface TimeSeriesData {
  year: number;
  value: number | null;
}

interface TimeSeriesChartProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

function MiniChart({
  data,
  color,
  label,
  unit,
}: {
  data: TimeSeriesData[];
  color: string;
  label: string;
  unit: string;
}) {
  const valid = data.filter((d) => d.value != null) as { year: number; value: number }[];
  if (valid.length === 0) return <p className="text-xs text-gray-500">No data</p>;

  const minVal = Math.min(...valid.map((d) => d.value));
  const maxVal = Math.max(...valid.map((d) => d.value));
  const range = maxVal - minVal || 1;
  const h = 80;
  const w = 240;
  const padding = 4;

  const points = valid.map((d, i) => {
    const x = padding + (i / (valid.length - 1)) * (w - padding * 2);
    const y = h - padding - ((d.value - minVal) / range) * (h - padding * 2);
    return `${x},${y}`;
  });

  // Trend line
  const n = valid.length;
  const sumX = valid.reduce((s, _, i) => s + i, 0);
  const sumY = valid.reduce((s, d) => s + d.value, 0);
  const sumXY = valid.reduce((s, d, i) => s + i * d.value, 0);
  const sumX2 = valid.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const trendStart = h - padding - ((intercept - minVal) / range) * (h - padding * 2);
  const trendEnd = h - padding - ((slope * (n - 1) + intercept - minVal) / range) * (h - padding * 2);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
        <span className="text-[10px] text-gray-500">
          {valid[valid.length - 1]?.value.toFixed(label === "NDVI" ? 3 : 0)} {unit}
          <span className={slope > 0 ? "text-green-400" : "text-red-400"}>
            {" "}({slope > 0 ? "+" : ""}{(slope * 10).toFixed(label === "NDVI" ? 3 : 0)}/decade)
          </span>
        </span>
      </div>
      <svg width={w} height={h} className="w-full">
        {/* Trend line */}
        <line
          x1={padding}
          y1={trendStart}
          x2={w - padding}
          y2={trendEnd}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="4,3"
          opacity={0.5}
        />
        {/* Data line */}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={Number(p.split(",")[0])}
            cy={Number(p.split(",")[1])}
            r={2}
            fill={color}
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{valid[0]?.year}</span>
        <span>{valid[valid.length - 1]?.year}</span>
      </div>
    </div>
  );
}

export default function TimeSeriesChart({ lat, lng, onClose }: TimeSeriesChartProps) {
  const [ndviData, setNdviData] = useState<TimeSeriesData[]>([]);
  const [rainData, setRainData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [ndviRes, rainRes] = await Promise.all([
          fetch("/api/ee-timeseries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, dataset: "ndvi" }),
          }),
          fetch("/api/ee-timeseries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, dataset: "rainfall" }),
          }),
        ]);
        const ndvi = await ndviRes.json();
        const rain = await rainRes.json();
        if (!cancelled) {
          setNdviData(ndvi.timeseries || []);
          setRainData(rain.timeseries || []);
        }
      } catch (err) {
        console.error("Timeseries fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [lat, lng]);

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 z-[1000] p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Time Series Analysis</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {lat.toFixed(3)}°, {lng.toFixed(3)}° — 2003-2023
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400 animate-pulse">Loading 20 years of data...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <MiniChart data={ndviData} color="#22c55e" label="NDVI" unit="" />
          <MiniChart data={rainData} color="#3b82f6" label="Rainfall" unit="mm" />
        </div>
      )}
    </div>
  );
}
