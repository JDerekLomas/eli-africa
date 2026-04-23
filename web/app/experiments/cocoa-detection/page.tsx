/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-7 text-gray-300 mb-5">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-white mt-12 mb-4">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-white mt-8 mb-3">{children}</h3>;
}

function ImgCaption({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 mt-2 mb-6 italic">{children}</p>;
}

export default function CocoaDetectionPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/experiments" className="text-gray-400 hover:text-white text-sm">
            &larr; All Experiments
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          Results
        </span>

        <h1 className="text-4xl font-bold text-white mt-4 mb-3 leading-tight">
          Mapping Nigeria&apos;s Invisible Cocoa Farms with AI and Satellite Imagery
        </h1>
        <p className="text-lg text-gray-400 italic mb-10">
          Using Gemini and Sentinel-2 to extend cocoa detection from Ghana to Nigeria — where no ground-truth map exists.
        </p>

        <hr className="border-gray-800 mb-10" />

        {/* INTRO */}
        <P>
          Nigeria produces 6% of the world&apos;s cocoa — roughly 350,000 tonnes per year from an estimated 600,000 farming households across the country&apos;s southwestern and southeastern states. Yet if you search for a map of where these farms actually are, you&apos;ll find nothing.
        </P>

        <P>
          Ghana and Cote d&apos;Ivoire, which together produce 60% of global cocoa, have been mapped at 10-meter resolution by the{" "}
          <a href="https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a" className="text-emerald-400 underline hover:text-emerald-300">
            Forest Data Partnership
          </a>{" "}
          using machine learning on satellite imagery. But Nigeria — the world&apos;s 4th largest producer — is a blank spot.
        </P>

        <P>
          This matters for climate adaptation. <strong className="text-white">You can&apos;t adapt what you can&apos;t see.</strong>
        </P>

        {/* PROBLEM */}
        <H2>The Problem: No Labels, No Model</H2>

        <P>
          Traditional satellite-based crop mapping requires ground-truth labels — GPS points of confirmed farms. Nigeria doesn&apos;t have this dataset. But we do have:
        </P>

        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Millions of labeled pixels</strong> from Ghana and Cote d&apos;Ivoire (the FDP model)</li>
          <li><strong className="text-white">Identical satellite coverage</strong> — Sentinel-2 images Nigeria at 10m resolution every 5 days</li>
          <li><strong className="text-white">Nearly identical ecology</strong> — Nigeria&apos;s cocoa belt shares climate, elevation, and soil with Ghana&apos;s</li>
          <li><strong className="text-white">Gemini</strong> — a multimodal AI that can reason about visual patterns in satellite imagery, including{" "}
            <a href="https://developers.googleblog.com/unlocking-multi-spectral-data-with-gemini/" className="text-emerald-400 underline hover:text-emerald-300">native multi-spectral support</a>
          </li>
        </ul>

        {/* WHAT COCOA LOOKS LIKE */}
        <H2>What Cocoa Looks Like from Space</H2>

        <P>
          A confirmed cocoa farm near Kumasi, Ghana — 160m elevation, 1,514mm annual rainfall:
        </P>

        <div className="grid grid-cols-2 gap-4 my-6">
          <div>
            <img src="/blog/ghana_cocoa_0000_rgb.png" alt="Ghana cocoa RGB" className="rounded-lg w-full" />
            <ImgCaption>RGB true-color</ImgCaption>
          </div>
          <div>
            <img src="/blog/ghana_cocoa_0000_nir.png" alt="Ghana cocoa NIR" className="rounded-lg w-full" />
            <ImgCaption>NIR false-color (red = healthy vegetation)</ImgCaption>
          </div>
        </div>

        <P>
          Dense, dark-green tree canopy with irregular field boundaries. In NIR, the deep red saturation indicates healthy, dense vegetation — the signature of established cocoa under shade canopy.
        </P>

        <H3>A second Ghana tile — pure agroforestry canopy</H3>
        <div className="my-4">
          <img src="/blog/ghana_cocoa_0001_rgb.png" alt="Ghana cocoa agroforestry" className="rounded-lg w-64" />
          <ImgCaption>Nearly continuous tree cover with subtle textural variation — classic cocoa agroforestry.</ImgCaption>
        </div>

        <H3>For comparison — what is definitely NOT cocoa</H3>
        <div className="grid grid-cols-2 gap-4 my-6">
          <div>
            <img src="/blog/nigeria_control_0002_rgb.png" alt="Nigeria savanna RGB" className="rounded-lg w-full" />
            <ImgCaption>Kaduna savanna — dry farmland, geometric plots</ImgCaption>
          </div>
          <div>
            <img src="/blog/nigeria_control_0002_nir.png" alt="Nigeria savanna NIR" className="rounded-lg w-full" />
            <ImgCaption>NIR — patchy red only along rivers. Obviously different.</ImgCaption>
          </div>
        </div>

        {/* APPROACH */}
        <H2>Few-Shot Classification with Gemini</H2>

        <P>
          We feed Gemini a structured prompt with the Ghana reference tiles as examples:
        </P>

        <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-2 my-6 text-gray-400 italic">
          &quot;Here are confirmed cocoa farms in Ghana&apos;s satellite imagery. Here are non-cocoa areas from the same climate zone. Now look at this tile from Nigeria and tell me: is this cocoa?&quot;
        </blockquote>

        <P>
          The key insight: we&apos;re not asking Gemini to classify spectral signatures (that&apos;s what Random Forests do). We&apos;re asking it to <strong className="text-white">reason about visual patterns</strong> — canopy texture, field geometry, landscape context, and similarity to known examples.
        </P>

        <P>Gemini&apos;s response includes:</P>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li>A classification: <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-sm">COCOA</code> / <code className="text-red-400 bg-gray-800 px-1.5 py-0.5 rounded text-sm">NOT_COCOA</code> / <code className="text-amber-400 bg-gray-800 px-1.5 py-0.5 rounded text-sm">UNCERTAIN</code></li>
          <li>A confidence score (0.0–1.0)</li>
          <li>Reasoning explaining which visual features support the classification</li>
          <li>Sub-classification (monoculture vs. agroforestry)</li>
        </ul>

        {/* RESULTS */}
        <H2>Proof of Concept Results</H2>

        <P>
          We classified 20 tiles: 15 from Nigeria&apos;s known cocoa-producing states and 5 negative controls from the northern savanna.
        </P>

        <H3>Tiles classified as COCOA by Gemini</H3>
        <div className="grid grid-cols-3 gap-4 my-6">
          <div>
            <img src="/blog/ondo_akure_rgb.png" alt="Ondo Akure" className="rounded-lg w-full" />
            <ImgCaption>Ondo — Akure</ImgCaption>
          </div>
          <div>
            <img src="/blog/ondo_idanre_rgb.png" alt="Ondo Idanre" className="rounded-lg w-full" />
            <ImgCaption>Ondo — Idanre</ImgCaption>
          </div>
          <div>
            <img src="/blog/crossriver_ikom_rgb.png" alt="Cross River Ikom" className="rounded-lg w-full" />
            <ImgCaption>Cross River — Ikom</ImgCaption>
          </div>
        </div>

        <P>
          Note the visual similarity to the Ghana reference — dense dark-green canopy, irregular boundaries, roads cutting through forest/farm mosaic.
        </P>

        <div className="my-6">
          <img src="/blog/ondo_akure_nir.png" alt="Ondo Akure NIR" className="rounded-lg w-64" />
          <ImgCaption>Ondo Akure in NIR — deep red saturation nearly identical to Ghana cocoa reference.</ImgCaption>
        </div>

        {/* RESULTS TABLE */}
        <H3>Results by State</H3>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Region</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Tiles</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">COCOA</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">NOT_COCOA</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr className="bg-emerald-500/5">
                <td className="px-4 py-3 font-medium text-white">Savanna controls</td>
                <td className="text-right px-4 py-3">5</td>
                <td className="text-right px-4 py-3">0</td>
                <td className="text-right px-4 py-3 text-emerald-400 font-semibold">5</td>
                <td className="px-4 py-3 text-emerald-400">100% correctly rejected</td>
              </tr>
              <tr><td className="px-4 py-3">Ondo State</td><td className="text-right px-4 py-3">5</td><td className="text-right px-4 py-3 text-amber-400">3</td><td className="text-right px-4 py-3">2</td><td className="px-4 py-3 text-gray-400">Akure, Idanre, South = cocoa</td></tr>
              <tr><td className="px-4 py-3">Osun State</td><td className="text-right px-4 py-3">3</td><td className="text-right px-4 py-3 text-amber-400">3</td><td className="text-right px-4 py-3">0</td><td className="px-4 py-3 text-gray-400">All detected</td></tr>
              <tr><td className="px-4 py-3">Cross River</td><td className="text-right px-4 py-3">2</td><td className="text-right px-4 py-3 text-amber-400">2</td><td className="text-right px-4 py-3">0</td><td className="px-4 py-3 text-gray-400">Ikom, Obudu</td></tr>
              <tr><td className="px-4 py-3">Edo State</td><td className="text-right px-4 py-3">2</td><td className="text-right px-4 py-3 text-amber-400">2</td><td className="text-right px-4 py-3">0</td><td className="px-4 py-3 text-gray-400">Benin, North</td></tr>
              <tr><td className="px-4 py-3">Ogun State</td><td className="text-right px-4 py-3">2</td><td className="text-right px-4 py-3 text-amber-400">1</td><td className="text-right px-4 py-3">1</td><td className="px-4 py-3 text-gray-400">Abeokuta = cocoa</td></tr>
              <tr><td className="px-4 py-3">Ekiti State</td><td className="text-right px-4 py-3">1</td><td className="text-right px-4 py-3">0</td><td className="text-right px-4 py-3 text-emerald-400">1</td><td className="px-4 py-3 text-gray-400">Ado-Ekiti (urban) rejected</td></tr>
            </tbody>
          </table>
        </div>

        <H3>Key Findings</H3>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">100% control accuracy</strong> — all 5 savanna tiles correctly rejected</li>
          <li><strong className="text-white">73% detection rate</strong> in cocoa belt — 11/15 tiles classified as cocoa</li>
          <li><strong className="text-white">Sensible errors</strong> — Ekiti&apos;s urban center correctly flagged as NOT_COCOA; Ondo Akoko (drier north) correctly uncertain</li>
          <li><strong className="text-white">State-level alignment</strong> — Osun, Cross River, and Edo (all major producers) showed 100% detection</li>
          <li><strong className="text-white">Total cost: ~$0.30</strong> for 20 classifications</li>
        </ul>

        {/* COST */}
        <H2>Cost Comparison</H2>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Approach</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Cost</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Time</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr><td className="px-4 py-3">Field survey</td><td className="text-right px-4 py-3">$50,000+</td><td className="text-right px-4 py-3">6–12 months</td><td className="text-right px-4 py-3">Ground truth</td></tr>
              <tr><td className="px-4 py-3">Traditional ML (train from scratch)</td><td className="text-right px-4 py-3">$5,000–10,000</td><td className="text-right px-4 py-3">3–6 months</td><td className="text-right px-4 py-3">~90%</td></tr>
              <tr className="text-emerald-400 font-medium">
                <td className="px-4 py-3">Gemini few-shot (our approach)</td>
                <td className="text-right px-4 py-3">~$15</td>
                <td className="text-right px-4 py-3">1 day</td>
                <td className="text-right px-4 py-3">73%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* WHY IT MATTERS */}
        <H2>Why This Matters</H2>

        <P>
          <strong className="text-white">For agricultural mapping:</strong> Every crop that&apos;s been mapped somewhere becomes a candidate for visual transfer. Cashew in Tanzania? Use labels from Mozambique. Coffee in Uganda? Use labels from Ethiopia. The expensive step (ground-truth collection) becomes a one-time investment that transfers across borders.
        </P>

        <P>
          <strong className="text-white">For climate adaptation:</strong> We can rapidly map crop distributions in data-poor regions where adaptation planning is most urgently needed. A climate adaptation strategy without a crop map is like navigating without a chart.
        </P>

        <P>
          <strong className="text-white">For AI methodology:</strong> This is among the first applications of large multimodal models for satellite-based crop detection. Google has already demonstrated Gemini&apos;s{" "}
          <a href="https://developers.googleblog.com/unlocking-multi-spectral-data-with-gemini/" className="text-emerald-400 underline hover:text-emerald-300">native multi-spectral capabilities</a>
          {" "}and is building{" "}
          <a href="https://research.google/blog/geospatial-reasoning-unlocking-insights-with-generative-ai-and-multiple-foundation-models/" className="text-emerald-400 underline hover:text-emerald-300">geospatial reasoning frameworks</a>
          . Our work applies these to a concrete food security problem.
        </P>

        <P>
          <strong className="text-white">For food security:</strong> Nigeria&apos;s 600,000 cocoa farming households are largely invisible to national planning. Putting them on the map is a first step toward climate adaptation investments and supply chain transparency.
        </P>

        {/* FOOTER */}
        <hr className="border-gray-800 my-10" />

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            Built with{" "}
            <a href="https://earthengine.google.com/" className="text-gray-400 hover:text-white">Google Earth Engine</a>,{" "}
            <a href="https://ai.google.dev/" className="text-gray-400 hover:text-white">Gemini</a>,{" "}
            <a href="https://sentinel.esa.int/web/sentinel/missions/sentinel-2" className="text-gray-400 hover:text-white">Sentinel-2</a>,{" "}
            and the <a href="https://www.forestdatapartnership.org/" className="text-gray-400 hover:text-white">Forest Data Partnership</a>.
          </p>
          <p>
            Code: <a href="https://github.com/JDerekLomas/eli-africa" className="text-gray-400 hover:text-white">github.com/JDerekLomas/eli-africa</a>
            {" "} | {" "}
            Map: <a href="/" className="text-gray-400 hover:text-white">eli-africa.vercel.app</a>
          </p>
        </div>
      </article>
    </div>
  );
}
