"""Check the fresh-start files against each other and validate one country's outputs.

Usage:
  python scripts/check.py [COUNTRY_DIR] [--scores FILE]

COUNTRY_DIR holds country.json, one <document_id>.extraction.json per extracted
document, and topics/<topic_id>.json per stage-2 pack. Defaults to
examples/exampleland. Requires: pip install jsonschema

What it does, in order:
  1. config: taxonomy, vocabulary and claim rules agree with each other
  2. country manifest and every extraction file: schema, allowed values, evidence, coverage
  3. packs: rebuilds one pack per topic from the records (code, no model)
  4. topic outputs: schema, pack matches, every record in exactly one claim, citations resolve
  5. derive: merge claims that share records, stable IDs, stages, counts (code, no model)
  6. scores (optional): schema and claim IDs
  7. print the country view, the document view and the merged claims
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
TOPIC_ID = re.compile(r"\b[A-Z]{3}-\d{2}\b")
RECORD_ID = re.compile(r"^(?P<doc>.+)-p(?P<page>\d+)-(?P<seq>\d+)$")
errors = []


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def err(msg):
    errors.append(msg)


def bail():
    if errors:
        sys.exit("\n".join(errors))


def unique(ids, what):
    seen = set()
    for i in ids:
        if i in seen:
            err(f"duplicate {what}: {i}")
        seen.add(i)


def validate(schema_rel, data, label):
    for e in Draft202012Validator(load(ROOT / schema_rel)).iter_errors(data):
        err(f"{label}: schema: {'/'.join(map(str, e.path))}: {e.message}")


def check_enum(label, field, value, allowed):
    if value is not None and value not in allowed:
        err(f"{label}: {field} value '{value}' is not allowed")


# ---- 1. Config consistency -------------------------------------------------
tax, voc, cl = load(ROOT / "config/taxonomy.json"), load(ROOT / "config/vocabulary.json"), load(ROOT / "config/claims.json")

domains = {d["id"]: d for d in tax["domains"]}
unique([d["id"] for d in tax["domains"]], "domain id")
unique([d["prefix"] for d in tax["domains"]], "domain prefix")
topics = {t["id"]: t for t in tax["topics"]}
unique([t["id"] for t in tax["topics"]], "topic id")

for t in tax["topics"]:
    tid = t["id"]
    if not t["placements"]:
        err(f"{tid}: no placement")
        continue
    for p in t["placements"]:
        d = domains.get(p["domain"])
        if not d or p["group"] not in {g["id"] for g in d["groups"]}:
            err(f"{tid}: unknown placement {p}")
    home = domains.get(t["placements"][0]["domain"])
    if home and not tid.startswith(home["prefix"] + "-"):
        err(f"{tid}: prefix does not match home domain {home['id']} ({home['prefix']})")
    for r in t["routing"]:
        for ref in TOPIC_ID.findall(r["use"]):
            if ref not in topics:
                err(f"{tid}: routing points to unknown topic {ref}")
    for old in t["legacy_ids"]:
        if old in topics and old != tid:
            err(f"{tid}: legacy id {old} is reused by another current topic")
    for parent_id in t.get("split_from", []):
        if parent_id not in topics or parent_id == tid:
            err(f"{tid}: split_from {parent_id} is not another current topic")

for d in tax["domains"]:
    if not any(p["domain"] == d["id"] for t in tax["topics"] for p in t["placements"]):
        err(f"domain {d['id']} has no topics")

facets = {f["id"]: f for f in voc["record_facets"]}
unique(list(facets), "facet id")
for f in voc["record_facets"]:
    unique([v["id"] for v in f["values"]], f"value in {f['id']}")
linked = {f["id"]: set(f["values"]) for f in voc["linked_fields"]}
for needed in ["stakeholder_role", "place_type", "detail_kind", "missing_reason", "page_disposition", "document_kind", "review_status"]:
    if needed not in linked:
        err(f"vocabulary.linked_fields is missing {needed}")
fact_fields = {k: set(v) for k, v in voc["fact_fields"].items() if isinstance(v, list)}
stage_of = {v["id"]: v["response_stage"] for v in facets["statement_type"]["values"]}
rel_types = {r["id"]: r for r in cl["relation_types"]}
claim_fields = {k: set(v) for k, v in cl["claim_fields"].items()}
brief_sections = [s for s in cl["brief"]["sections"] if s != "core_idea_en"]
scorer_values = set(cl["scoring_layer"]["scorer_values"])
bail()

# ---- 2. Country manifest and extraction files ------------------------------
args = sys.argv[1:]
scores_path = None
if "--scores" in args:
    i = args.index("--scores")
    scores_path = args[i + 1]
    del args[i:i + 2]
country_dir = Path(args[0]) if args else ROOT / "examples/exampleland"

manifest = load(country_dir / "country.json")
validate("schemas/country.schema.json", manifest, "country.json")
bail()
docs = {d["document_id"]: d for d in manifest["documents"]}
unique(list(docs), "document id in country.json")
for d in manifest["documents"]:
    check_enum(f"country.json {d['document_id']}", "kind", d["kind"], linked["document_kind"])
    if d.get("supersedes") and d["supersedes"] not in docs:
        err(f"country.json {d['document_id']}: supersedes unknown document {d['supersedes']}")

extractions = {}
for p in sorted(country_dir.glob("*.extraction.json")):
    data = load(p)
    validate("schemas/extraction.schema.json", data, p.name)
    extractions[p.name] = data
bail()


def check_coded(rid, facet_id, values):
    f = facets[facet_id]
    allowed = {v["id"] for v in f["values"]}
    for v in values:
        if isinstance(v, dict):
            if f["value_set"] != "closed_with_other":
                err(f"{rid}: {facet_id} does not accept 'other'")
        elif v not in allowed:
            err(f"{rid}: {facet_id} value '{v}' is not in the vocabulary")


records, record_doc, coverage_of = {}, {}, {}
for name, ext in extractions.items():
    doc_id = ext["document"]["document_id"]
    if doc_id not in docs:
        err(f"{name}: document {doc_id} is not listed in country.json")
        continue
    if ext["document"]["country"] != manifest["country"]:
        err(f"{name}: country {ext['document']['country']} is not {manifest['country']}")
    if name != f"{doc_id}.extraction.json":
        err(f"{name}: file should be named {doc_id}.extraction.json")
    coverage_of[doc_id] = ext["coverage"]
    covered = defaultdict(set)
    for p in ext["coverage"]["pages"]:
        check_enum(f"{doc_id} coverage", "page_disposition", p["disposition"], linked["page_disposition"])
        for rid in p["record_ids"]:
            covered[rid].add(p["page"])
    for r in ext["records"]:
        rid = r["record_id"]
        if rid in records:
            err(f"{rid}: duplicate record id (also in {record_doc[rid]})")
            continue
        records[rid], record_doc[rid] = r, doc_id
        m = RECORD_ID.match(rid)
        if not m or m["doc"] != doc_id:
            err(f"{rid}: record id must be {doc_id}-p<page>-<seq>")
        check_enum(rid, "statement_type", r["statement_type"], stage_of)
        check_enum(rid, "review_status", r.get("review_status"), linked["review_status"])
        lab = r["labels"]
        for t in lab["topic_ids"]:
            if t not in topics:
                err(f"{rid}: unknown topic {t}")
        for fid in ["purpose", "hazard", "risk_component", "risk_function", "affected_group", "cross_cutting_theme", "policy_instrument"]:
            check_coded(rid, fid, lab[fid])
        check_coded(rid, "geographic_scope", [lab["geographic_scope"]] if lab["geographic_scope"] else [])
        ev_ids = {e["evidence_id"] for e in r["evidence"]}
        ev_pages = {e["page"] for e in r["evidence"]}
        if not ev_pages & covered[rid]:
            err(f"{rid}: not listed in coverage for its evidence page(s) {sorted(ev_pages)}")
        for s in r["stakeholders"]:
            check_enum(rid, "stakeholder_role", s["role"], linked["stakeholder_role"])
        for p in r["places"]:
            check_enum(rid, "place_type", p["place_type"], linked["place_type"])
        fact_ids = {f["fact_id"] for f in r["facts"]}
        for d in r["details"]:
            check_enum(rid, "detail_kind", d["kind"], linked["detail_kind"])
            for f in d.get("fact_ids", []):
                if f not in fact_ids:
                    err(f"{rid}: detail links unknown fact {f}")
        for mf in r["missing_fields"]:
            check_enum(rid, "missing_reason", mf["reason"], linked["missing_reason"])
        for f in r["facts"]:
            for field, allowed in fact_fields.items():
                check_enum(f"{rid}/{f['fact_id']}", field, f.get(field), allowed)
            if f["fact_type"] != "target" and f.get("target_kind"):
                err(f"{rid}/{f['fact_id']}: target_kind on a non-target fact")
            if f["fact_type"] != "finance" and f.get("finance_status"):
                err(f"{rid}/{f['fact_id']}: finance_status on a non-finance fact")
        used = {f["evidence_id"] for f in r["facts"]} | {s["evidence_id"] for s in r["stakeholders"]} \
            | {d["evidence_id"] for d in r["details"]} | {u["evidence_id"] for u in r["unmapped_concepts"]}
        for e in used - ev_ids:
            err(f"{rid}: cites evidence {e} that the record does not contain")
bail()

# ---- 3. Packs: one per topic, built by code --------------------------------
rejected = {rid for rid, r in records.items() if r.get("review_status") == "rejected"}


def record_key(rid):
    m = RECORD_ID.match(rid)
    return (docs[record_doc[rid]]["edition_date"] or "9999-99-99", int(m["page"]), int(m["seq"]), rid)


packs = defaultdict(list)
for rid in sorted(records, key=record_key):
    if rid in rejected:
        continue
    for t in records[rid]["labels"]["topic_ids"]:
        packs[t].append(rid)
untopiced = [rid for rid in records if rid not in rejected and not records[rid]["labels"]["topic_ids"]]

# ---- 4. Topic outputs (stage 2) --------------------------------------------
outputs = {}
for p in sorted((country_dir / "topics").glob("*.json")) if (country_dir / "topics").is_dir() else []:
    data = load(p)
    validate("schemas/topic.schema.json", data, f"topics/{p.name}")
    outputs[p.stem] = data
bail()

pack_claims = []  # (topic, provisional id, members, claim)
for t, out in outputs.items():
    label, sc = f"topics/{t}.json", out["scope"]
    if sc["topic_id"] != t:
        err(f"{label}: scope.topic_id {sc['topic_id']} does not match the file name")
    if t not in topics:
        err(f"{label}: unknown topic {t}")
    if sc["country"] != manifest["country"]:
        err(f"{label}: country {sc['country']} is not {manifest['country']}")
    want, got = packs.get(t, []), sc["record_ids"]
    unique(got, f"record id in {label} scope")
    if set(got) != set(want):
        err(f"{label}: pack does not match the records: missing {sorted(set(want) - set(got))}, extra {sorted(set(got) - set(want))}")
    if set(sc["document_ids"]) != {record_doc[r] for r in want}:
        err(f"{label}: scope.document_ids should be {sorted({record_doc[r] for r in want})}")
    pack_set, claim_of = set(got), {}
    unique([c["claim_id"] for c in out["claims"]], f"claim id in {label}")
    for c in out["claims"]:
        lab = f"{label} {c['claim_id']}"
        for field in ["outcome_signal", "status", "review_status"]:
            check_enum(lab, field, c.get(field), claim_fields[field])
        for s in c["setback_flags"]:
            check_enum(lab, "setback_flags", s, claim_fields["setback_flags"])
        for rid in c["member_record_ids"]:
            if rid not in pack_set:
                err(f"{lab}: member {rid} is not in this pack")
            elif rid in claim_of:
                err(f"{lab}: record {rid} is also in {claim_of[rid]}")
            claim_of[rid] = c["claim_id"]
        pack_claims.append((t, c["claim_id"], list(c["member_record_ids"]), c))
    for rid in sorted(pack_set - set(claim_of)):
        err(f"{label}: record {rid} is in no claim")
    for r in out.get("relations", []):
        lab, rt = f"{label} {r['relation_id']}", rel_types.get(r["type"])
        if not rt:
            err(f"{lab}: unknown relation type {r['type']}")
            continue
        check_enum(lab, "review_status", r.get("review_status"), claim_fields["review_status"])
        a, b = claim_of.get(r["from_record_id"]), claim_of.get(r["to_record_id"])
        if a is None or b is None:
            err(f"{lab}: names a record outside this pack")
        elif rt["groups_into_one_claim"] and a != b:
            err(f"{lab}: {r['type']} records must share a claim")
        elif not rt["groups_into_one_claim"] and a == b:
            err(f"{lab}: {r['type']} records must be in different claims")
    cids = {c["claim_id"] for c in out["claims"]}
    for section in brief_sections:
        for i, bullet in enumerate(out["brief"].get(section, [])):
            for cid in bullet["claim_ids"]:
                if cid not in cids:
                    err(f"{label}: brief.{section}[{i}] cites unknown claim {cid}")
            if not bullet["claim_ids"] and section != "gaps":
                err(f"{label}: brief.{section}[{i}] cites no claim")
for t, rids in packs.items():
    if t not in outputs:
        err(f"topic {t}: {len(rids)} record(s) but no topics/{t}.json")
bail()

# ---- 5. Derived: merged claims, stable IDs, stages (code, not model) -------
parent = {}


def find(x):
    parent.setdefault(x, x)
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


for _, _, members, _ in pack_claims:
    for m in members:
        parent[find(m)] = find(members[0])
groups = defaultdict(set)
for rid in parent:
    groups[find(rid)].add(rid)

merged = []
for members in groups.values():
    ordered = sorted(members, key=record_key)
    sources = sorted((t, cid, c) for t, cid, ms, c in pack_claims if set(ms) <= members)
    member_docs = {record_doc[m] for m in members}
    latest = max(member_docs, key=lambda d: docs[d]["edition_date"] or "")

    def stage_in(rids):
        return max([stage_of[records[m]["statement_type"]] for m in rids if stage_of[records[m]["statement_type"]] is not None], default=0)

    statuses = {c["status"] for _, _, c in sources}
    merged.append({
        "id": "C-" + ordered[0],
        "members": ordered,
        "topics": sorted({t for m in members for t in records[m]["labels"]["topic_ids"]}),
        "packs": sorted({t for t, _, _ in sources}),
        "stage": stage_in(members),
        "stage_latest": stage_in([m for m in members if record_doc[m] == latest]),
        "documents": sorted(member_docs),
        "status": "contested" if "contested" in statuses else "superseded" if "superseded" in statuses else "active",
        "text": sources[0][2]["claim_text_en"],
    })
merged.sort(key=lambda c: record_key(c["members"][0]))
stable_ids = {c["id"] for c in merged}

# ---- 6. Scores (optional, reserved layer) ----------------------------------
if scores_path:
    sc = load(scores_path)
    validate("schemas/scores.schema.json", sc, "scores")
    bail()
    if sc["scope"]["country"] != manifest["country"]:
        err(f"scores: country {sc['scope']['country']} is not {manifest['country']}")
    for s in sc["scores"]:
        lab = f"scores {s['claim_id']}"
        if s["claim_id"] not in stable_ids:
            err(f"{lab}: unknown stable claim id")
        check_enum(lab, "scorer", s["scorer"], scorer_values)
        check_enum(lab, "review_status", s.get("review_status"), claim_fields["review_status"])
        for rid in s["record_ids"]:
            if rid not in records:
                err(f"{lab}: unknown record {rid}")
    bail()

# ---- 7. Views --------------------------------------------------------------
print(f"OK  {len(topics)} topics in {len(domains)} domains; {len(facets)} record facets; "
      f"{manifest['country']}: {len(extractions)} of {len(docs)} documents extracted, "
      f"{len(records)} records ({len(rejected)} rejected), {len(packs)} packs, {len(merged)} claims"
      + (f"; {len(sc['scores'])} scores" if scores_path else ""))

print("\ndocument   edition     status")
for d in manifest["documents"]:
    did = d["document_id"]
    if did in coverage_of:
        n = sum(1 for r in record_doc.values() if r == did)
        pages = coverage_of[did]["pages"]
        by = defaultdict(int)
        for p in pages:
            by[p["disposition"]] += 1
        print(f"{did:<10} {d['edition_date'] or '-':<11} {n} records; pages: " + ", ".join(f"{k} {v}" for k, v in sorted(by.items())))
    else:
        print(f"{did:<10} {d['edition_date'] or '-':<11} not extracted")
if untopiced:
    print(f"records with no topic (not in any pack): {', '.join(untopiced)}")

print("\nclaim                 stage latest topics          docs      text")
for c in merged:
    flag = "" if c["status"] == "active" else f"  [{c['status']}]"
    print(f"{c['id']:<21} {c['stage']:<5} {c['stage_latest']:<6} {','.join(c['topics']):<15} {','.join(c['documents']):<9} {c['text'][:48]}{flag}")

print("\ntopic    domains                   pack  claims by stage 0-4")
by_topic = defaultdict(lambda: [0] * 5)
for c in merged:
    for t in c["topics"]:
        by_topic[t][c["stage"]] += 1
for t in sorted(packs):
    doms = ",".join(sorted({p["domain"] for p in topics[t]["placements"]}))
    print(f"{t:<8} {doms:<25} {len(packs[t]):<5} {by_topic[t]}")

print("\ndocument view: records per topic, concerns (stage-0 types) vs responses (stage 1-4)")
for did in sorted(coverage_of):
    counts = defaultdict(lambda: [0, 0, 0])
    for rid, r in records.items():
        if record_doc[rid] != did or rid in rejected:
            continue
        s = stage_of[r["statement_type"]]
        col = 2 if s is None else 0 if s == 0 else 1
        for t in r["labels"]["topic_ids"]:
            counts[t][col] += 1
    print(f"  {did}: " + "; ".join(f"{t} {v[0]}c/{v[1]}r" + (f"/{v[2]}other" if v[2] else "") for t, v in sorted(counts.items())))
    lim = coverage_of[did]["limitations"]
    if lim:
        print(f"  {did} limitations: " + " ".join(lim))
