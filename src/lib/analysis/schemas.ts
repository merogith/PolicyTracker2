// Output shapes. Every answer is a list of findings: one distinct statement each, with its response
// stage (kind), the figures it states, its topic tags and its quotes. The JSON schemas sent to OpenAI
// are generated from these zod schemas by zodTextFormat (strict mode).
//
// Country scope uses the same shape, except that a citation is a reference to a document finding
// ({ ref: "KAZ-NDC1#findings.2" }) rather than a quote: the code copies the quotes from the document
// answers it names, and the topics of a country finding are those of the document findings it cites.
import { z } from "zod";
import { classificationSchema } from "./labels";

export const FINDING_KINDS = ["concern", "commitment", "planned_action", "underway", "delivered", "other"] as const;
export const CONDITIONALITY = ["unconditional", "conditional", "not_stated"] as const;

export const Citation = z.object({
  page: z.number().int().describe("Page number of the page the quote is copied from"),
  quote: z.string().describe("Exact words as printed on that page"),
});
export const SourceRef = z.object({
  ref: z.string().describe("A ref of a document finding from the input, e.g. KAZ-NDC1#findings.2"),
});

const Figure = z.object({
  label: z.string().min(1).describe("What this number or date describes, grounded in the finding"),
  value_as_stated: z.string(),
  value: z.string().nullable().describe("Decimal string such as 15 or 1200.5; null when ambiguous"),
  unit: z.string().nullable(),
  period: z.string().nullable(),
  conditionality: z.enum(CONDITIONALITY),
});

function findingsSchema<C extends z.ZodType, T extends z.ZodType>(cite: C, topicId: T | null, stored = false) {
  const citations = z.array(cite);
  const tags = topicId
    ? {
        topic_ids: z.array(topicId).describe("Every taxonomy topic the finding substantively covers; none it merely mentions"),
        unmapped_concepts: z.array(z.string()).describe("Concepts in the finding that no topic fits; usually empty"),
      }
    : {};
  return z.object({
    findings: z.array(
      z.object({
        ...(topicId ? { classification: stored ? classificationSchema.optional() : classificationSchema } : {}),
        ...(stored ? { title: z.string().optional(), summary: z.string().optional() } : {
          title: z.string().min(1).describe("Short, faithful plain-language title; usually 6–12 words"),
          summary: z.string().min(1).describe("One concise sentence preserving the essential status and conditions"),
        }),
        text: z.string(),
        kind: z.enum(FINDING_KINDS),
        figures: z.array(stored ? Figure.extend({ label: z.string().optional() }) : Figure),
        ...tags,
        citations,
      }),
    ),
    not_found: z.boolean().describe("True when the pages read contain nothing on the question"),
    note: z.string().nullable(),
    citations,
  });
}

const countryExtras = {
  by_document: z.array(z.object({ document_id: z.string(), summary: z.string() })),
  changes_between_editions: z.array(z.object({ text: z.string(), document_ids: z.array(z.string()) })),
};

export type Scope = "document" | "country";

/** The schema sent with a request: document findings may only use the current topic IDs. */
export function schemaFor(scope: Scope, topicIds: [string, ...string[]]) {
  return scope === "document" ? findingsSchema(Citation, z.enum(topicIds)) : findingsSchema(SourceRef, null).extend(countryExtras);
}

/** Evidence is extracted independently; classification cannot invalidate this answer. */
export function extractionSchemaFor(topicIds: [string, ...string[]]) {
  const schema = findingsSchema(Citation, z.enum(topicIds));
  return schema.extend({
    findings: z.array(schema.shape.findings.element.omit({ classification: true }).extend({
      citations: z.array(Citation).min(1),
    })),
  });
}

/** For checking stored answers: topic IDs may come from an older taxonomy version. */
export function storedSchemaFor(scope: Scope) {
  return scope === "document" ? findingsSchema(Citation, z.string(), true) : findingsSchema(SourceRef, null, true).extend(countryExtras);
}

export function schemaName(scope: Scope) {
  return `${scope}_findings`;
}

/** The re-tag pass: new topic tags for findings already found, by their index. */
export function retagSchema(topicIds: [string, ...string[]]) {
  return z.object({
    findings: z.array(
      z.object({
        index: z.number().int(),
        topic_ids: z.array(z.enum(topicIds)),
        unmapped_concepts: z.array(z.string()),
      }),
    ),
  });
}

export type DocCitation = z.infer<typeof Citation>;

/** Every citation list in an output with its path: "" for the top level, "findings.2" for a finding. */
export function citationLists<T>(output: Record<string, unknown>): Array<{ path: string; citations: T[] }> {
  const lists: Array<{ path: string; citations: T[] }> = [{ path: "", citations: (output.citations as T[]) ?? [] }];
  const items = (output.findings as Array<{ citations: T[] }>) ?? [];
  items.forEach((item, i) => lists.push({ path: `findings.${i}`, citations: item.citations }));
  return lists;
}
