/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";
import fs from "fs";

interface AnalysisData {
  id: string;
  lat: number;
  lng: number;
  analysis: string;
  tileImage: string;
  contextImage: string | null;
  timestamp: string;
}

function loadAnalysis(id: string): AnalysisData | null {
  const dir = path.join(process.cwd(), "data", "analyses");
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = loadAnalysis(id);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              &larr; Map Explorer
            </Link>
            <h1 className="text-lg font-bold text-white mt-1">
              AI Land Use Analysis
            </h1>
          </div>
          <span className="text-xs text-gray-500">{data.timestamp}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-400">
            {data.lat.toFixed(4)}°N, {data.lng.toFixed(4)}°E
          </span>
          <a
            href={`https://www.google.com/maps/@${data.lat},${data.lng},17z`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Google Maps &rarr;
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <img
              src={data.tileImage}
              alt="High-res satellite"
              className="rounded-lg w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              0.6m resolution (~150m &times; 150m)
            </p>
          </div>
          {data.contextImage && (
            <div>
              <img
                src={data.contextImage}
                alt="Context view"
                className="rounded-lg w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                2.5m context (~600m &times; 600m)
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4">
            Gemini Analysis
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {data.analysis}
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-600 space-y-1">
          <p>
            Imagery: ESRI World Imagery | Analysis: Gemini 2.5 Flash |{" "}
            <a
              href="/experiments/cocoa-detection"
              className="text-gray-500 hover:text-gray-300"
            >
              Methodology
            </a>
          </p>
          <p>
            <a
              href={`/?lat=${data.lat}&lng=${data.lng}`}
              className="text-gray-500 hover:text-gray-300"
            >
              View on map &rarr;
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
