"use client";

import { useState } from "react";
import Markdown from "react-markdown";

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
    <div className="absolute top-0 right-0 bottom-0 w-[520px] bg-gray-950/95 backdrop-blur-sm border-l border-gray-800 z-[1000] flex flex-col">
      {/* Header — fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Land Use Analysis</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none px-1">×</button>
      </div>

      {/* Pre-analysis state */}
      {!result && !loading && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            Fetches 0.6m satellite imagery at this location and asks Gemini to analyze land use, crop type, and vegetation patterns.
          </p>
          <button
            onClick={runAnalysis}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition"
          >
            Analyze This Location
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Fetching satellite imagery...</p>
            <p className="text-xs text-gray-600">Analyzing with Gemini (~10s)</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Images — compact, fixed at top */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <img src={result.tileImage} alt="High-res tile" className="rounded w-full aspect-square object-cover" />
                <p className="text-[10px] text-gray-600 mt-1">0.6m detail</p>
              </div>
              {result.contextImage && (
                <div className="flex-1">
                  <img src={result.contextImage} alt="Context" className="rounded w-full aspect-square object-cover" />
                  <p className="text-[10px] text-gray-600 mt-1">2.5m context</p>
                </div>
              )}
            </div>
          </div>

          {/* Analysis text — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Gemini Analysis</h4>
              <div className="text-sm text-gray-300 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_ol]:my-2 [&_p]:mb-2 [&_li]:text-gray-300">
                <Markdown>{result.analysis}</Markdown>
              </div>
            </div>
          </div>

          {/* Actions — fixed at bottom */}
          <div className="shrink-0 px-4 py-3 border-t border-gray-800 flex gap-2">
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
        </>
      )}
    </div>
  );
}
