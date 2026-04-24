import Link from "next/link";

const experiments = [
  {
    slug: "cocoa-detection",
    title: "Mapping Nigeria's Invisible Cocoa Farms",
    description:
      "Using Gemini and Sentinel-2 to extend cocoa detection from Ghana to Nigeria — where no ground-truth map exists.",
    status: "results" as const,
    stats: "100% control accuracy, 73% detection rate",
    date: "April 2026",
  },
  {
    slug: "cocoa-rf",
    title: "Replicating Cocoa Detection with Random Forest",
    description:
      "Replicated a published Sentinel-2 + GLCM + Random Forest method. 91% accuracy on Ghana validation. Applied to Nigeria.",
    status: "results" as const,
    stats: "91% accuracy, 21 features, SWIR bands most important",
    date: "April 2026",
  },
  {
    slug: null,
    title: "Crop Type Classification",
    description:
      "What's grown in each field? Classifying maize vs cassava vs yam from temporal satellite signatures.",
    status: "planned" as const,
    stats: null,
    date: "Coming soon",
  },
  {
    slug: null,
    title: "Seasonal Yield Estimation",
    description:
      "Which farms had good or bad harvests? Using NDVI anomalies against 20-year baselines.",
    status: "planned" as const,
    stats: null,
    date: "Coming soon",
  },
];

const STATUS_BADGE = {
  results: "bg-emerald-500/20 text-emerald-400",
  running: "bg-amber-500/20 text-amber-400",
  planned: "bg-gray-500/20 text-gray-400",
};

export default function ExperimentsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              &larr; Map Explorer
            </Link>
            <h1 className="text-xl font-bold mt-1">ELI Experiments</h1>
            <p className="text-sm text-gray-400">
              AI + satellite imagery experiments for Nigerian agriculture
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-6">
          {experiments.map((exp, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[exp.status]}`}
                    >
                      {exp.status}
                    </span>
                    <span className="text-xs text-gray-500">{exp.date}</span>
                  </div>
                  {exp.slug ? (
                    <Link
                      href={`/experiments/${exp.slug}`}
                      className="text-lg font-semibold hover:text-emerald-400 transition"
                    >
                      {exp.title}
                    </Link>
                  ) : (
                    <h2 className="text-lg font-semibold text-gray-300">
                      {exp.title}
                    </h2>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {exp.description}
                  </p>
                  {exp.stats && (
                    <p className="text-xs text-emerald-400 mt-2 font-mono">
                      {exp.stats}
                    </p>
                  )}
                </div>
                {exp.slug && (
                  <Link
                    href={`/experiments/${exp.slug}`}
                    className="text-sm text-gray-500 hover:text-white ml-4"
                  >
                    Read &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
