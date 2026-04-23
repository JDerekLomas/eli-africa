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
function Cap({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 mt-2 mb-6 italic">{children}</p>;
}
function Quote({ children }: { children: React.ReactNode }) {
  return <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-2 my-6 text-gray-400 italic">{children}</blockquote>;
}

export default function CocoaDetectionPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/experiments" className="text-gray-400 hover:text-white text-sm">&larr; All Experiments</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Experiment</span>

        <h1 className="text-4xl font-bold text-white mt-4 mb-3 leading-tight">
          Can AI Tell Cocoa from Oil Palm in Nigerian Satellite Imagery?
        </h1>
        <p className="text-lg text-gray-400 italic mb-10">
          We tried using Gemini to map cocoa farms from space. Our first attempt was wrong. Here&apos;s what we learned.
        </p>

        <hr className="border-gray-800 mb-10" />

        <P>
          Nigeria is the world&apos;s 4th largest cocoa producer — 328,000 tonnes per year from ~600,000 farming households. But no satellite-derived cocoa map exists for the country. Ghana and Cote d&apos;Ivoire have been{" "}
          <a href="https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a" className="text-emerald-400 underline">mapped at 10m resolution</a>
          , but Nigeria is a blank spot.
        </P>

        <P>
          We set out to fill that gap using Gemini&apos;s vision capabilities and satellite imagery. <strong className="text-white">Our first attempt gave us confident-sounding but wrong results.</strong> Our second attempt, with better imagery and an honest methodology, actually worked.
        </P>

        <H2>Attempt 1: Low Resolution, Leading Prompt (Wrong)</H2>

        <P>
          We started with Sentinel-2 imagery at 10m resolution — each pixel covers a 10m x 10m area. We asked Gemini a leading question: &quot;Is this cocoa?&quot; and showed it examples of labeled cocoa from Ghana.
        </P>

        <P>
          The results looked great: 96% detection rate in Cross River, 95% in Ondo, 100% in Osun. But there was a problem.
        </P>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-5 my-6">
          <p className="text-red-400 font-semibold text-sm mb-2">What went wrong</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            <li>At 10m resolution, <strong className="text-white">cocoa, oil palm, rubber, and natural forest all look the same</strong> — just &quot;green trees&quot;</li>
            <li>The prompt was leading — asking &quot;is this cocoa?&quot; instead of &quot;what do you see?&quot;</li>
            <li>We had no negative examples of other tree crops from the same region</li>
            <li>The model was essentially saying &quot;there are trees here&quot; and we were calling that cocoa detection</li>
          </ul>
        </div>

        <H2>The Core Problem: Cocoa is Hard</H2>

        <P>
          Published research confirms why this is difficult. Cocoa&apos;s spectral signature is{" "}
          <a href="https://www.researchgate.net/publication/361275455" className="text-emerald-400 underline">nearly identical to natural forest</a>
          . It grows under shade trees in agroforestry systems, making it even harder to distinguish from above. At 10m resolution, there simply isn&apos;t enough visual information to tell crops apart.
        </P>

        <P>
          Oil palm, by contrast, is{" "}
          <a href="https://www.mdpi.com/2072-4292/6/10/9749" className="text-emerald-400 underline">relatively easy to detect</a>
          {" "}because of its distinctive star-shaped crown visible at sub-meter resolution.
        </P>

        <P>
          The best published cocoa detection methods use{" "}
          <a href="https://www.sciencedirect.com/science/article/pii/S2352938525002058" className="text-emerald-400 underline">combined optical + radar data</a>
          {" "}and achieve ~90% accuracy. Pure optical approaches struggle because cocoa looks like forest.
        </P>

        <H2>Attempt 2: High Resolution, Honest Prompt (Better)</H2>

        <P>
          We changed three things:
        </P>

        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Higher resolution</strong> — ESRI World Imagery at ~0.6m instead of Sentinel-2 at 10m. Individual tree crowns visible.</li>
          <li><strong className="text-white">Open-ended prompt</strong> — &quot;Describe what you see&quot; instead of &quot;Is this cocoa?&quot;</li>
          <li><strong className="text-white">Expert context</strong> — we told Gemini how each crop looks from above (crown morphology, spacing patterns, canopy texture) based on remote sensing literature</li>
        </ul>

        <H2>What Cocoa Actually Looks Like from Space</H2>

        <P>
          Here&apos;s a confirmed cocoa area in Soubre, Cote d&apos;Ivoire — the world&apos;s #1 cocoa-producing district:
        </P>

        <div className="my-6">
          <img src="/blog/cdi_soubre_z18.jpg" alt="Soubre CDI cocoa" className="rounded-lg w-80" />
          <Cap>Soubre, CDI (0.6m). Lumpy, heterogeneous canopy. Irregular spacing. Bare soil visible between patches. No regular grid. This is cocoa agroforestry.</Cap>
        </div>

        <P>Key visual features of cocoa at 0.6m resolution:</P>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Lumpy, heterogeneous canopy</strong> — varying heights and densities, not uniform</li>
          <li><strong className="text-white">Irregular spacing</strong> — no grid pattern, organic arrangement</li>
          <li><strong className="text-white">Bare soil/leaf litter visible</strong> — gaps between tree patches, brown/tan patches</li>
          <li><strong className="text-white">Grows under shade trees</strong> — multi-layered, hard to see individual cocoa trees</li>
        </ul>

        <H3>What Oil Palm Looks Like (the main confusion risk)</H3>

        <div className="my-6">
          <img src="/blog/ondo_oilpalm_z18.jpg" alt="Ondo oil palm" className="rounded-lg w-80" />
          <Cap>Ondo State, Nigeria (0.6m). Star-shaped/feathery crowns. Regular ~9m spacing. Individual trees clearly distinguishable. This is oil palm — NOT cocoa.</Cap>
        </div>

        <P>
          <strong className="text-white">This tile is from Ondo State, Nigeria&apos;s #1 cocoa-producing state.</strong> In our first attempt, we classified it as &quot;COCOA with 0.95 confidence.&quot; It&apos;s actually oil palm. Ondo grows both crops, and at low resolution they look identical.
        </P>

        <H2>Finding Real Cocoa in Nigeria</H2>

        <P>
          Armed with the right resolution and prompt, we searched across Ondo State for areas matching the Soubre cocoa pattern. We found them:
        </P>

        <div className="grid grid-cols-2 gap-4 my-6">
          <div>
            <img src="/blog/idanre_cocoa_z18.jpg" alt="Idanre cocoa" className="rounded-lg w-full" />
            <Cap>Idanre, Ondo State (0.6m) — Gemini: COCOA, high confidence</Cap>
          </div>
          <div>
            <img src="/blog/cdi_soubre_z18.jpg" alt="Soubre reference" className="rounded-lg w-full" />
            <Cap>Soubre, CDI reference — confirmed cocoa</Cap>
          </div>
        </div>

        <P>
          The Idanre tile matches the Soubre cocoa pattern: heterogeneous canopy, irregular spacing, bare soil visible. Idanre is a{" "}
          <a href="https://www.researchgate.net/figure/Map-of-Ondo-State-showing-the-three-largest-cocoa-producing-LGAs-Source-Modified-after_fig1_356559935" className="text-emerald-400 underline">known major cocoa-producing LGA</a>
          {" "}in Ondo State.
        </P>

        <Quote>
          Gemini on the Idanre tile: &quot;The canopy has a lumpy, heterogeneous texture with irregularly shaped clumps interspersed with patches of bare soil. This perfectly matches cocoa agroforestry. No star-shaped crowns or regular spacing that would indicate oil palm.&quot;
        </Quote>

        <H3>The Mixed Landscape</H3>

        <div className="my-6">
          <img src="/blog/ondo_mixed_z18.jpg" alt="Ondo mixed" className="rounded-lg w-80" />
          <Cap>Rural Ondo (0.6m) — Mixed landscape: cocoa agroforestry + cleared land + forest patches. This is what Nigerian cocoa country actually looks like.</Cap>
        </div>

        <P>
          Gemini correctly identified this as a mosaic: cocoa agroforestry in the central/right areas, cleared land on the left, and denser forest patches. A realistic Nigerian agricultural landscape, not the uniform canopy we were looking for in Attempt 1.
        </P>

        <H2>Side-by-Side: Can Gemini Tell Them Apart?</H2>

        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Location</th>
                <th className="text-left px-4 py-3 text-gray-400">Ground Truth</th>
                <th className="text-left px-4 py-3 text-gray-400">Gemini Says</th>
                <th className="text-left px-4 py-3 text-gray-400">Key Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="px-4 py-3">Soubre, CDI</td>
                <td className="px-4 py-3 text-emerald-400">Known cocoa #1</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">COCOA (high)</td>
                <td className="px-4 py-3 text-gray-400">Lumpy canopy, irregular spacing, bare soil</td>
              </tr>
              <tr>
                <td className="px-4 py-3">CRIG, Ghana</td>
                <td className="px-4 py-3 text-emerald-400">Cocoa research station</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">COCOA (high)</td>
                <td className="px-4 py-3 text-gray-400">Heterogeneous, multi-layered</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Idanre, Ondo</td>
                <td className="px-4 py-3 text-gray-400">Known cocoa LGA</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">COCOA (high)</td>
                <td className="px-4 py-3 text-gray-400">Matches Soubre pattern exactly</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Ondo forest N</td>
                <td className="px-4 py-3 text-gray-400">Unknown</td>
                <td className="px-4 py-3 text-amber-400 font-semibold">OIL PALM (high)</td>
                <td className="px-4 py-3 text-gray-400">Star-shaped crowns, regular spacing</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Kaduna savanna</td>
                <td className="px-4 py-3 text-red-400">Not cocoa</td>
                <td className="px-4 py-3 text-red-400 font-semibold">NOT COCOA (high)</td>
                <td className="px-4 py-3 text-gray-400">Bare farmland, no tree canopy</td>
              </tr>
            </tbody>
          </table>
        </div>

        <H2>What We Actually Learned</H2>

        <P>
          <strong className="text-white">Resolution matters more than the AI model.</strong> At 10m (Sentinel-2), every tree crop looks the same. At 0.6m (ESRI), crown morphology becomes visible and classification becomes possible. The jump from &quot;tree detection&quot; to &quot;crop identification&quot; requires sub-meter imagery.
        </P>

        <P>
          <strong className="text-white">Prompt design matters as much as the model.</strong> A leading prompt (&quot;is this cocoa?&quot;) gives you the answer you want. An open-ended prompt with expert context (&quot;describe what you see, here&apos;s how each crop looks&quot;) gives you an honest answer. The expert context — crown morphology, spacing patterns — is based on{" "}
          <a href="https://www.mdpi.com/2072-4292/6/10/9749" className="text-emerald-400 underline">published remote sensing research</a>.
        </P>

        <P>
          <strong className="text-white">LLMs are better at description than classification.</strong> When we asked Gemini to describe what it sees, it gave nuanced, defensible analysis. When we asked it to classify, it gave overconfident binary answers. The description-first approach also catches things a classifier would miss — like mixed landscapes with multiple land uses in one tile.
        </P>

        <P>
          <strong className="text-white">Ground truth is not optional.</strong> The GPS coordinates from{" "}
          <a href="https://www.frontiersin.org/articles/10.3389/fagro.2022.731019/full" className="text-emerald-400 underline">Etaware (2022)</a>
          {" "}turned out to be town centers, not farm coordinates. Our initial &quot;100% ground-truth accuracy&quot; was validating that towns exist, not that cocoa grows there.
        </P>

        <H2>What Would Make This a Real Cocoa Map</H2>

        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Sub-meter imagery at scale</strong> — ESRI tiles work for spot checks but a systematic survey needs consistent, recent coverage (Planet, Airbus, or Google Maps Static API)</li>
          <li><strong className="text-white">Radar data (Sentinel-1 SAR)</strong> — penetrates clouds and distinguishes canopy structure. The{" "}
            <a href="https://www.sciencedirect.com/science/article/pii/S2352938525002058" className="text-emerald-400 underline">best published methods</a>
            {" "}combine optical + radar for ~90% accuracy</li>
          <li><strong className="text-white">Temporal analysis</strong> — cocoa has seasonal patterns (harvest, leaf flush) that differ from oil palm and forest</li>
          <li><strong className="text-white">Real ground truth</strong> — GPS coordinates of actual cocoa farms, not town centers. Partnering with CRIN (Cocoa Research Institute of Nigeria) or local cooperatives</li>
          <li><strong className="text-white">Confusion matrix with negative examples</strong> — systematically test cocoa vs. oil palm vs. rubber vs. forest vs. citrus in the same region</li>
        </ul>

        <H2>Cost</H2>

        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Approach</th>
                <th className="text-right px-4 py-3 text-gray-400">Cost</th>
                <th className="text-right px-4 py-3 text-gray-400">Time</th>
                <th className="text-left px-4 py-3 text-gray-400">Limitation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr><td className="px-4 py-3">Field survey</td><td className="text-right px-4 py-3">$50,000+</td><td className="text-right px-4 py-3">6-12 mo</td><td className="px-4 py-3 text-gray-400">Expensive but definitive</td></tr>
              <tr><td className="px-4 py-3">Traditional ML + radar</td><td className="text-right px-4 py-3">$5-10k</td><td className="text-right px-4 py-3">3-6 mo</td><td className="px-4 py-3 text-gray-400">Needs labeled training data</td></tr>
              <tr><td className="px-4 py-3">Gemini + 10m imagery</td><td className="text-right px-4 py-3">~$15</td><td className="text-right px-4 py-3">1 day</td><td className="px-4 py-3 text-red-400">Can&apos;t distinguish tree crops</td></tr>
              <tr className="text-emerald-400"><td className="px-4 py-3 font-medium">Gemini + 0.6m + expert prompt</td><td className="text-right px-4 py-3">~$5</td><td className="text-right px-4 py-3">1 day</td><td className="px-4 py-3 text-gray-300">Promising but unvalidated at scale</td></tr>
            </tbody>
          </table>
        </div>

        <hr className="border-gray-800 my-10" />

        <P>
          This experiment didn&apos;t produce a cocoa map. It produced something potentially more useful: a methodology for rapid, cheap, honest crop identification using AI vision — and a clear understanding of when it works and when it doesn&apos;t.
        </P>

        <P>
          The code and data are <a href="https://github.com/JDerekLomas/eli-africa" className="text-emerald-400 underline">open source</a>. The{" "}
          <a href="/" className="text-emerald-400 underline">map explorer</a> is live. We&apos;re looking for partners with ground-truth data to validate this approach at scale.
        </P>

        <hr className="border-gray-800 my-10" />

        <div className="text-sm text-gray-500 space-y-2">
          <p>Built with <a href="https://ai.google.dev/" className="text-gray-400 hover:text-white">Gemini</a>, <a href="https://earthengine.google.com/" className="text-gray-400 hover:text-white">Google Earth Engine</a>, <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" className="text-gray-400 hover:text-white">ESRI World Imagery</a>, and the <a href="https://www.forestdatapartnership.org/" className="text-gray-400 hover:text-white">Forest Data Partnership</a>.</p>
          <p>Code: <a href="https://github.com/JDerekLomas/eli-africa" className="text-gray-400 hover:text-white">github.com/JDerekLomas/eli-africa</a></p>
        </div>
      </article>
    </div>
  );
}
