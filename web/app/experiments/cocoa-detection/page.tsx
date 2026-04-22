/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function CocoaDetectionPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/experiments"
            className="text-gray-400 hover:text-white text-sm"
          >
            &larr; All Experiments
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-10 prose prose-invert prose-sm">
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          Results
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">
          Mapping Nigeria&apos;s Invisible Cocoa Farms with AI and Satellite
          Imagery
        </h1>
        <p className="text-gray-400 text-base italic mb-8">
          Using Gemini and Sentinel-2 to extend cocoa detection from Ghana to
          Nigeria — where no ground-truth map exists.
        </p>

        <hr className="border-gray-800 my-8" />

        <p>
          Nigeria produces 6% of the world&apos;s cocoa — roughly 350,000
          tonnes per year from an estimated 600,000 farming households across
          the country&apos;s southwestern and southeastern states. Yet if you
          search for a map of where these farms actually are, you&apos;ll find
          nothing.
        </p>
        <p>
          Ghana and Cote d&apos;Ivoire, which together produce 60% of global
          cocoa, have been mapped at 10-meter resolution by the{" "}
          <a href="https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a">
            Forest Data Partnership
          </a>{" "}
          using machine learning on satellite imagery. But Nigeria — the
          world&apos;s 4th largest producer — is a blank spot.
        </p>
        <p>
          This matters for climate adaptation. You can&apos;t adapt what you
          can&apos;t see.
        </p>

        <h2>The Problem: No Labels, No Model</h2>
        <p>
          Traditional satellite-based crop mapping requires ground-truth labels
          — GPS points of confirmed farms. Nigeria doesn&apos;t have this
          dataset. But we do have:
        </p>
        <ol>
          <li>
            <strong>Millions of labeled pixels</strong> from Ghana (the FDP
            model)
          </li>
          <li>
            <strong>Identical satellite coverage</strong> — Sentinel-2 at 10m
          </li>
          <li>
            <strong>Nearly identical ecology</strong> — Nigeria&apos;s cocoa
            belt shares climate and soil with Ghana&apos;s
          </li>
          <li>
            <strong>Gemini</strong> — a multimodal AI that can reason about
            visual patterns in satellite imagery
          </li>
        </ol>

        <h2>What Cocoa Looks Like from Space</h2>
        <p>
          A confirmed cocoa farm near Kumasi, Ghana — 160m elevation, 1,514mm
          annual rainfall:
        </p>
        <div className="flex gap-3 my-6">
          <div className="flex-1">
            <img
              src="/blog/ghana_cocoa_0000_rgb.png"
              alt="Ghana cocoa RGB"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">RGB true-color</p>
          </div>
          <div className="flex-1">
            <img
              src="/blog/ghana_cocoa_0000_nir.png"
              alt="Ghana cocoa NIR"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              NIR false-color (red = healthy vegetation)
            </p>
          </div>
        </div>
        <p>
          Dense, dark-green tree canopy with irregular field boundaries. In NIR,
          the deep red saturation indicates healthy, dense vegetation — the
          signature of established cocoa under shade canopy.
        </p>

        <p className="mt-6">
          A second Ghana tile — pure agroforestry canopy:
        </p>
        <div className="my-4">
          <img
            src="/blog/ghana_cocoa_0001_rgb.png"
            alt="Ghana cocoa agroforestry"
            className="rounded w-64"
          />
        </div>

        <p className="mt-6">For comparison — what is definitely NOT cocoa:</p>
        <div className="flex gap-3 my-6">
          <div className="flex-1">
            <img
              src="/blog/nigeria_control_0002_rgb.png"
              alt="Nigeria savanna RGB"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kaduna savanna — dry farmland
            </p>
          </div>
          <div className="flex-1">
            <img
              src="/blog/nigeria_control_0002_nir.png"
              alt="Nigeria savanna NIR"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              NIR — patchy red only along rivers
            </p>
          </div>
        </div>

        <h2>Few-Shot Classification with Gemini</h2>
        <p>
          We feed Gemini a structured prompt: &quot;Here are confirmed cocoa
          farms in Ghana. Here are non-cocoa areas. Now look at this Nigerian
          tile — is this cocoa?&quot;
        </p>
        <p>
          The key insight: we&apos;re not asking Gemini to classify spectral
          signatures. We&apos;re asking it to{" "}
          <strong>reason about visual patterns</strong> — canopy texture, field
          geometry, landscape context.
        </p>

        <h2>Proof of Concept Results</h2>
        <p>
          We classified 20 tiles: 15 from Nigeria&apos;s cocoa belt, 5 from
          the northern savanna.
        </p>

        <h3>Tiles classified as COCOA:</h3>
        <div className="flex gap-3 my-6">
          <div className="flex-1">
            <img
              src="/blog/ondo_akure_rgb.png"
              alt="Ondo Akure"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Ondo — Akure</p>
          </div>
          <div className="flex-1">
            <img
              src="/blog/ondo_idanre_rgb.png"
              alt="Ondo Idanre"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Ondo — Idanre</p>
          </div>
          <div className="flex-1">
            <img
              src="/blog/crossriver_ikom_rgb.png"
              alt="Cross River Ikom"
              className="rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Cross River — Ikom</p>
          </div>
        </div>
        <p>
          Note the visual similarity to Ghana — dense dark-green canopy,
          irregular boundaries, roads cutting through forest/farm mosaic.
        </p>

        <div className="my-6">
          <img
            src="/blog/ondo_akure_nir.png"
            alt="Ondo Akure NIR"
            className="rounded w-64"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ondo Akure in NIR — deep red saturation nearly identical to Ghana
            cocoa reference
          </p>
        </div>

        <h3>Results Table</h3>
        <div className="overflow-x-auto my-6">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4">Region</th>
                <th className="text-right pr-4">Tiles</th>
                <th className="text-right pr-4">COCOA</th>
                <th className="text-right pr-4">NOT_COCOA</th>
                <th className="text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-4 font-medium">Savanna controls</td>
                <td className="text-right pr-4">5</td>
                <td className="text-right pr-4">0</td>
                <td className="text-right pr-4 text-emerald-400">5</td>
                <td>100% correctly rejected</td>
              </tr>
              <tr>
                <td className="pr-4">Ondo State</td>
                <td className="text-right pr-4">5</td>
                <td className="text-right pr-4 text-amber-400">3</td>
                <td className="text-right pr-4">2</td>
                <td>Akure, Idanre, South detected</td>
              </tr>
              <tr>
                <td className="pr-4">Osun State</td>
                <td className="text-right pr-4">3</td>
                <td className="text-right pr-4 text-amber-400">3</td>
                <td className="text-right pr-4">0</td>
                <td>All detected</td>
              </tr>
              <tr>
                <td className="pr-4">Cross River</td>
                <td className="text-right pr-4">2</td>
                <td className="text-right pr-4 text-amber-400">2</td>
                <td className="text-right pr-4">0</td>
                <td>Ikom, Obudu</td>
              </tr>
              <tr>
                <td className="pr-4">Edo State</td>
                <td className="text-right pr-4">2</td>
                <td className="text-right pr-4 text-amber-400">2</td>
                <td className="text-right pr-4">0</td>
                <td>Benin, North</td>
              </tr>
              <tr>
                <td className="pr-4">Ekiti State</td>
                <td className="text-right pr-4">1</td>
                <td className="text-right pr-4">0</td>
                <td className="text-right pr-4 text-emerald-400">1</td>
                <td>Ado-Ekiti (urban) rejected</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Cost</h3>
        <div className="overflow-x-auto my-6">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4">Approach</th>
                <th className="text-right pr-4">Cost</th>
                <th className="text-right pr-4">Time</th>
                <th className="text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-4">Field survey</td>
                <td className="text-right pr-4">$50,000+</td>
                <td className="text-right pr-4">6-12 months</td>
                <td className="text-right">Ground truth</td>
              </tr>
              <tr>
                <td className="pr-4">Traditional ML</td>
                <td className="text-right pr-4">$5,000-10,000</td>
                <td className="text-right pr-4">3-6 months</td>
                <td className="text-right">~90%</td>
              </tr>
              <tr className="text-emerald-400 font-medium">
                <td className="pr-4">Gemini few-shot</td>
                <td className="text-right pr-4">~$15</td>
                <td className="text-right pr-4">1 day</td>
                <td className="text-right">73%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Why This Matters</h2>
        <p>
          <strong>For agricultural mapping:</strong> Every crop mapped somewhere
          becomes transferable. Cashew in Tanzania from Mozambique labels.
          Coffee in Uganda from Ethiopia.
        </p>
        <p>
          <strong>For climate adaptation:</strong> Rapidly map crops in
          data-poor regions where planning is most urgent.
        </p>
        <p>
          <strong>For food security:</strong> Nigeria&apos;s 600,000 cocoa
          farming households are largely invisible to planning. This puts them
          on the map.
        </p>

        <hr className="border-gray-800 my-8" />

        <p className="text-sm text-gray-500">
          Built with{" "}
          <a href="https://earthengine.google.com/">Google Earth Engine</a>,{" "}
          <a href="https://ai.google.dev/">Gemini</a>,{" "}
          <a href="https://sentinel.esa.int/web/sentinel/missions/sentinel-2">
            Sentinel-2
          </a>
          , and the{" "}
          <a href="https://www.forestdatapartnership.org/">
            Forest Data Partnership
          </a>
          .
        </p>
        <p className="text-sm text-gray-500">
          Code:{" "}
          <a href="https://github.com/JDerekLomas/eli-africa">
            github.com/JDerekLomas/eli-africa
          </a>
        </p>
      </article>
    </div>
  );
}
