// Hues (OKLCH hue angles) for domains, finding kinds and statuses. The colour classes in
// globals.css (.hue-dot, .hue-soft, .hue-band, .hue-ink) read the hue from the --h custom property.
import type { CSSProperties } from "react";
import { STATEMENT_TYPES, statementTypeLabel } from "./statement-types";

/** Taxonomy domains get a hue that fits their subject; new domains get a stable hue from their id. */
const DOMAIN_HUES: Record<string, number> = {
  climate: 175,
  disaster_risk: 25,
  agriculture: 125,
  water: 240,
  nature_land: 150,
  energy: 80,
  settlements: 300,
  transport: 270,
  industry: 50,
  health: 345,
  waste: 100,
  economy: 200,
  livelihoods: 320,
  culture: 15,
  education: 260,
  tourism: 190,
};

const SPREAD = [15, 40, 70, 100, 130, 155, 180, 205, 230, 255, 285, 315, 340];

export function domainHue(id: string): number {
  if (id in DOMAIN_HUES) return DOMAIN_HUES[id];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPREAD[h % SPREAD.length];
}

/** The response ladder, in order. --ladder-* uses the shared low-to-high score palette. */
export const FINDING_KINDS: Record<string, { label: string }> = {
  ...Object.fromEntries(STATEMENT_TYPES.map(type => [type.id, { label: type.label }])),
  underway: { label: statementTypeLabel("underway") },
  delivered: { label: statementTypeLabel("delivered") },
};

export const CONDITIONALITY: Record<string, { label: string; hue: number }> = {
  unconditional: { label: "Unconditional", hue: 150 },
  conditional: { label: "Conditional", hue: 60 },
  not_stated: { label: "Conditionality not stated", hue: 272 },
};

export function hue(h: number): CSSProperties {
  return { "--h": h } as CSSProperties;
}
