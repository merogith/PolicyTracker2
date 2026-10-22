# Taxonomy review: subjects, labels and source priorities

**Review specification 3.0.0 — not active in the application.** Keep the established **16 domains and 64 topic IDs**. The catalogue is sufficiently broad for regional climate and disaster policy; the useful changes are clearer boundaries, fewer default labels and reliable evidence assignment.

The machine sources are [taxonomy.json](../pipeline/taxonomy.json) and [labels.json](../pipeline/labels.json). This guide presents their complete choices. The running application does not load this review folder. Generate the catalogue/choice sections from those sources after edits; do not maintain a second definition only in prose.

## The four jobs of the taxonomy

| Element | Question answered | Example |
|---|---|---|
| Domain | Which policy area is this? | Agriculture & Food |
| Topic | What is the specific subject? | AGR-01 Irrigation and farm water efficiency |
| Statement type | What kind of assertion did the source make? | Concern, commitment or planned action |
| Optional label | What source-supported context helps filtering? | Drought; adaptation; public investment |

Domains and groups are derived from topic IDs. A model does not invent domain names. The four documentation bands are calculated separately; labels, repeated mentions and explicit priorities do not add points.

## Scope and initial documents

Stay within climate action and all-hazards disaster risk, including directly relevant sector evidence. Earthquakes can be disaster-risk evidence without becoming climate evidence. Generic education, tourism, economic development or biodiversity text does not qualify merely because a sector topic exists. Quoted section context may establish the connection; do not infer detailed purpose from a document title alone.

NDC and NAP are the initial document roles. Compare countries using the same configured role set and edition/date rules: NDC-only and NDC-plus-NAP are different profiles. An NDC-only view cannot establish that a country's wider adaptation or disaster-risk policy is absent. Additional document roles can be introduced through an explicit versioned profile later. All-supplied-document views remain exploratory when a common source profile is not satisfied.

## Assign, own and display once

Choose one `primary_topic_id` and only source-supported `secondary_topic_ids`. The primary topic determines canonical organization ownership; the extraction question does not determine the primary topic. Each topic has one explicit `home_domain_id`, independent of display-placement order.

A secondary **placement** displays the same topic elsewhere. AGR-01 appears in Agriculture and Water, but its benchmark count belongs to Agriculture. Water should identify it as related rather than quietly adding it to Water's denominator.

A secondary **topic** is a different substantive subject. It requires its own evidence predicate for a relevant concern/response and any claimed delivery detail. Do not copy a claim's band to every tag. A supporting link or an actor for another measure cannot qualify it. Preserve the topic-to-evidence attribution using the existing provenance contract; scoring never decides relevance from a bare topic ID.

A shared programme name is insufficient claim identity. A 100,000-hectare target, existing irrigation capacity and a canal-rehabilitation action may all concern one programme while remaining different propositions. Compatible records about the same identified response can share delivery details; unrelated programme measures cannot.

## Unmapped is not an Other domain

| Situation | Representation | What remains visible |
|---|---|---|
| Relevant climate/disaster subject does not fit a topic | `primary_topic_id: null`, source wording in `unmapped_concepts` | Original statement type, source evidence and an Unmapped evidence count/list |
| Subject fits, but assertion type does not fit another type | Known topic plus `statement_type: other` | The statement and its evidence; no invented response stage |
| New cross-cutting climate/disaster concept | Retain as unmapped evidence until a versioned taxonomy change maps it | Searchable evidence after publication; no automatic new topic |
| Unrelated general development material | Outside tracker scope | It does not enter climate/disaster claims or become an Other category |

An unmapped assertion may be a commitment, concern or planned action. Do not relabel it as context simply because its subject is unmapped. It cannot qualify an arbitrary topic band. Classification limitations remain visible; there is no pre-publication human review queue.

## Keep the ordinary label set small

**Core, enabled:** purpose, hazards, geographic scope and policy instruments.

**Additional context module, disabled initially:** themes and affected groups. These are useful for explicit inclusion/thematic questions, including UNDP work, but need not enlarge every routine extraction response. Source statements and quotations remain available while tags are disabled. Enabling the module later requires appropriate automatic relabeling or source extraction; do not claim structured inclusion coverage before that work runs.

**Specialist risk module, disabled initially:** risk component and risk function. Keep the options editable for specialist analysis without adding them to the default dashboard.

The complete allowed options, including disabled modules, appear after the catalogue. The model receives only enabled options in its compiled contract.

## Explicit priorities are a lens, not a score

`priority_evidence` is null or exact source wording linked to evidence. It is not an importance enum. “Drought is a priority risk” supports a priority concern; “Efficient irrigation is a national adaptation priority” may support an attributable priority response when the source establishes that undertaking.

Do not infer priority from repetition, hazard severity, document length or model judgement. A priority filter can expose stated needs with no response found, unresolved contradictions or explicit priorities. It changes the displayed evidence only; it does not exclude benchmark topics, change weights or create policy rankings.

## Fields and safe edits

| Field | Meaning and effect |
|---|---|
| Catalogue `id`, `version`, `status`, `rules` | Versioned scope and assignment rules. This folder is review-only. |
| Domain `id`, `prefix`, `label`, `definition` | Stable code, historical prefix, display name and subject boundary. |
| Domain `groups` | Display groups with `id` and `label`; not indicators or scoring units. |
| Topic `id`, `label`, `definition` | Stable code and substantive subject boundary. |
| Topic `home_domain_id` | Explicit organization and counting home. Display order cannot change it. |
| Topic `placements` | Domain/group pairs for navigation; one display group per domain. |
| Topic `routing` | When/use guidance distinguishing neighboring subjects. |
| Topic `legacy_ids`, `split_from` | Historical lineage, not additional active topic choices. |
| Ownership/comparison policies | Fixed topic basket, evidence qualification and common source-profile rules. |

Keep IDs stable for naming, display and organizational changes. A future home change must be explicit and recorded; its affected comparison profiles must be versioned. Semantic splits/merges need lineage. Gaps in historical code sequences are not missing topics to renumber.

The review retains the v2 cleanup of two duplicate within-domain placements: NAT-03 stays in Nature/Biodiversity and ecosystems; SET-02 stays in Settlements/Buildings and settlements. Definitions and cross-domain links are preserved. WAT-05 routing explicitly identifies glacial-lake-outburst hazard evidence and separates risk assessment from warning/preparedness.

## Domain and topic inventory

Each topic appears once under its explicit home. Secondary placements are additional views of the same topic, not extra indicators. Display groups have no scoring weight.

### Climate

Domain `climate` · prefix `CLM` · 6 home topics.

Climate-specific cross-sector policy: governance, finance, transparency, economy-wide mitigation, climate information and loss and damage. Sector measures use their sector domain.

Display groups: `governance` — Governance, finance and transparency; `mitigation` — Economy-wide mitigation; `knowledge` — Climate information and impacts; `loss_damage` — Loss and damage.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `CLM-01` | Climate planning, governance and mainstreaming | Climate strategies and laws, institutional arrangements, coordination bodies, and mainstreaming climate into sector or budget planning. | Climate / Governance, finance and transparency |
| `CLM-02` | Climate finance and support | Mobilising, channelling or requesting finance, technology transfer and capacity support for climate action, where the finance arrangement itself is the subject. | Climate / Governance, finance and transparency |
| `CLM-03` | Climate observations, projections and impact assessment | Observed climate trends, climate projections, and climate vulnerability or impact assessments. | Climate / Climate information and impacts; Disaster Risk Management / Risk governance and knowledge |
| `CLM-05` | Climate transparency and reporting | Greenhouse-gas inventories, MRV systems, progress tracking and reporting under the UNFCCC. | Climate / Governance, finance and transparency |
| `CLM-06` | Economy-wide emissions targets and pathways | Economy-wide greenhouse-gas targets, carbon-neutrality goals and long-term emission pathways. | Climate / Economy-wide mitigation |
| `CLM-09` | Loss and damage | Economic and non-economic losses from climate-change impacts framed as loss and damage, and arrangements to address them. | Climate / Loss and damage |

### Disaster Risk Management

Domain `disaster_risk` · prefix `DRM` · 7 home topics.

All-hazards disaster-risk systems: governance, risk knowledge, warning and preparedness, response, recovery and risk finance, whether or not the hazard is climate-related.

Display groups: `governance_knowledge` — Risk governance and knowledge; `reduction_preparedness` — Risk reduction, warning and preparedness; `response_recovery` — Response and recovery; `risk_finance` — Risk finance.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `DRM-01` | Disaster risk governance and institutions | Disaster-risk-reduction strategies and laws, civil-protection or emergency-management agencies and coordination mechanisms. | Disaster Risk Management / Risk governance and knowledge |
| `DRM-02` | Disaster risk assessment and loss data | Hazard mapping, multi-hazard risk assessments, exposure and vulnerability databases, and disaster-loss accounting, including reported event losses. | Disaster Risk Management / Risk governance and knowledge |
| `DRM-03` | Early warning and preparedness | Monitoring and forecasting for warnings, warning dissemination, contingency plans, drills, stockpiles and readiness to act. | Disaster Risk Management / Risk reduction, warning and preparedness |
| `DRM-04` | Multi-hazard risk reduction programmes | Cross-sector programmes that reduce exposure or vulnerability to several hazards and have no single sector home. This is the residual home; prefer sector topics. | Disaster Risk Management / Risk reduction, warning and preparedness |
| `DRM-05` | Disaster risk finance and insurance | Contingency and reserve funds, insurance schemes, risk pools, catastrophe bonds and other pre-arranged disaster finance. | Disaster Risk Management / Risk finance |
| `DRM-06` | Emergency response and civil protection | Search and rescue, evacuation, emergency relief and civil-protection operations during or immediately after an event. | Disaster Risk Management / Response and recovery |
| `DRM-07` | Recovery and reconstruction | Post-disaster needs assessment, recovery frameworks, rebuilding (including building back better) and restoration of services and livelihoods. | Disaster Risk Management / Response and recovery |

### Agriculture & Food

Domain `agriculture` · prefix `AGR` · 5 home topics.

Crops, soils, livestock, rangelands, farm water, fisheries and food systems.

Display groups: `production` — Crops, soils and livestock; `farm_water` — Farm water; `food_systems` — Food systems and fisheries.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `AGR-01` | Irrigation and farm water efficiency | Irrigation systems, on-farm water efficiency, drainage and farm water storage. | Agriculture & Food / Farm water; Water / Water resources and supply |
| `AGR-02` | Resilient crops and soils | Crop varieties, cropping practices, on-farm soil health and agricultural adaptation of production. | Agriculture & Food / Crops, soils and livestock |
| `AGR-03` | Livestock, pastures and rangelands | Livestock production and health, manure and enteric emissions, pasture and rangeland management. | Agriculture & Food / Crops, soils and livestock |
| `AGR-04` | Food security and farm livelihoods | Food availability and access, value chains, farm incomes and rural agricultural livelihoods. | Agriculture & Food / Food systems and fisheries; Livelihoods & Social Protection / Jobs and livelihoods |
| `AGR-05` | Fisheries and aquaculture | Capture fisheries, aquaculture and the ecosystems and livelihoods they depend on. | Agriculture & Food / Food systems and fisheries |

### Water

Domain `water` · prefix `WAT` · 6 home topics.

Water resources, supply, basins, drought, floods and coasts, water quality and the cryosphere as a water source.

Display groups: `resources` — Water resources and supply; `hazards` — Floods, drought and coasts; `quality` — Water quality and sanitation.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `WAT-01` | Water supply and groundwater | Drinking and municipal water supply, water storage and groundwater management. | Water / Water resources and supply |
| `WAT-02` | River basins and transboundary water | Basin planning, water allocation between users and sectors, and transboundary water cooperation. | Water / Water resources and supply |
| `WAT-03` | Flood and coastal protection | Structural and nature-based flood, river-bank and coastal protection, and floodplain management. | Water / Floods, drought and coasts; Disaster Risk Management / Risk reduction, warning and preparedness |
| `WAT-04` | Water quality and reuse | Receiving-water quality, pollution control and water reuse. | Water / Water quality and sanitation |
| `WAT-05` | Glaciers, snow and mountain water | Changes in glaciers, snowpack and permafrost as water sources, and their monitoring or management. | Water / Water resources and supply |
| `WAT-06` | Drought management | Drought monitoring, drought plans, drought response measures and water-shortage management. | Water / Floods, drought and coasts |

### Nature, Forests & Land

Domain `nature_land` · prefix `NAT` · 5 home topics.

Forests, land, land degradation, biodiversity, ecosystems and land carbon.

Display groups: `forests_land` — Forests and land; `biodiversity` — Biodiversity and ecosystems.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `NAT-01` | Forest management and health | Forest management, afforestation, forest health and wildfire prevention in forests. | Nature, Forests & Land / Forests and land |
| `NAT-02` | Species, habitats and protected areas | Species conservation, habitats and protected-area systems. | Nature, Forests & Land / Biodiversity and ecosystems |
| `NAT-03` | Ecosystem restoration | Active restoration of degraded ecosystems such as wetlands, steppe and riparian zones. | Nature, Forests & Land / Biodiversity and ecosystems |
| `NAT-04` | Land carbon and removals | Land-use, land-use change and forestry (LULUCF) sinks, removals and their accounting. | Nature, Forests & Land / Forests and land; Climate / Economy-wide mitigation |
| `NAT-05` | Land degradation, desertification and salinity | Combating desertification, land degradation, sand encroachment, soil salinisation and erosion at landscape scale. | Nature, Forests & Land / Forests and land |

### Energy

Domain `energy` · prefix `ENE` · 7 home topics.

Energy supply, renewables, grids, efficiency, heating, fossil-fuel transition and methane.

Display groups: `supply` — Supply, renewables and grids; `demand` — Efficiency, heating and demand; `transition` — Fossil transition and methane.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `ENE-01` | Renewable electricity | Renewable power generation such as solar, wind, hydro and geothermal. | Energy / Supply, renewables and grids |
| `ENE-02` | Grids and energy storage | Transmission, distribution, grid flexibility and storage, including grid resilience. | Energy / Supply, renewables and grids; Settlements & Infrastructure / Critical infrastructure |
| `ENE-03` | Clean heating and fuels | District heating, heat pumps and cleaner heating or cooking fuels. | Energy / Efficiency, heating and demand |
| `ENE-04` | Energy efficiency and demand management | Economy-wide or cross-sector efficiency and demand management. | Energy / Efficiency, heating and demand |
| `ENE-05` | Fossil energy transition | Coal, oil and gas phase-down, fuel switching and transition of fossil energy systems. | Energy / Fossil transition and methane; Economy & Transition / Just transition and restructuring |
| `ENE-06` | Oil and gas methane | Methane leakage, venting and flaring in oil, gas and coal-mine operations. | Energy / Fossil transition and methane |
| `ENE-07` | Energy-system climate resilience | Exposure of power plants, hydropower and fuel supply to climate hazards, including drought and glacier loss affecting hydropower, heat affecting thermal plants, and the water-energy nexus. | Energy / Supply, renewables and grids; Settlements & Infrastructure / Critical infrastructure |

### Settlements & Infrastructure

Domain `settlements` · prefix `SET` · 3 home topics.

Buildings, settlements, land-use planning, urban heat and critical infrastructure. Membership does not establish urban geographic scope.

Display groups: `built` — Buildings and settlements; `infrastructure` — Critical infrastructure.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `SET-01` | Building energy performance | Building codes, retrofits and energy performance of buildings. | Settlements & Infrastructure / Buildings and settlements; Energy / Efficiency, heating and demand |
| `SET-02` | Resilient settlements, infrastructure and land-use planning | Risk-informed spatial and land-use planning, building safety, resilient housing, and continuity of public, communications and multi-utility infrastructure without a single sector home. | Settlements & Infrastructure / Buildings and settlements |
| `SET-03` | Urban heat and green space | Urban cooling, green and blue infrastructure, and parks. | Settlements & Infrastructure / Buildings and settlements; Nature, Forests & Land / Biodiversity and ecosystems |

### Transport

Domain `transport` · prefix `TRN` · 3 home topics.

Vehicles, fuels, mobility services and transport-network resilience.

Display groups: `low_emission` — Low-emission mobility; `resilience` — Transport resilience.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `TRN-01` | Low-emission vehicles and fuels | Vehicle efficiency, electric vehicles and low-carbon transport fuels. | Transport / Low-emission mobility |
| `TRN-02` | Public, active and shared mobility | Public transport, walking, cycling and shared mobility. | Transport / Low-emission mobility |
| `TRN-03` | Resilient transport networks | Protecting roads, rail, ports and airports from hazards and maintaining access. | Transport / Transport resilience; Settlements & Infrastructure / Critical infrastructure |

### Industry & Mining

Domain `industry` · prefix `IND` · 4 home topics.

Industrial production, processes, industrial resilience, mining and extractives.

Display groups: `production` — Production and processes; `mining` — Mining and extractives.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `IND-01` | Cleaner production and industrial efficiency | Industrial energy and resource efficiency and cleaner production. | Industry & Mining / Production and processes |
| `IND-02` | Process emissions and refrigerants | Industrial process emissions, F-gases and refrigerants. | Industry & Mining / Production and processes |
| `IND-03` | Industrial climate and disaster resilience | Protecting industrial sites and supply chains from hazards, including technological-accident risk. | Industry & Mining / Production and processes |
| `IND-04` | Mining and critical minerals | Climate and risk aspects of mining, critical minerals and extractive-sector transition, including tailings safety. | Industry & Mining / Mining and extractives |

### Health

Domain `health` · prefix `HEA` · 3 home topics.

Climate- and disaster-related health risks and health services.

Display groups: `risks` — Health risks; `services` — Health services and facilities.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `HEA-01` | Heat and human health | Heat-health action plans, heat-related illness and health protection during heat. | Health / Health risks |
| `HEA-02` | Climate-sensitive disease and exposure | Vector-, water- and food-borne disease, air quality and other climate-sensitive health exposures. | Health / Health risks |
| `HEA-03` | Resilient health services | Health-system preparedness, safe and continuous health facilities and surveillance capacity. | Health / Health services and facilities |

### Waste & Circular Economy

Domain `waste` · prefix `WST` · 3 home topics.

Materials and recycling, solid waste and landfill methane, wastewater.

Display groups: `circular` — Materials and circularity; `solid` — Solid waste and methane; `wastewater` — Wastewater.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `WST-01` | Materials, recycling and circularity | Waste prevention, recycling and circular-economy measures. | Waste & Circular Economy / Materials and circularity |
| `WST-02` | Solid-waste disposal and methane | Landfills, landfill gas and solid-waste disposal. | Waste & Circular Economy / Solid waste and methane |
| `WST-03` | Wastewater and sanitation | Sewerage, wastewater treatment and sanitation services. | Waste & Circular Economy / Wastewater; Water / Water quality and sanitation |

### Economy & Transition

Domain `economy` · prefix `ECO` · 2 home topics.

Economic diversification, economic resilience, just transition and restructuring of climate-exposed or fossil-dependent economies.

Display groups: `diversification` — Diversification and resilience; `transition` — Just transition and restructuring.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `ECO-01` | Economic diversification and resilience | Diversifying climate-exposed or fossil-dependent economies and strengthening economic resilience. | Economy & Transition / Diversification and resilience |
| `ECO-02` | Just transition and economic restructuring | Fair management of transition impacts on workers, regions and communities. | Economy & Transition / Just transition and restructuring |

### Livelihoods & Social Protection

Domain `livelihoods` · prefix `LIV` · 3 home topics.

Jobs and livelihood resilience, social protection and safety nets, and displacement, migration and planned relocation.

Display groups: `livelihoods` — Jobs and livelihoods; `protection` — Social protection and mobility.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `LIV-01` | Jobs and resilient livelihoods | Employment, skills for green jobs and livelihood resilience outside a single sector. | Livelihoods & Social Protection / Jobs and livelihoods |
| `LIV-02` | Social protection and safety nets | Cash transfers, adaptive and shock-responsive social protection, and safety nets. | Livelihoods & Social Protection / Social protection and mobility |
| `LIV-03` | Displacement, migration and planned relocation | Disaster and climate displacement, migration and planned relocation of communities. | Livelihoods & Social Protection / Social protection and mobility |

### Culture & Heritage

Domain `culture` · prefix `CUL` · 2 home topics.

Tangible and intangible heritage and local or traditional knowledge.

Display groups: `heritage` — Heritage and local knowledge.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `CUL-01` | Heritage risk, conservation and recovery | Hazard and climate-impact assessments of tangible or intangible heritage, and protecting, adapting and restoring heritage sites and cultural assets. | Culture & Heritage / Heritage and local knowledge |
| `CUL-03` | Local knowledge and cultural continuity | Traditional and local knowledge and cultural practices used or protected in climate and risk policy. | Culture & Heritage / Heritage and local knowledge |

### Education & Knowledge

Domain `education` · prefix `EDU` · 3 home topics.

Education, public awareness, research, data and knowledge systems.

Display groups: `awareness` — Education and awareness; `research` — Research and knowledge systems.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `EDU-01` | Climate and disaster education | Curricula, school programmes and formal or vocational education on climate and disaster risk. | Education & Knowledge / Education and awareness |
| `EDU-02` | Public awareness campaigns | Public awareness and behaviour campaigns on climate and disaster risk. | Education & Knowledge / Education and awareness |
| `EDU-03` | Research, data and knowledge systems | Research programmes and institutions, data infrastructure and knowledge-sharing platforms. | Education & Knowledge / Research and knowledge systems; Climate / Climate information and impacts |

### Tourism

Domain `tourism` · prefix `TOU` · 2 home topics.

Tourism systems, destinations and tourism-dependent livelihoods. Use only when the tourism sector is explicit.

Display groups: `tourism` — Tourism systems and destinations.

| Code | Topic | Definition | Display placements with home first |
|---|---|---|---|
| `TOU-01` | Tourism adaptation and destination resilience | Adapting tourism destinations and services to climate and disaster risk. | Tourism / Tourism systems and destinations |
| `TOU-02` | Tourism resource efficiency | Energy, water and waste efficiency in tourism. | Tourism / Tourism systems and destinations |

## Secondary displays

13 topics have a display in another domain. Each keeps one owner and one topic identity.

| Topic | Scoring home | Additional domain displays |
|---|---|---|
| `CLM-03` Climate observations, projections and impact assessment | Climate | Disaster Risk Management / Risk governance and knowledge |
| `AGR-01` Irrigation and farm water efficiency | Agriculture & Food | Water / Water resources and supply |
| `AGR-04` Food security and farm livelihoods | Agriculture & Food | Livelihoods & Social Protection / Jobs and livelihoods |
| `WAT-03` Flood and coastal protection | Water | Disaster Risk Management / Risk reduction, warning and preparedness |
| `NAT-04` Land carbon and removals | Nature, Forests & Land | Climate / Economy-wide mitigation |
| `ENE-02` Grids and energy storage | Energy | Settlements & Infrastructure / Critical infrastructure |
| `ENE-05` Fossil energy transition | Energy | Economy & Transition / Just transition and restructuring |
| `ENE-07` Energy-system climate resilience | Energy | Settlements & Infrastructure / Critical infrastructure |
| `SET-01` Building energy performance | Settlements & Infrastructure | Energy / Efficiency, heating and demand |
| `SET-03` Urban heat and green space | Settlements & Infrastructure | Nature, Forests & Land / Biodiversity and ecosystems |
| `TRN-03` Resilient transport networks | Transport | Settlements & Infrastructure / Critical infrastructure |
| `WST-03` Wastewater and sanitation | Waste & Circular Economy | Water / Water quality and sanitation |
| `EDU-03` Research, data and knowledge systems | Education & Knowledge | Climate / Climate information and impacts |

## Routing between neighboring topics

Read each row as: when this distinction arises, use the destination rather than forcing the statement into the starting topic. “As well” still requires substantive source evidence.

| Starting topic | When | Use |
|---|---|---|
| `CLM-01` | the subject is a finance or support mechanism | CLM-02 |
| `CLM-01` | the institution is a disaster-risk or civil-protection body | DRM-01 |
| `CLM-02` | an amount funds one sector project | the sector topic, with a finance fact |
| `CLM-02` | insurance, contingency funds or risk pools for disasters | DRM-05 |
| `CLM-03` | a multi-hazard risk assessment, hazard map or disaster-loss database | DRM-02 |
| `CLM-03` | operational forecasting for warnings | DRM-03 |
| `CLM-05` | climate observations or projections rather than reporting systems | CLM-03 |
| `CLM-06` | a target for one sector | the sector topic |
| `CLM-06` | a land sink or removals target | NAT-04 |
| `CLM-09` | losses from one disaster event reported without loss-and-damage framing | DRM-02 |
| `CLM-09` | a displacement or relocation programme | LIV-03 |
| `DRM-01` | climate strategy or climate coordination bodies | CLM-01 |
| `DRM-02` | climate projections or climate impact studies | CLM-03 |
| `DRM-03` | general public-awareness or education campaigns | EDU-02 |
| `DRM-03` | a physical flood defence | WAT-03 |
| `DRM-04` | flood or coastal defences | WAT-03 |
| `DRM-04` | settlement planning or building safety | SET-02 |
| `DRM-04` | hospital or health-facility safety | HEA-03 |
| `DRM-05` | general climate finance mobilisation | CLM-02 |
| `AGR-01` | municipal or household water supply | WAT-01 |
| `AGR-01` | solar-powered pumping is substantive | ENE-01 as well |
| `AGR-02` | landscape-scale degradation or desertification | NAT-05 |
| `AGR-02` | explicit soil-carbon accounting | NAT-04 |
| `AGR-03` | human health | HEA-02 |
| `WAT-01` | farm irrigation | AGR-01 |
| `WAT-01` | sanitation or wastewater | WST-03 |
| `WAT-02` | drought planning or drought response | WAT-06 |
| `WAT-02` | flood defences | WAT-03 |
| `WAT-03` | flood warning systems | DRM-03 |
| `WAT-03` | general settlement planning | SET-02 as well |
| `WAT-04` | wastewater treatment systems | WST-03 |
| `WAT-05` | a glacial-lake outburst flood as an event or warning | labels.hazards = glacial_lake_outburst; use DRM-02 for risk or event-loss evidence, or DRM-03 for warning and preparedness |
| `WAT-06` | drought warnings | DRM-03 as well |
| `WAT-06` | on-farm drought adaptation such as crops or fodder | AGR-02 or AGR-03 as well |
| `NAT-01` | a carbon-only forest target | NAT-04 |
| `NAT-02` | active restoration of degraded ecosystems | NAT-03 |
| `NAT-04` | biodiversity benefits are claimed | NAT-02 or NAT-03 only with evidence |
| `NAT-05` | on-farm soil practices | AGR-02 |
| `ENE-02` | a generating plant without grid measures | ENE-01 or ENE-05 |
| `ENE-03` | vehicle fuels | TRN-01 |
| `ENE-04` | a building, industrial or transport measure | SET-01, IND-01 or TRN-01 |
| `ENE-05` | worker and community impacts of the transition | ECO-02 as well |
| `ENE-06` | landfill methane | WST-02 |
| `ENE-06` | livestock methane | AGR-03 |
| `ENE-07` | transmission or distribution network resilience | ENE-02 |
| `ENE-07` | glacier and snowmelt water supply as such | WAT-05 |
| `SET-02` | energy, transport or water networks | ENE-02, TRN-03 or WAT-01 |
| `SET-03` | heat-health action plans | HEA-01 |
| `IND-01` | process gases or refrigerants | IND-02 |
| `IND-04` | coal phase-down for energy | ENE-05 |
| `HEA-03` | general civil protection | DRM-06 |
| `LIV-01` | farm livelihoods | AGR-04 |
| `LIV-01` | tourism-dependent livelihoods | TOU-01 as well |
| `CUL-03` | local knowledge applied within a sector practice, such as herding or irrigation | the sector topic; add CUL-03 only when the knowledge itself is the subject |
| `EDU-02` | dissemination of warnings for a specific hazard | DRM-03 |
| `EDU-03` | climate observations or projections themselves | CLM-03 |
| `EDU-03` | risk or loss databases | DRM-02 |

## Boundaries and limitations to review

| Boundary | Routing rule |
|---|---|
| Farm water versus municipal supply | AGR-01 versus WAT-01; related placement does not create another score. |
| Physical flood protection versus warning | WAT-03 versus DRM-03; a sector defence is not automatically a generic DRM programme. |
| Climate versus disaster institutions | CLM-01 versus DRM-01, according to the actual institution/function. |
| Finance mechanism versus sector project | CLM-02 or DRM-05 for the mechanism; keep a sector project's amount/status with its sector record. |
| Ecosystem restoration versus species protection | NAT-03 versus NAT-02; both require substantive distinct evidence. |
| Cross-sector versus sector efficiency | ENE-04 versus SET-01, IND-01 or TRN-01. |
| Climate data versus sector impacts | CLM-03 when climate observation/assessment itself is substantive; the sector topic for its sector impact. |
| Result versus response | A reported effect alone does not establish policy attribution, implementation or delivery. |

Some topics are intentionally broad: **SET-02** spans settlement/infrastructure/land-use resilience; **DRM-03** covers warning and preparedness; **AGR-04** combines food security and farm livelihoods; **CLM-02** includes finance and support arrangements; **EDU-03** combines research, data and knowledge systems. One detailed response can establish a topic's highest documentation band without covering every aspect in its definition.

Keep those codes initially rather than proliferating indicators. Show the concrete qualifying response and count of responses with details. Never label the topic “fully covered.” Repeated distinct policy questions or recurring unmapped evidence may justify a future explicit split; silence or a low band does not.

Regional focus views can emphasize water scarcity/drought, transboundary water, mountain water, agriculture, warning/preparedness, energy transition, finance or inclusion when relevant to the actual country group. They are saved views, not automatic country-by-country topic exclusions. Preserve the shared 64-topic basket until an explicit common profile changes it.


<!-- BEGIN GENERATED LABEL OPTIONS -->
## Complete label and field choices

This inventory is a readable view of [labels.json](../pipeline/labels.json). The JSON file is the machine authority; the strict LLM schema compiles its enabled choices. These documentation pages are not LLM input. All options are retained for customization, including disabled modules.

### Required statement type

Choose one type for each source assertion. The stage column is a source assertion stage, not a documentation band or numerical score. A priority risk is `concern`; only an attributable policy undertaking is `commitment`.

| Code | Meaning | Source assertion stage |
|---|---|---|
| `concern` | A stated risk, vulnerability, impact, need, barrier or gap | None |
| `context` | A current or historical condition, capacity or baseline | None |
| `projection` | A modeled or expected future condition, not a policy undertaking | None |
| `commitment` | An attributable policy goal, priority or target | 1 |
| `planned_action` | A specific planned measure, programme or instrument | 2 |
| `implementation_underway` | Explicit implementation, procurement, construction or operation of the identified action | 3 |
| `output_delivered` | Explicitly completed, installed or adopted output of the identified action | 4 |
| `result_reported` | A reported outcome or effect; does not by itself prove causation or target achievement | None |
| `proposal` | A recommendation without an attributable adopted undertaking | None |
| `other` | Relevant sourced statement that no listed type fits | None |

### Core and optional facets

`many` allows zero or more supported choices. `one_or_null` allows one choice or null. Empty arrays mean no supported entries extracted, not that the concept is absent. Disabled fields are omitted from routine extraction; they are not silently populated as negative findings.

| Field | Module / default | Selection | Every allowed choice |
|---|---|---|---|
| `purpose` | core; on | `many` | `adaptation`, `mitigation`, `disaster_risk_reduction` |
| `geographic_scope` | core; on | `one_or_null` | `local`, `subnational`, `national`, `transboundary`, `regional`, `EU`, `global` |
| `hazards` | core; on | `many` | `flood`, `heavy_precipitation`, `drought`, `water_scarcity`, `extreme_heat`, `extreme_cold`, `storm_wind`, `dust_sand_storm`, `wildfire`, `landslide_mudflow`, `avalanche`, `glacial_lake_outburst`, `glacier_permafrost_loss`, `desertification_land_degradation`, `sea_level_rise`, `coastal_hazard`, `disease_biological`, `earthquake`, `tsunami`, `technological`, `compound_cascading` |
| `themes` | additional_context; off | `many` | `gender_equality`, `social_inclusion`, `poverty_inequality`, `participation`, `capacity_building`, `technology_transfer`, `transboundary_cooperation`, `nature_based_solutions` |
| `affected_groups` | additional_context; off | `many` | `women`, `men`, `children`, `youth`, `older_people`, `persons_with_disabilities`, `low_income_households`, `farmers`, `herders`, `fishers`, `rural_communities`, `urban_communities`, `workers`, `indigenous_local_communities`, `migrants_displaced_people` |
| `policy_instruments` | core; on | `many` | `strategy_plan`, `law_regulation`, `standard_code`, `public_investment`, `subsidy_incentive`, `tax_pricing`, `market_mechanism`, `insurance_risk_finance`, `institution_coordination`, `information_warning`, `research_data`, `training_capacity`, `ecosystem_management`, `infrastructure_service` |
| `risk_component` | specialist_risk; off | `many` | `hazard`, `exposure`, `vulnerability`, `capacity`, `impact`, `residual_risk`, `systemic_cascading_risk` |
| `risk_function` | specialist_risk; off | `many` | `risk_understanding`, `risk_prevention_reduction`, `early_warning_preparedness`, `anticipatory_action`, `emergency_response`, `recovery_reconstruction`, `coping_continuity`, `systemic_transformation` |

Hazards include non-climate disasters because the scope includes disaster risk. A hazard label does not establish climate causation. `purpose` needs evidence of adaptation, mitigation or disaster-risk reduction; an energy-sector mention alone is insufficient. Geographic scope follows the assertion, not the country metadata.

### Fact qualifiers

These are qualifiers of the original number. They do not add points. Preserve source wording when a structured option would lose a qualification.

| Field | Every allowed choice |
|---|---|
| `fact_type` | `target`, `observation`, `projection`, `finance`, `indicator` |
| `conditionality` | `unconditional`, `conditional`, `not_stated` |
| `comparator` | `equal`, `at_least`, `at_most`, `range`, `approximate`, `not_stated` |
| `direction` | `increase`, `decrease`, `maintain`, `complete`, `not_stated` |
| `basis` | `absolute`, `historical_reduction`, `BAU_reduction`, `intensity`, `share`, `other`, `not_stated` |
| `total_or_additional` | `total`, `additional`, `not_stated` |
| `finance_status` | `need_or_estimate`, `requested`, `pledged`, `committed`, `allocated`, `mobilized`, `disbursed`, `spent`, `not_stated` |

`BAU_reduction` means reduction against a business-as-usual pathway; `historical_reduction` means reduction against a historical baseline. `not_stated` records missing source detail. Finance states distinguish an estimate, promise, allocation and actual spending. Never treat them as interchangeable.

### Actor roles

| Code | Meaning |
|---|---|
| `responsible` | Organization explicitly responsible for the response. |
| `implementing` | Organization explicitly delivering the response. |
| `financing` | Provides or arranges finance; not automatically the implementer. |
| `supporting` | Supports another actor or response. |
| `monitoring_reporting` | Tracks, evaluates or reports. |
| `consulted` | Participates in consultation. |
| `unspecified` | Named actor without a stated role. |

The lean raw contract structures the delivery actor only. Other actors remain in the source statement and quotes. The full role vocabulary stays available, but there is no promise of a complete structured actor inventory.

### Delivery fields

| Field | Every allowed choice | Qualification |
|---|---|---|
| `timeframe.anchor` | `action`, `publication` | Only action timing qualifies; publication date alone does not. |
| `deliverable.kind` | `quantified_output`, `named_asset`, `named_legal_instrument`, `named_milestone`, `generic_action` | The four specific kinds can qualify; generic_action cannot. |

The three checks are **who, when and what specifically**. Each is null or a source-linked detail. All must concern the same coherent response and compatible variant; a shared programme name is not enough. See the [field dictionary](../reference/DATA-DICTIONARY.md).

### Relationships

| Code | Meaning |
|---|---|
| `restates` | Equivalent assertion of the same proposition; preserve both sources. |
| `progress_of` | Explicit implementation/output update for the same response. |
| `supports` | Separate assertion supplies support; it does not inherit or donate a band. |
| `contextualizes` | Separate assertion supplies conditions, capacity or background. |
| `revises` | Source evidences an amendment to the same proposition. |
| `supersedes` | Source explicitly replaces the earlier assertion; recency alone is insufficient. |
| `part_of` | Source establishes a component or parent relationship. |
| `contradicts` | Comparable assertions disagree without an evidenced resolution. |
| `not_comparable` | Preserve related assertions whose quantity, scope, basis or conditions prevent comparison. |

Comparability options: `comparable`, `not_comparable`, `insufficient_detail`. These are separate from relationship type. The same subject and a different number do not by themselves establish a contradiction.

### Explicit priority evidence

Enabled initially. This is a nullable field, **not a new facet, rank or weight**. Raw shape: `{text, evidence_refs}`; normalized shape: `{text, evidence_ids}`. Text quotes the exact wording that identifies the concern, need or response as a priority. No qualifying wording means null. Repetition, hazard severity and model judgement do not create priorities.

### Automatic states and user controls

| Field | Every allowed choice |
|---|---|
| `automatic_state` | `passed`, `repairing`, `evidence_unavailable`, `organization_partial` |
| `user_overlay.visibility` | `visible`, `hidden` |
| `user_overlay.flags` | `incorrect`, `duplicate`, `wrong_topic`, `outdated`, `other` |

Automatic states describe processing, not truth or approval. User flags and hiding are recoverable controls after publication. They do not create a required moderation step or silently change the standard benchmark.

<!-- END GENERATED LABEL OPTIONS -->
