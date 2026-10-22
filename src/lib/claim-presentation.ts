import { readClassification, type Classification } from "./labels";
/** Display fields are separate from the complete statement and its evidence. */
export interface FindingFigure {
  label?: string;
  value_as_stated: string;
  value?: string | null;
  unit: string | null;
  period: string | null;
  conditionality: string;
}
export interface FindingCitation {
  id: string; documentId: string; page: number; quote: string; verified: boolean; citedPage?: number;
}
export interface SupportingFinding {
  id: string; documentId: string; title?: string; summary?: string;
  text: string; kind: string | null; figures: FindingFigure[]; citations: FindingCitation[];
  classification?: Classification;
}
export type FindingRef = { resultId: string; path: string };
type Json = Record<string, unknown>;
interface FindingCitationWithPath extends FindingCitation { itemPath: string }

export function sourceFindingIndex(results: Array<{ id: string; documentId: string | null; output: unknown; citations: FindingCitationWithPath[] }>) {
  const index = new Map<string, SupportingFinding>();
  for (const result of results) {
    if (!result.documentId) continue;
    const output = result.output as { findings?: Json[] } | null;
    for (const [i, finding] of (output?.findings ?? []).entries()) {
      const path = `findings.${i}`;
      const id = `${result.id}#${path}`;
      index.set(id, {
        id, documentId: result.documentId,
        title: typeof finding.title === "string" ? finding.title : undefined,
        summary: typeof finding.summary === "string" ? finding.summary : undefined,
        text: String(finding.text ?? ""), kind: typeof finding.kind === "string" ? finding.kind : null,
        figures: (finding.figures ?? []) as FindingFigure[],
        classification: readClassification(finding),
        citations: result.citations.filter(c => c.itemPath === path),
      });
    }
  }
  return index;
}
export function resolveSupportingFindings(refs: FindingRef[], index: Map<string, SupportingFinding>, copiedEvidence?: FindingCitation[]): SupportingFinding[] {
  return [...new Set(refs.map(ref => `${ref.resultId}#${ref.path}`))]
    .flatMap(id => {
      const finding = index.get(id);
      if (!finding) return [];
      // A document re-run can replace positional findings. Never attach a replacement with different evidence.
      if (copiedEvidence && (!finding.citations.length || finding.citations.some(source => !copiedEvidence.some(c => c.documentId === source.documentId && c.page === source.page && c.quote === source.quote)))) return [];
      return [finding];
    });
}
export function uniqueSupportingFindings(findings: SupportingFinding[]) {
  return [...new Map(findings.map(finding => [finding.id, finding])).values()];
}
/** A mixed group does not inherit its most advanced member's stage. */
export function displayedStage(kinds: Array<string | null>): string | null {
  const unique = new Set(kinds);
  return unique.size > 1 ? "mixed" : [...unique][0] ?? null;
}
/** Keep every figure and its source wording, without repeating a year/unit as another date chip. */
export function figureDisplay(figure: FindingFigure) {
  const stated = figure.value_as_stated.trim();
  const date = /^(?:\d{4}|(?:since |over |by |in |during )?\d{4}(?:[–—-]\d{4})?|\d{1,2} [A-Za-z]+ \d{4})$/i.test(stated);
  const unit = figure.unit?.trim();
  const addUnit = unit && !stated.toLowerCase().includes(unit.toLowerCase()) && !(date && /^years?$/i.test(unit));
  const period = figure.period?.trim();
  const addPeriod = period && !stated.toLowerCase().includes(period.toLowerCase());
  return {
    label: figure.label?.trim() || (date ? "Date stated" : "Figure stated"),
    value: [stated, addUnit ? unit : null].filter(Boolean).join(" "),
    period: addPeriod ? period : null,
    condition: !date && ["conditional", "unconditional"].includes(figure.conditionality)
      ? figure.conditionality === "conditional" ? "Conditional" : "Unconditional" : null,
  };
}

