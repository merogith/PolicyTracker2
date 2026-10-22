import { db } from "@/lib/db";
import { aiMode } from "@/lib/ai-mode";
import { SidebarNav } from "./sidebar-nav";

export async function Sidebar() {
  const [countries, busyDocs, failedDocs, activeJobs, failedJobs] = await Promise.all([
    db.country.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, iso3: true, name: true } }),
    db.document.groupBy({ by: ["countryId"], where: { status: { in: ["uploaded", "extracting", "indexing", "analysing"] } } }),
    db.document.groupBy({ by: ["countryId"], where: { status: "failed" } }),
    db.job.count({ where: { status: { in: ["queued", "running"] } } }),
    db.job.count({ where: { status: "failed" } }),
  ]);
  const busy = new Set(busyDocs.map((d) => d.countryId));
  const failed = new Set(failedDocs.map((d) => d.countryId));
  return (
    <SidebarNav
      data={{
        countries: countries.map((c) => ({ iso3: c.iso3, name: c.name, busy: busy.has(c.id), failed: failed.has(c.id) })),
        activeJobs,
        failedJobs,
        aiMode: aiMode(),
      }}
    />
  );
}
