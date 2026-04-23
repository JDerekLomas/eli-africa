"use client";

import { useState } from "react";

/* eslint-disable @next/next/no-img-element */

interface AnalysisResult {
  analysis: string;
  tileImage: string;
  contextImage: string | null;
  lat: number;
  lng: number;
  permalink?: string;
}

interface AnalysisPanelProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function AnalysisPanel({ lat, lng, onClose }: AnalysisPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[420px] bg-gray-950/95 backdrop-blur-sm border-l border-gray-800 z-[1000] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Land Use Analysis</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">×</button>
      </div>

      <div className="p-4">
        {/* Pre-analysis state */}
        {!result && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Fetches 0.6m satellite imagery at this location and asks Gemini to analyze land use, crop type, and vegetation patterns.
            </p>
            <button
              onClick={runAnalysis}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition"
            >
              Analyze This Location
            </button>
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Fetching satellite imagery...</p>
            <p className="text-xs text-gray-600">Analyzing with Gemini (~10s)</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Images */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <img src={result.tileImage} alt="High-res tile" className="rounded w-full" />
                <p className="text-[10px] text-gray-600 mt-1">0.6m detail</p>
              </div>
              {result.contextImage && (
                <div>
                  <img src={result.contextImage} alt="Context" className="rounded w-full" />
                  <p className="text-[10px] text-gray-600 mt-1">2.5m context</p>
                </div>
              )}
            </div>

            {/* Analysis text */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Gemini Analysis</h4>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {result.analysis}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {result.permalink && (
                <a
                  href={result.permalink}
                  target="_blank"
                  className="flex-1 py-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm text-center transition"
                >
                  Share Link
                </a>
              )}
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition"
              >
                Re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
