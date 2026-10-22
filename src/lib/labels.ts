import catalogue from "../../config/labels.json";
import { STATEMENT_TYPES, statementTypeLabel } from "./statement-types";

/** One active catalogue for extraction, validation, discovery and exports. */
export const LABEL_VERSION = catalogue.version;
export const LABEL_CATALOGUE = catalogue;
export type Facet = keyof typeof catalogue.facets;
export const FACETS = Object.keys(catalogue.facets) as Facet[];
export const FACET_NAMES: Record<Facet, string> = {
  purpose: "Purpose", geographic_scope: "Geographic scope", hazards: "Hazards",
  themes: "Cross-cutting themes", affected_groups: "Affected groups", policy_instruments: "Policy instruments",
  risk_component: "Risk components", risk_function: "Risk functions",
};
export function labelName(value: string) {
  if (STATEMENT_TYPES.some(type => type.id === value) || value === "underway" || value === "delivered") return statementTypeLabel(value);
  const names: Record<string, string> = { EU: "European Union", BAU_reduction: "Reduction from business as usual", disaster_risk_reduction: "Disaster risk reduction" };
  return names[value] ?? value.replaceAll("_", " ").replace(/^\w/, c => c.toUpperCase());
}
export interface EvidencedLabel { value: string; quotes: string[] }
export interface LabeledFact {
  fact_type: string;
  target_kind: string | null;
  text: string;
  metric: string | null;
  value_as_stated: string | null;
  unit: string | null;
  period: string | null;
  baseline_as_stated: string | null;
  comparator: string;
  direction: string;
  basis: string;
  total_or_additional: string;
  conditionality: string;
  finance_status: string;
  quotes: string[];
}
export interface Classification {
  statement_type: EvidencedLabel;
  labels: Record<Facet, EvidencedLabel[]>;
  facts: LabeledFact[];
  actors: Array<{ name: string; role: string; quotes: string[] }>;
  priority: { text: string; quotes: string[] } | null;
}
export interface SourceClassification {
  sourceId: string;
  documentId: string;
  classification: Classification;
}
/** Read additive enrichment; absent means not classified, never an empty negative finding. */
export function readClassification(finding: Record<string, unknown>): Classification | undefined {
  const c = finding.classification as Classification | undefined;
  if (!c?.statement_type || !c.labels || !Array.isArray(c.facts) || !FACETS.every(f => Array.isArray(c.labels[f]))) return undefined;
  return c;
}
export type LabelDimension = Facet | keyof typeof catalogue.fact_enums | "statement_type" | "target_kind" | "actor_role";
export const DIMENSION_NAMES: Record<LabelDimension, string> = {
  statement_type: "Statement type", fact_type: "Fact type", target_kind: "Target kind", ...FACET_NAMES,
  conditionality: "Conditionality", comparator: "Comparator", direction: "Direction",
  basis: "Basis", total_or_additional: "Total or additional", finance_status: "Finance status", actor_role: "Actor role",
};
export function labelOptions(dimension: LabelDimension, observed: string[] = []) {
  const predefined = dimension === "statement_type" ? STATEMENT_TYPES.map(type => type.id)
    : dimension === "target_kind" ? ["quantitative", "deliverable", "qualitative"]
    : dimension === "actor_role" ? catalogue.actor_roles
    : dimension in catalogue.fact_enums ? catalogue.fact_enums[dimension as keyof typeof catalogue.fact_enums]
    : catalogue.facets[dimension as Facet].options;
  return [...new Set([...predefined, ...observed])].map(id => ({ id, label: labelName(id) }));
}
export function classificationValues(classifications: Classification[], dimension: LabelDimension): string[] {
  return [...new Set(classifications.flatMap(c => dimension === "statement_type" ? [c.statement_type.value]
    : dimension === "actor_role" ? c.actors.map(actor => actor.role)
    : dimension in catalogue.fact_enums || dimension === "target_kind"
      ? c.facts.flatMap(f => { const value = f[dimension as keyof LabeledFact]; return typeof value === "string" ? [value] : []; })
      : c.labels[dimension as Facet].map(label => label.value)))].sort();
}
