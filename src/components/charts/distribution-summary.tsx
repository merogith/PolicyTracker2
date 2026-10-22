export interface DistributionSummaryRow {
  label: string;
  value: number;
  color: string;
}

/** One shared whole, followed by readable counts; exact percentages live in the detailed view. */
export function DistributionSummary({ rows, total, unit }: {
  rows: DistributionSummaryRow[];
  total: number;
  unit: string;
}) {
  return <div className="flex flex-col gap-4">
    {total > 0 ? <div className="flex h-6 overflow-hidden rounded-md bg-surface-2" aria-hidden>
      {rows.filter(row=>row.value>0).map(row=><span key={row.label} className="h-full shrink-0" style={{width:`${100*row.value/total}%`,background:row.color}}/>)}
    </div> : <p className="text-sm text-muted">No {unit} to display</p>}
    <dl className="flex flex-col gap-2.5 text-sm" aria-label={`${unit} distribution`}>
      {rows.map(row=><div key={row.label} className="flex items-center justify-between gap-4">
        <dt className="flex items-center gap-2.5"><span className="size-2.5 shrink-0 rounded-sm" style={{background:row.color}} aria-hidden/>{row.label}</dt>
        <dd className={`font-semibold tabular ${row.value===0?"text-muted":""}`}>{row.value}</dd>
      </div>)}
    </dl>
  </div>;
}
