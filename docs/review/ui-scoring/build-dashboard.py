"""Inline the calculated synthetic examples into the editable UI fragment.

No score calculation happens here. The data projection removes unused input and
history fields so the in-conversation preview remains small and self-contained.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def fields(value, names):
    return {name: value[name] for name in names if name in value}


def rollup(value):
    return fields(value, ["id", "label", "home_domain_id", "score", "status", "level",
                          "color", "bounds", "provisional_observed_mean", "counts",
                          "topics_with_responses", "scoring_response_count", "change"])


def claim(value):
    result = fields(value, ["id", "title", "primary_topic_id", "secondary_topic_ids",
                           "kind", "points", "possible_points", "score", "checks",
                           "detail_text", "stage", "conditionality", "conflicts",
                           "related_context_ids", "status", "topic_assessments"])
    result["source_records"] = [fields(source, ["id", "document_id", "page", "quote"])
                                for source in value.get("source_records", [])]
    result["sources"] = [fields(source, ["id", "title", "role", "year"])
                         for source in value.get("sources", [])]
    return result


def assessment(value):
    result = fields(value, ["snapshot_id", "country_id", "scope_label", "cutoff_date",
                           "source_profile_complete", "basis"])
    result["national"] = rollup(value["national"])
    result["domains"] = [rollup(domain) for domain in value["domains"]]
    result["topics"] = [rollup(topic) for topic in value["topics"]]
    result["claims"] = [claim(item) for item in value["claims"]]
    return result


source = json.loads((ROOT / "examples.json").read_text(encoding="utf-8"))
settings = json.loads((ROOT / "scoring.json").read_text(encoding="utf-8"))
bundle = {"version": source["version"], "presentation_version": settings["presentation_version"],
          "levels": settings["levels"], "unavailable": settings["unavailable"],
          "synthetic": True, "taxonomy": source["taxonomy"], "countries": []}
for country in source["countries"]:
    item = {"id": country["id"], "name": country["name"], "current": assessment(country["current"]), "documents": []}
    for document in country["documents"]:
        doc = fields(document, ["id", "title", "role", "year"])
        doc["assessment"] = assessment(document["assessment"])
        item["documents"].append(doc)
    bundle["countries"].append(item)

path = ROOT / "dashboard.fragment.html"
fragment = path.read_text(encoding="utf-8")
payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
fragment, count = re.subn(r'(<script id="pt-demo-data" type="application/json">).*?(</script>)',
                         lambda match: match[1] + payload + match[2], fragment, count=1, flags=re.S)
if count != 1:
    raise ValueError("Expected exactly one inline data slot")
if len(fragment.encode("utf-8")) >= 1_000_000:
    raise ValueError("Fragment exceeds the inline size budget")
path.write_text(fragment, encoding="utf-8")
print(f"Built {path.name}: {len(fragment.encode('utf-8')):,} bytes; calculated examples only")
