import { DIMENSION_NAMES, type LabelDimension } from "./labels";
import type { ClaimGroup, ClaimSort } from "./claim-explorer";

export interface ClaimViewState {
  search: string;
  country: string;
  domain: string;
  topic: string;
  documentId: string;
  stage: string;
  labeling: string;
  labels: Partial<Record<LabelDimension, string>>;
  includeDemo: boolean;
  page: number;
  groupBy: ClaimGroup;
  sortBy: ClaimSort;
  descending: boolean;
  expanded: string[];
}

export const defaultClaimView: ClaimViewState = {
  search: "", country: "", domain: "", topic: "", documentId: "", stage: "",
  labeling: "", labels: {}, includeDemo: false, page: 1, groupBy: "none",
  sortBy: "title", descending: false, expanded: [],
};

const textFields = ["search", "country", "domain", "topic", "documentId", "stage", "labeling"] as const;
const dimensions = Object.keys(DIMENSION_NAMES) as LabelDimension[];
const groups: string[] = ["none", "country", "domain", "topic", "document", ...dimensions];
const sorts: string[] = ["title", "country", "points", "sources", ...dimensions];

/** Keep view state in the current history entry, separate from report and route parameters. */
export function readClaimView(params: Pick<URLSearchParams, "get" | "getAll">): ClaimViewState {
  const page = Number(params.get("c_page"));
  const group = params.get("c_groupBy") ?? "";
  const sort = params.get("c_sortBy") ?? "";
  return {
    ...defaultClaimView,
    ...Object.fromEntries(textFields.map(key => [key, params.get(`c_${key}`) ?? ""])),
    labels: Object.fromEntries(dimensions.flatMap(key => {
      const value = params.get(`c_label_${key}`);
      return value ? [[key, value]] : [];
    })),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    groupBy: groups.includes(group) ? group as ClaimGroup : "none",
    sortBy: sorts.includes(sort) ? sort as ClaimSort : "title",
    includeDemo: params.get("c_includeDemo") === "1",
    descending: params.get("c_descending") === "1",
    expanded: params.getAll("c_open"),
  };
}

export function writeClaimView(params: URLSearchParams, state: ClaimViewState): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of [...next.keys()]) if (key.startsWith("c_")) next.delete(key);
  for (const key of textFields) if (state[key]) next.set(`c_${key}`, state[key]);
  for (const key of dimensions) if (state.labels[key]) next.set(`c_label_${key}`, state.labels[key]!);
  if (state.page > 1) next.set("c_page", String(state.page));
  if (state.groupBy !== "none") next.set("c_groupBy", state.groupBy);
  if (state.sortBy !== "title") next.set("c_sortBy", state.sortBy);
  if (state.includeDemo) next.set("c_includeDemo", "1");
  if (state.descending) next.set("c_descending", "1");
  for (const id of new Set(state.expanded)) next.append("c_open", id);
  return next;
}
