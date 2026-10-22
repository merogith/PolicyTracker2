import type { FigureRow } from "./overview";

export interface ReportedFigure extends FigureRow {
  iso3: string;
  country: string;
  demo: boolean;
  key: string;
}

export interface FigureGroup {
  key: string;
  iso3: string;
  country: string;
  demo: boolean;
  finding: string;
  figures: ReportedFigure[];
}

/** Group only identical statements from the same country and stage; retain each value and its own sources. */
export function groupReportedFigures(figures: ReportedFigure[]): FigureGroup[] {
  const groups = new Map<string, FigureGroup>();
  for (const figure of figures) {
    const key = JSON.stringify([figure.iso3, figure.demo, figure.finding, figure.kind]);
    let group = groups.get(key);
    if (!group) {
      group = { key, iso3: figure.iso3, country: figure.country, demo: figure.demo, finding: figure.finding, figures: [] };
      groups.set(key, group);
    }
    group.figures.push(figure);
  }
  return [...groups.values()];
}
