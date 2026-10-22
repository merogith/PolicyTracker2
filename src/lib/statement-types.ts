import catalogue from "../../config/labels.json";
import type { Classification } from "./labels";
import type { Unit } from "./topic-merge";

/** Shared by badges, filters, action counts and claim scoring. */
export const STATEMENT_TYPES = catalogue.statement_type.options.map(option => ({
  id: option.id,
  label: ({
    planned_action: "Planned action",
    implementation_underway: "Underway",
    output_delivered: "Delivered",
    result_reported: "Result reported",
  } as Record<string, string>)[option.id] ?? option.id.replace(/^./, c => c.toUpperCase()),
  points: option.response_stage ?? 0,
  meaning: option.meaning,
}));

export function canonicalStatementType(value: string | null | undefined): string | null {
  if (!value) return null;
  return ({ underway: "implementation_underway", delivered: "output_delivered" } as Record<string, string>)[value] ?? value;
}

export function statementTypeLabel(value: string | null): string {
  if (value === null) return "Not classified";
  if (value === "mixed") return "Mixed statement types";
  return STATEMENT_TYPES.find(type => type.id === canonicalStatementType(value))?.label
    ?? value.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
}

export function statementTypePoints(value: string | null): number | null {
  return STATEMENT_TYPES.find(type => type.id === canonicalStatementType(value))?.points ?? null;
}

export function findingStatementType(finding: { kind: string | null; classification?: Classification }) {
  return canonicalStatementType(finding.classification?.statement_type.value ?? finding.kind);
}

/** A detailed source classification supersedes the older broad response kind. Missing is not Other. */
export function unitStatementTypes(unit: Unit): Array<string | null> {
  if (unit.supportingFindings?.length) {
    const types = unit.supportingFindings.map(findingStatementType);
    if (unit.sourceFindingsComplete === false) types.push(null);
    return [...new Set(types)];
  }
  if (unit.classifications?.length) {
    const types = unit.classifications.map(c => canonicalStatementType(c.classification.statement_type.value));
    return [...new Set(types)];
  }
  return [canonicalStatementType(unit.kind)];
}

export function groupStatementType(units: Unit[]): string | null {
  const types = [...new Set(units.flatMap(unitStatementTypes))];
  return types.length > 1 ? "mixed" : types[0] ?? null;
}
