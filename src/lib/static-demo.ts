/** Set when building the read-only snapshot for static hosting (see scripts/export-static.mjs). */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

/** Prefix for URLs that bypass next/link (location.assign, history.replaceState). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** location.assign for app paths; in the snapshot, goes to the saved file for that view. */
export function assignLocation(href: string) {
  const resolve = (window as { __staticResolve?: (href: string) => string }).__staticResolve;
  window.location.assign(resolve ? resolve(BASE_PATH + href) : BASE_PATH + href);
}
