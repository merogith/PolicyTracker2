# Taxonomy for the regional climate and disaster policy tracker

**Recommended specification v2.0.0, not activated.** This review catalogue preserves all **16 domains and 64 topic IDs** and their existing scoring homes. The scope remains regional climate action and disaster risk, including relevant sector policy. It does not expand into general development policy.

Read the domain and topic tables to review subject coverage; read **Complete label choices** for every permitted statement type and label option. [DATA-DICTIONARY.md](DATA-DICTIONARY.md) explains the remaining data fields. The four documentation bands are defined in [SCORING.md](SCORING.md); adding labels never earns extra points.

The existing catalogue is broad enough for the intended scope. The useful improvement is clearer routing and ownership: each topic has one scoring home, claims have one primary topic, and secondary placements provide cross-links without duplicate counts. Keep specialist risk-function and risk-component labels disabled initially.

## Editable source and maintenance

The editable specification source is [config/taxonomy.json](config/taxonomy.json). Its `proposal_metadata` records the source file, source version, preserved counts and change log. It is a versioned copy of [the existing seed taxonomy](../../../fresh-start/config/taxonomy.json), not an active database revision. The application does not load this proposal file.

The domain and topic inventory and routing tables below mirror this JSON. **Until the planned export generator is connected, regenerate these sections and recheck counts and IDs after a JSON edit. The application does not synchronize these proposal documents.** The intended UI editor saves the same versioned configuration bundle and exports these guides; it must not maintain a second vocabulary. Do not change a topic definition only in this Markdown file.

## Refinements in this specification

| Item | Change | Effect |
|---|---|---|
| NAT-03 Ecosystem restoration | Keep Nature / Biodiversity and ecosystems; remove the second Nature / Forests and land placement. | One group within Nature. The definition and topic ID are unchanged. |
| SET-02 Resilient settlements, infrastructure and land-use planning | Keep Settlements / Buildings and settlements; remove the second Settlements / Critical infrastructure placement. | One group within Settlements. Infrastructure remains in the topic definition. |
| WAT-05 Glaciers, snow and mountain water | Name `labels.hazards = glacial_lake_outburst`; route risk or loss evidence to DRM-02 and warning/preparedness to DRM-03. | A hazard label describes the hazard; the topic describes what the statement is about. |
| Ownership and comparison rules | Add primary-topic ownership, explicit home_domain_id and shared comparison profiles. | Display order cannot change scoring; secondary displays do not multiply a topic's score. |

No topic is added, removed, renamed or broadened. The two removed placements are duplicate groups within the same domain, not links to another domain. All domain groups are retained because they may be used by other topics.

## How an extracted statement gets a topic

Choose one `primary_topic_id` for the main proposition and only substantively supported `secondary_topic_ids`. The allowed values are the 64 codes in the inventory below. If none fits, retain the record with no primary topic and an `unmapped_concepts` description; do not invent a code or force a poor fit.

Domains, groups and scoring homes are derived from the chosen topic. They are not separate model guesses. An agriculture measure about efficient irrigation normally belongs to AGR-01; its placement also makes it visible under Water. A sector action does not need a generic DRM topic merely because it reduces risk.

Subject, statement type, progress and context answer different questions. The topic says what the statement concerns. Statement type distinguishes context, target, plan and reported delivery. Optional labels describe hazards, policy purposes, inclusion, instruments and other evidence-backed context. Those label options belong to the companion label configuration; they do not create extra topics. A `result_reported` statement alone is context: do not infer an attributable policy response, implementation or achievement from a reported change.

## How records from several documents are organized

The `primary_topic_id` assigns the canonical stage-2 owner. Topic packs may be processed together in one domain call, but each resulting claim retains one primary topic and one identity. Secondary tags can pull related records into another pack as read-only supporting context. That pack may reference their evidence; it cannot create a second owner for the same claim.

For example, an NDC irrigation target and a NAP irrigation-capacity observation can be organized under AGR-01. The target and capacity observation retain separate claim IDs, joined by a contextualizes link. Water displays these same linked claims without creating new identities. Existing capacity does not establish delivery of the future target. Conflicting targets remain separate variants with explicit links and sources rather than being averaged.

A shared programme name also does not make every assertion the same intervention. “Irrigate 100,000 hectares” and “rehabilitate canals” can belong to one programme but remain different propositions. A ministry named for canal rehabilitation cannot automatically supply the missing responsible actor for the area target. Code assigns country-scoped `policy_object_id` values after evidence-based identity reconciliation; the LLM does not invent global identities.

## Comparison rules

The default `regional-climate-disaster-64` profile includes all 64 topics in this taxonomy version. Each topic contributes to its explicit `home_domain_id` only. A claim has one primary owner. Directly qualifying evidence may establish documentation in a substantively assigned secondary topic, but a tag or supporting link alone establishes nothing. Secondary domain placements display the same topic band without adding another topic to a denominator.

The country comparison denominator is shared. Compare the distribution of topics across the four bands, with processing coverage alongside it; do not average band numbers. Missing evidence does not mean the topic is irrelevant or the policy does not exist. Incomplete processing is not the lowest documentation band. A result describes the supplied policy documentation, not independently verified national performance.

Optional regional profiles can later select a smaller common set, such as mountain-water topics, but every compared country must use the same versioned topic selection and rules. No country-by-country exclusions are inferred from silence. A smaller UI focus view only filters display and does not change scores or denominators.

## Taxonomy fields available to edit

| Field | Meaning and effect |
|---|---|
| Catalogue `id`, `version`, `status` | Identity and version of this proposed vocabulary. A semantic change requires a new version. |
| `rules` | Scope, assignment, ownership and comparison rules shared by prompts and code. |
| Domain `id`, `prefix`, `label`, `definition` | Stable machine code, historical topic prefix, readable name and inclusion boundary. |
| Domain `groups` | Display groups with an `id` and `label`; these are not scoring units. All choices appear below. |
| Topic `id`, `label`, `definition` | Stable topic code, readable name and substantive inclusion boundary. |
| Topic `home_domain_id` | Explicit organization/scoring owner. Reordering display placements cannot change it. |
| Topic `placements` | `domain`/`group` pairs controlling where the same topic appears in the UI. |
| Topic `routing` | `when`/`use` hints distinguishing neighboring topics and optional labels. |
| Topic `legacy_ids`, `split_from` | Historical lineage; no new selectable topic codes are created by these fields. |
| `ownership_policy`, `comparison_policy` | Processing and counting rules, including the common topic profile. |
| `proposal_metadata` | Source provenance, preserved counts and change notes; not LLM evidence. |

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

## Overlap and possible gaps

The current catalogue covers the intended climate and disaster-risk scope without a compelling need for new domains. Preserve IDs and test the existing definitions on the document corpus before expanding it. Repeated `unmapped_concepts` are candidates for a future taxonomy revision; they do not automatically create topics.

| Boundary | Recommended interpretation |
|---|---|
| Climate observations versus sector impacts | Use the sector topic for a sector impact. Add CLM-03 when climate observation, modelling or assessment is itself substantive. A later routing revision can make this rule explicit. |
| Climate governance versus disaster governance | Use CLM-01 for climate institutions and DRM-01 for disaster-risk or civil-protection institutions. Shared words such as strategy do not justify both. |
| Finance versus a funded sector action | Use CLM-02 when the climate finance or support mechanism is the subject; keep project amounts with the sector record as finance facts. Use DRM-05 for disaster-risk finance. |
| Irrigation versus municipal supply | AGR-01 covers farm water and is displayed in Water. WAT-01 covers drinking, municipal and groundwater supply. |
| Water quality versus wastewater infrastructure | WAT-04 covers receiving-water quality and reuse; WST-03 covers treatment, sewerage and sanitation services. |
| Ecosystem restoration versus species conservation | NAT-03 covers active restoration; NAT-02 covers species, habitats and protected-area systems. Tag both only when both propositions are substantive. |
| Energy efficiency versus sector efficiency | ENE-04 is cross-sector; use SET-01, IND-01 or TRN-01 for a specified sector measure. |
| Generic risk reduction versus a sector measure | DRM-04 is a residual home for cross-sector programmes. Prefer flood protection, settlement safety or health-service topics when those are the actual subject. |
| Inclusion, technology and nature-based solutions | Keep these as context labels, not additional domains. The main topic still describes the action or condition. |
| Sparse or geographically specific topics | Keep them in the catalogue. Shared comparison profiles may later define a narrower common set; lack of evidence alone never changes applicability. |

Possible future refinements, such as separating adaptation monitoring, coastal ecosystem management or particular energy technologies, require repeated evidence that current topics cannot represent an actionable distinction. They are not additions in this specification.

## Editing rules

Keep codes stable when changing a label or display placement. A code is not reused for a new meaning. Organizational moves may preserve the code even if its historical prefix differs from the new home; semantic splits and merges require recorded lineage and a new taxonomy version.

Change display order or groups without re-extracting documents. Changes to meaning or routing require affected records to be reclassified and claims rebuilt; expanded scope may require extraction again because retagging cannot discover evidence that was never extracted. Scores must use the taxonomy and comparison-profile versions stored with the result.

Changing home_domain_id is different from changing display order: rebuild the old/new owning packs and recompute a new comparison-profile version. Moving a display placement cannot implicitly change this field.

The proposed UI editor should show the definition, home placement, secondary placements, routing hints and impact of an edit in one place. Configuration edits do not introduce a human approval stage for individual pipeline outputs. Processing and publication remain automatic; post-publication visibility controls remain separate from taxonomy meaning.

<!-- BEGIN GENERATED LABEL OPTIONS -->
## Complete label choices

This inventory mirrors [config/labels.json](config/labels.json). The pipeline should compile enabled choices into its strict output schema and generate this review section from the same bundle. These proposal documents are not yet synchronized by the running app.

### Statement type

Select one per atomic record. Response stages are separate from documentation bands; the model returns the type and code derives the stage. A reported effect alone remains context without an attributable response assertion.

| Code | Meaning | Source assertion stage |
|---|---|---|
| `concern` | A stated risk, vulnerability, impact, need, barrier or gap | None |
| `context` | A current or historical condition, capacity or baseline | None |
| `projection` | A modeled or expected future condition, not a policy undertaking | None |
| `commitment` | An attributable policy goal, priority or target | Commitment |
| `planned_action` | A specific planned measure, programme or instrument | Planned |
| `implementation_underway` | Explicit implementation, procurement, construction or operation of the identified action | Underway |
| `output_delivered` | Explicitly completed, installed or adopted output of the identified action | Delivered |
| `result_reported` | A reported outcome or effect; does not by itself prove causation or target achievement | None |
| `proposal` | A recommendation without an attributable adopted undertaking | None |
| `other` | Relevant sourced statement that no listed type fits | None |

### Context labels

Only select supported options. “Many” means zero or more. “One or null” permits unknown. Empty arrays do not mean absent. A climate/disaster document title alone does not establish purpose. Mitigation means reducing greenhouse-gas emissions or increasing removals; flood mitigation belongs to disaster risk reduction.

| Field | Selection and initial setting | Allowed options |
|---|---|---|
| `purpose` | Zero or more; enabled | `adaptation`, `mitigation`, `disaster_risk_reduction` |
| `geographic_scope` | One or null; enabled | `local`, `subnational`, `national`, `transboundary`, `regional`, `EU`, `global` |
| `hazards` | Zero or more; enabled | `flood`, `heavy_precipitation`, `drought`, `water_scarcity`, `extreme_heat`, `extreme_cold`, `storm_wind`, `dust_sand_storm`, `wildfire`, `landslide_mudflow`, `avalanche`, `glacial_lake_outburst`, `glacier_permafrost_loss`, `desertification_land_degradation`, `sea_level_rise`, `coastal_hazard`, `disease_biological`, `earthquake`, `tsunami`, `technological`, `compound_cascading` |
| `themes` | Zero or more; enabled | `gender_equality`, `social_inclusion`, `poverty_inequality`, `participation`, `capacity_building`, `technology_transfer`, `transboundary_cooperation`, `nature_based_solutions` |
| `affected_groups` | Zero or more; enabled | `women`, `men`, `children`, `youth`, `older_people`, `persons_with_disabilities`, `low_income_households`, `farmers`, `herders`, `fishers`, `rural_communities`, `urban_communities`, `workers`, `indigenous_local_communities`, `migrants_displaced_people` |
| `policy_instruments` | Zero or more; enabled | `strategy_plan`, `law_regulation`, `standard_code`, `public_investment`, `subsidy_incentive`, `tax_pricing`, `market_mechanism`, `insurance_risk_finance`, `institution_coordination`, `information_warning`, `research_data`, `training_capacity`, `ecosystem_management`, `infrastructure_service` |
| `risk_component` | Zero or more; optional; disabled | `hazard`, `exposure`, `vulnerability`, `capacity`, `impact`, `residual_risk`, `systemic_cascading_risk` |
| `risk_function` | Zero or more; optional; disabled | `risk_understanding`, `risk_prevention_reduction`, `early_warning_preparedness`, `anticipatory_action`, `emergency_response`, `recovery_reconstruction`, `coping_continuity`, `systemic_transformation` |

Specialist `risk_component` and `risk_function` remain optional and disabled. Activating them expands classification output, not topic count or scoring weights. Earthquake and technological hazards remain valid disaster-risk context without implying climate causation.

### Fact qualifiers

These preserve the meaning of numerical statements. Extra populated fields do not earn points. Select the exact listed code; use `not_stated` where supplied, or null for an inapplicable optional field.

| Field | All allowed options |
|---|---|
| `fact_type` | `target`, `observation`, `projection`, `finance`, `indicator` |
| `conditionality` | `unconditional`, `conditional`, `not_stated` |
| `comparator` | `equal`, `at_least`, `at_most`, `range`, `approximate`, `not_stated` |
| `direction` | `increase`, `decrease`, `maintain`, `complete`, `not_stated` |
| `basis` | `absolute`, `historical_reduction`, `BAU_reduction`, `intensity`, `share`, `other`, `not_stated` |
| `total_or_additional` | `total`, `additional`, `not_stated` |
| `finance_status` | `need_or_estimate`, `requested`, `pledged`, `committed`, `allocated`, `mobilized`, `disbursed`, `spent`, `not_stated` |

### Actor and delivery checks

**Actor roles:** `responsible`, `implementing`, `financing`, `supporting`, `monitoring_reporting`, `consulted`, `unspecified`.

A `responsible` or `implementing` organization may satisfy the actor check. Other roles remain useful context. No separate policy-status enum is needed.

| Field | Allowed options |
|---|---|
| `timeframe_anchor` | `action`, `publication` |
| `deliverable_kind` | `quantified_output`, `named_asset`, `named_legal_instrument`, `named_milestone`, `generic_action` |

`action` means a source-stated action date or period; `publication` never satisfies delivery timing. A generic action such as “rehabilitate canals” is not a specific deliverable. “Rehabilitate Canal 17” names an asset. All three delivery details must concern the same compatible response, not merely the same broad programme.

### Relationships and operational choices

| Field | All allowed options |
|---|---|
| Relationship `type` | `restates`, `progress_of`, `supports`, `contextualizes`, `revises`, `supersedes`, `part_of`, `contradicts`, `not_comparable` |
| `comparability` | `comparable`, `not_comparable`, `insufficient_detail` |
| `automatic_state` | `passed`, `repairing`, `evidence_unavailable`, `organization_partial` |
| Overlay `visibility` | `visible`, `hidden` |
| Overlay `flags` | `incorrect`, `duplicate`, `wrong_topic`, `outdated`, `other` |

Automatic states describe machine checks, not human approval. Supports/contextualizes links retain separate claims; neither upgrades delivery detail or stage. Supersession needs explicit replacement evidence. Contradiction needs a comparable basis.

Visibility and flags are post-publication controls. Hiding changes presentation by default; explicit analytical exclusions create a separately labelled adjusted snapshot. The generated regional benchmark remains reproducible.

<!-- END GENERATED LABEL OPTIONS -->
