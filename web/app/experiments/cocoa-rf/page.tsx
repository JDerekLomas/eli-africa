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

export default function CocoaRFPage() {
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
          Replicating Cocoa Detection with Random Forest and Sentinel-2
        </h1>
        <p className="text-lg text-gray-400 italic mb-10">
          We replicated a published satellite-based cocoa classification method, achieving 91% accuracy. Then we applied it to Nigeria.
        </p>

        <hr className="border-gray-800 mb-10" />

        <P>
          In our <a href="/experiments/cocoa-detection" className="text-emerald-400 underline">first experiment</a>, we used Gemini vision to identify cocoa farms from satellite imagery. It worked for distinguishing cocoa from oil palm at high resolution, but wasn&apos;t suitable for large-scale mapping.
        </P>

        <P>
          Published research uses a different approach: <strong className="text-white">machine learning on spectral and texture features</strong> from Sentinel-2 satellite data. A{" "}
          <a href="https://www.mdpi.com/2072-4292/16/3/598" className="text-emerald-400 underline">2024 study in Remote Sensing</a>{" "}
          achieved 85% accuracy classifying cocoa in Ghana and Cote d&apos;Ivoire using Random Forest with Sentinel-2 bands, vegetation indices, and GLCM texture features.
        </P>

        <P>
          We replicated this methodology using Google Earth Engine — and got <strong className="text-white">91% accuracy</strong>.
        </P>

        <H2>Method</H2>

        <P>
          Following the published approach, we built a 21-feature stack from Sentinel-2 imagery:
        </P>

        <H3>Features (21 total)</H3>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Category</th>
                <th className="text-left px-4 py-3 text-gray-400">Features</th>
                <th className="text-left px-4 py-3 text-gray-400">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="px-4 py-3 font-medium text-white">Sentinel-2 bands (10)</td>
                <td className="px-4 py-3 text-gray-300">B2, B3, B4, B5, B6, B7, B8, B8A, B11, B12</td>
                <td className="px-4 py-3 text-gray-400">Spectral reflectance — blue to SWIR</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-white">Vegetation indices (4)</td>
                <td className="px-4 py-3 text-gray-300">NDVI, EVI, SAVI, NDWI</td>
                <td className="px-4 py-3 text-gray-400">Vegetation health, moisture, density</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-white">GLCM texture (7)</td>
                <td className="px-4 py-3 text-gray-300">ASM, Contrast, Correlation, Entropy, IDM, Sum Average, Variance</td>
                <td className="px-4 py-3 text-gray-400">Canopy texture patterns from NIR band</td>
              </tr>
            </tbody>
          </table>
        </div>

        <P>
          The key insight from the literature: <strong className="text-white">spectral bands alone can&apos;t distinguish cocoa from forest</strong> — they look identical. Texture features (GLCM) capture the spatial patterns in the canopy that differentiate managed cocoa from natural forest.
        </P>

        <H3>Training Data</H3>
        <P>
          We used the{" "}
          <a href="https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025a" className="text-emerald-400 underline">Forest Data Partnership</a>{" "}
          cocoa probability map as training labels:
        </P>
        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Cocoa (positive):</strong> pixels where FDP probability &gt; 0.7</li>
          <li><strong className="text-white">Non-cocoa (negative):</strong> pixels where FDP probability &lt; 0.2</li>
          <li><strong className="text-white">Region:</strong> Ghana Ashanti/Western (where FDP labels are most reliable)</li>
          <li><strong className="text-white">Samples:</strong> 812 points (balanced classes), sampled at 100m spacing</li>
        </ul>

        <P>
          <strong className="text-white">Important caveat:</strong> We&apos;re training on FDP model outputs, not field-collected ground truth. Our accuracy measures how well we replicate FDP&apos;s model, not absolute ground truth accuracy.
        </P>

        <H3>Classifier</H3>
        <P>
          Random Forest with 100 trees, trained in Google Earth Engine. 70/30 train/validation split with 10 bootstrap iterations.
        </P>

        <H2>Results</H2>

        <H3>Validation Accuracy (Ghana holdout)</H3>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Metric</th>
                <th className="text-right px-4 py-3 text-gray-400">Our Result</th>
                <th className="text-right px-4 py-3 text-gray-400">Published (MDPI 2024)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr className="text-emerald-400">
                <td className="px-4 py-3 font-medium">Overall Accuracy</td>
                <td className="text-right px-4 py-3 font-semibold">91.0%</td>
                <td className="text-right px-4 py-3">85.1%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Kappa</td>
                <td className="text-right px-4 py-3">0.80</td>
                <td className="text-right px-4 py-3">—</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Producer&apos;s Accuracy (cocoa)</td>
                <td className="text-right px-4 py-3">84.0%</td>
                <td className="text-right px-4 py-3">~85%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Producer&apos;s Accuracy (non-cocoa)</td>
                <td className="text-right px-4 py-3">95.0%</td>
                <td className="text-right px-4 py-3">~85%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Cap>Our higher overall accuracy likely reflects training on FDP model labels rather than field data — we&apos;re partly learning to replicate an existing model.</Cap>

        <H3>Confusion Matrix</H3>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-gray-400"></th>
                <th className="px-4 py-3 text-gray-400">Predicted Cocoa</th>
                <th className="px-4 py-3 text-gray-400">Predicted Non-Cocoa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="px-4 py-3 font-medium text-white">Actual Cocoa</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">79</td>
                <td className="px-4 py-3 text-red-400">15</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-white">Actual Non-Cocoa</td>
                <td className="px-4 py-3 text-red-400">8</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">153</td>
              </tr>
            </tbody>
          </table>
        </div>

        <P>
          The model is better at identifying non-cocoa (95% producer&apos;s accuracy) than cocoa (84%). This makes sense — cocoa&apos;s spectral similarity to forest means some cocoa is missed, but when the model says &quot;cocoa,&quot; it&apos;s usually right.
        </P>

        <H3>Feature Importance</H3>
        <P>Which features matter most for cocoa detection?</P>
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Rank</th>
                <th className="text-left px-4 py-3 text-gray-400">Feature</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-right px-4 py-3 text-gray-400">Importance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr className="text-white"><td className="px-4 py-3">1</td><td className="px-4 py-3 font-medium">B12</td><td className="px-4 py-3 text-gray-400">SWIR band</td><td className="text-right px-4 py-3">50.4</td></tr>
              <tr className="text-white"><td className="px-4 py-3">2</td><td className="px-4 py-3 font-medium">B8_savg</td><td className="px-4 py-3 text-gray-400">NIR texture (sum average)</td><td className="text-right px-4 py-3">43.8</td></tr>
              <tr className="text-white"><td className="px-4 py-3">3</td><td className="px-4 py-3 font-medium">B11</td><td className="px-4 py-3 text-gray-400">SWIR band</td><td className="text-right px-4 py-3">41.6</td></tr>
              <tr><td className="px-4 py-3">4</td><td className="px-4 py-3">B8_contrast</td><td className="px-4 py-3 text-gray-400">NIR texture (contrast)</td><td className="text-right px-4 py-3">38.6</td></tr>
              <tr><td className="px-4 py-3">5</td><td className="px-4 py-3">EVI</td><td className="px-4 py-3 text-gray-400">Vegetation index</td><td className="text-right px-4 py-3">38.4</td></tr>
              <tr><td className="px-4 py-3">6</td><td className="px-4 py-3">NDVI</td><td className="px-4 py-3 text-gray-400">Vegetation index</td><td className="text-right px-4 py-3">36.5</td></tr>
            </tbody>
          </table>
        </div>

        <P>
          <strong className="text-white">SWIR bands dominate.</strong> B12 (2190nm) and B11 (1610nm) are the most important features — more than NDVI. This is significant because SWIR is sensitive to <strong className="text-white">leaf water content and canopy structure</strong>, which differ between cocoa (dense understory, high moisture) and natural forest (more varied structure).
        </P>

        <P>
          <strong className="text-white">Texture matters.</strong> NIR sum average and contrast are in the top 4 — confirming the literature&apos;s finding that spatial patterns, not just color, are needed to separate cocoa from forest.
        </P>

        <H2>Application to Nigeria</H2>

        <P>
          We applied the Ghana-trained classifier to Nigeria&apos;s cocoa belt (Ondo, Osun, Cross River, Ogun, Oyo states). The model generates a cocoa probability map — brown pixels indicate areas the model classifies as cocoa.
        </P>

        <P>
          <strong className="text-white">Critical caveat:</strong> This is a cross-border transfer. The model was trained entirely on Ghana data and has never seen Nigerian cocoa. Spectral differences between countries (soil color, farming practices, intercropping patterns) could cause systematic errors. This map should be validated against ground truth before being used for any decision-making.
        </P>

        <H2>How This Compares to the Gemini Approach</H2>

        <div className="overflow-x-auto my-6 rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400"></th>
                <th className="text-left px-4 py-3 text-gray-400">Random Forest</th>
                <th className="text-left px-4 py-3 text-gray-400">Gemini Vision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr><td className="px-4 py-3 text-white">Resolution</td><td className="px-4 py-3">10m (Sentinel-2)</td><td className="px-4 py-3">0.6m (ESRI)</td></tr>
              <tr><td className="px-4 py-3 text-white">Can distinguish cocoa from forest?</td><td className="px-4 py-3 text-amber-400">Partially (via texture + SWIR)</td><td className="px-4 py-3 text-red-400">Not at 10m</td></tr>
              <tr><td className="px-4 py-3 text-white">Can distinguish cocoa from oil palm?</td><td className="px-4 py-3 text-amber-400">Limited</td><td className="px-4 py-3 text-emerald-400">Yes (crown morphology at 0.6m)</td></tr>
              <tr><td className="px-4 py-3 text-white">Scalability</td><td className="px-4 py-3 text-emerald-400">Continental (runs in EE)</td><td className="px-4 py-3 text-red-400">Tile-by-tile ($0.01/tile)</td></tr>
              <tr><td className="px-4 py-3 text-white">Explainability</td><td className="px-4 py-3 text-red-400">Feature importance only</td><td className="px-4 py-3 text-emerald-400">Natural language reasoning</td></tr>
              <tr><td className="px-4 py-3 text-white">Accuracy (Ghana)</td><td className="px-4 py-3 text-emerald-400">91% OA</td><td className="px-4 py-3 text-gray-400">Not validated at scale</td></tr>
              <tr><td className="px-4 py-3 text-white">Best use</td><td className="px-4 py-3">Bulk mapping</td><td className="px-4 py-3">Quality control + spot checks</td></tr>
            </tbody>
          </table>
        </div>

        <P>
          <strong className="text-white">They&apos;re complementary.</strong> Random Forest gives you a wall-to-wall map cheaply. Gemini gives you an expert second opinion at specific locations. The hybrid approach: RF maps everything, Gemini quality-checks the uncertain areas, humans resolve disagreements.
        </P>

        <H2>Limitations</H2>

        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><strong className="text-white">Training on model outputs</strong> — we used FDP labels, not field data. Our 91% measures replication fidelity, not ground truth accuracy.</li>
          <li><strong className="text-white">No radar data</strong> — the{" "}
            <a href="https://www.sciencedirect.com/science/article/pii/S2352938525002058" className="text-emerald-400 underline">best published methods</a>{" "}
            add Sentinel-1 SAR for canopy structure. Adding radar would likely improve accuracy.</li>
          <li><strong className="text-white">Binary classification</strong> — we only distinguish cocoa vs. non-cocoa. A multi-class model (cocoa vs. oil palm vs. rubber vs. forest) would be more useful.</li>
          <li><strong className="text-white">Small training set</strong> — 812 samples is modest. The published study used 3,311 polygons.</li>
          <li><strong className="text-white">Cross-border transfer unvalidated</strong> — the Nigeria map needs ground truth verification.</li>
        </ul>

        <H2>Reproducibility</H2>

        <P>
          The entire pipeline runs in Google Earth Engine via a Python script. All data sources are free and open:
        </P>

        <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-300">
          <li><code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">COPERNICUS/S2_SR_HARMONIZED</code> — Sentinel-2 imagery</li>
          <li><code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">projects/forestdatapartnership/assets/cocoa/model_2025a</code> — training labels</li>
          <li>Earth Engine&apos;s built-in <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">ee.Classifier.smileRandomForest</code></li>
          <li>Earth Engine&apos;s <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">glcmTexture</code> for GLCM features</li>
        </ul>

        <P>
          Code: <a href="https://github.com/JDerekLomas/eli-africa/blob/main/scripts/replicate-cocoa-rf.py" className="text-emerald-400 underline">scripts/replicate-cocoa-rf.py</a>
        </P>

        <hr className="border-gray-800 my-10" />

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            Reference: Waldner, F. et al. (2024). &quot;Critical Assessment of Cocoa Classification with Limited Reference Data.&quot;{" "}
            <a href="https://www.mdpi.com/2072-4292/16/3/598" className="text-gray-400 hover:text-white"><em>Remote Sensing</em> 16(3): 598</a>.
          </p>
          <p>
            <a href="/experiments" className="text-gray-400 hover:text-white">All experiments</a>
            {" | "}
            <a href="https://github.com/JDerekLomas/eli-africa" className="text-gray-400 hover:text-white">GitHub</a>
            {" | "}
            <a href="/" className="text-gray-400 hover:text-white">Map explorer</a>
          </p>
        </div>
      </article>
    </div>
  );
}
