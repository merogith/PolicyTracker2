// Writes two synthetic policy PDFs for a made-up country (Exampleland, XEX) to the given folder,
// for exercising the pipeline without real documents. Each has a blank page, to test unreadable pages.
// Usage: tsx scripts/make-sample-pdfs.ts [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

const NDC: string[][] = [
  [
    "Exampleland Nationally Determined Contribution 3.0",
    "Submitted to the UNFCCC secretariat on 15 March 2025. This document sets out the updated contribution of the Republic of Exampleland for the period 2026 to 2035. It was adopted by Government Decree No. 412 of 2 March 2025.",
    "The purpose of this document is to communicate the mitigation targets and adaptation priorities of Exampleland under the Paris Agreement. It covers energy, industry, agriculture, waste, water resources and disaster risk management.",
  ],
  [
    "1. National circumstances",
    "Exampleland is a landlocked country with a continental climate. Mean annual temperature has increased by 1.8 °C since 1960, faster than the global average. The economy depends on coal, oil and grain exports.",
    "Climate risks include drought, river floods, mudflows and heat waves. The 2021 drought reduced wheat yields by 30 percent in the northern regions. Spring floods in 2024 displaced 12,000 people in the Northern basin.",
    "Glaciers in the Alatau range have lost 35 percent of their area since 1955, which threatens summer river flows in the south.",
  ],
  [
    "2. Mitigation targets",
    "Exampleland commits to an unconditional target to reduce greenhouse gas emissions by 15 percent below 1990 levels by 2030.",
    "Subject to international support, Exampleland will reduce emissions by 25 percent below 1990 levels by 2030, a conditional target.",
    "For 2035, the unconditional target is a reduction of 20 percent below 1990 levels, and the conditional target is 32 percent.",
    "Exampleland aims to achieve carbon neutrality by 2060.",
  ],
  [
    "3. Energy",
    "Coal provides 70 percent of electricity generation. The share of renewable energy in electricity generation will rise to 15 percent by 2030 and 50 percent by 2050.",
    "A renewable energy auction programme has been operating since 2018; 2.4 GW of wind and solar capacity has been installed under it.",
    "The Ministry of Energy plans to retire 1.2 GW of coal capacity at the Northern power plant by 2032. Energy efficiency standards for buildings were approved in 2023.",
  ],
  [],
  [
    "4. Adaptation priorities",
    "Adaptation priorities are water resources, agriculture, civil protection and health. Exampleland will prepare sectoral adaptation plans for water and agriculture by 2027.",
    "Drip irrigation is being expanded to 150,000 hectares under the State Programme for Irrigated Agriculture, with 60,000 hectares completed in 2024.",
    "An early warning system for mudflows covering 40 automatic gauges is being procured by the Ministry of Emergency Situations.",
  ],
  [
    "5. Disaster risk management",
    "The national strategy for disaster risk reduction 2023 to 2030 was adopted in line with the Sendai Framework. The Ministry of Emergency Situations will install 40 automatic river gauges in the Northern basin by 2028.",
    "Limited hydrological data on small tributaries remains a key gap for flood forecasting.",
    "Local emergency committees operate in all 17 regions. Preparedness drills are held twice a year in schools.",
  ],
  [
    "6. Finance",
    "The total cost of implementing this contribution is estimated at USD 45 billion for 2026 to 2035. Of this, USD 12 billion is expected from the state budget and USD 33 billion from international and private sources.",
    "Exampleland received USD 120 million from the Green Climate Fund for irrigation projects in 2023.",
  ],
  [
    "7. Barriers and support needs",
    "The main barriers are limited access to finance, outdated technology in heavy industry, and a lack of trained staff in regional administrations.",
    "Exampleland needs support for technology transfer in renewable energy, capacity building for greenhouse gas inventories, and better climate data.",
  ],
  [
    "8. Groups and just transition",
    "Rural women and pastoral communities are among the groups most exposed to drought. Gender considerations will be integrated into all sectoral adaptation plans.",
    "A just transition programme for coal regions will retrain 8,000 workers by 2030. Children and older people are the most vulnerable groups during heat waves.",
  ],
  [
    "9. Implementation and transparency",
    "Progress is reported through the Biennial Transparency Report. A national MRV system for greenhouse gas emissions was established in 2022.",
    "The Interministerial Commission on Climate Change monitors implementation and meets twice a year.",
  ],
];

const NAP: string[][] = [
  [
    "Exampleland National Adaptation Plan 2025 to 2030",
    "Approved by the Ministry of Ecology on 10 September 2025. The plan sets out adaptation measures for five priority sectors and the institutional arrangements for their implementation.",
  ],
  [
    "1. Climate risks and vulnerability",
    "Climate projections indicate warming of 2.5 °C by 2050 under a high emissions scenario. Droughts are projected to become twice as frequent in the steppe zone.",
    "Water scarcity is the main climate risk: available surface water may decline by 20 percent by 2040. Glacier retreat in the Alatau range is expected to reduce summer runoff after 2040.",
    "Floods and mudflows cause average losses of USD 80 million per year.",
  ],
  [
    "2. Water resources",
    "The Ministry of Water Resources will introduce basin water management plans for all eight river basins by 2028.",
    "Rehabilitation of 1,500 km of irrigation canals is under way, financed by the state budget and the Asian Development Bank.",
    "A glacier monitoring network of 12 stations was installed in 2024 to measure mass balance and runoff.",
  ],
  [
    "3. Agriculture and food security",
    "Drought-resistant wheat varieties will be distributed to 5,000 farms by 2027. Pasture rotation is being introduced on 2 million hectares.",
    "Crop insurance against drought covers 30 percent of sown area. Food security reserves of grain are maintained at 1.5 million tons.",
  ],
  [],
  [
    "4. Disaster risk management",
    "The early warning system for floods and mudflows will cover all 17 regions by 2029. Mudflow protection dams were built in 2023 above the capital.",
    "Emergency shelters for 50,000 people are being equipped in flood-prone districts.",
  ],
  [
    "5. Health and social protection",
    "Heat-health action plans will be introduced in the five largest cities by 2027. Older people, children and persons with disabilities receive priority in heat wave response.",
    "Women's participation in local adaptation committees will reach at least 30 percent.",
  ],
  [
    "6. Finance and barriers",
    "Implementing the plan is estimated to cost USD 3.2 billion, of which USD 1.1 billion is secured from the state budget.",
    "Barriers include fragmented responsibilities between ministries, limited local budgets, and gaps in climate risk data at district level.",
  ],
  [
    "7. Monitoring and evaluation",
    "Progress is tracked with 24 indicators and reported every two years. The first progress report on the previous adaptation concept was published in 2024 and found that 40 percent of measures were completed.",
  ],
];

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

async function build(pages: string[][], title: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const [i, paragraphs] of pages.entries()) {
    const page = pdf.addPage([595, 842]);
    let y = 780;
    for (const [j, para] of paragraphs.entries()) {
      const heading = j === 0;
      for (const line of wrap(para.replace("°C", "degrees C"), heading ? 60 : 92)) {
        page.drawText(line, { x: 56, y, size: heading ? 14 : 10.5, font: heading ? bold : font });
        y -= heading ? 22 : 15;
      }
      y -= 10;
    }
    if (paragraphs.length) page.drawText(String(i + 1), { x: 290, y: 40, size: 9, font });
  }
  return Buffer.from(await pdf.save());
}

async function main() {
  const out = path.resolve(process.argv[2] ?? "data/samples");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "exampleland-ndc3.pdf"), await build(NDC, "Exampleland NDC 3.0"));
  writeFileSync(path.join(out, "exampleland-nap.pdf"), await build(NAP, "Exampleland NAP 2025-2030"));
  console.log(`wrote ${out}/exampleland-ndc3.pdf (${NDC.length} pages) and ${out}/exampleland-nap.pdf (${NAP.length} pages)`);
}

main();
