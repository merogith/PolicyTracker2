import { CONDITIONALITY, FINDING_KINDS } from "@/lib/colors";
import type { CountryOverview } from "@/lib/overview";
import { groupReportedFigures } from "@/lib/reported-figures";

export function FiguresTable({ figures }: { figures: CountryOverview["figures"] }) {
  if (figures.length === 0) return <p className="text-sm text-muted">No reported figures yet.</p>;
  const groups=groupReportedFigures(figures.map((figure,index)=>({...figure,iso3:"",country:"",demo:false,key:String(index)})));
  return <div className="divide-y divide-border">{groups.map(group=><section key={group.key} className="py-4 first:pt-0 last:pb-0">
    <details className="group/figure"><summary className="cursor-pointer"><span className="line-clamp-3 text-sm leading-relaxed group-open/figure:line-clamp-none">{group.finding}</span></summary></details>
    <div className="mt-3 overflow-x-auto" role="region" aria-label={`Figures for ${group.finding.slice(0,80)}`} tabIndex={0}>
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Values and sources for this statement</caption>
        <thead className="text-xs text-muted"><tr className="border-b border-border">{["Value as stated","Period","Condition","Stage","Documents"].map(label=><th key={label} className="py-2 pr-4 font-medium" scope="col">{label}</th>)}</tr></thead>
        <tbody>{group.figures.map(figure=><tr key={figure.key} className="border-b border-border align-top last:border-0">
          <td className="py-3 pr-4 font-medium">{figure.valueAsStated}{figure.unit&&!figure.valueAsStated.includes(figure.unit)&&<span className="block text-xs font-normal text-muted">{figure.unit}</span>}</td>
          <td className="py-3 pr-4">{figure.period||"Not stated"}</td>
          <td className={`py-3 pr-4 text-xs ${figure.conditionality==="conditional"?"text-warn-ink":"text-muted"}`}>{CONDITIONALITY[figure.conditionality]?.label??figure.conditionality}</td>
          <td className="py-3 pr-4 text-xs">{FINDING_KINDS[figure.kind]?.label??figure.kind}</td>
          <td className="py-3 text-xs">{figure.documents.join(", ")||"No source linked"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>)}</div>;
}
