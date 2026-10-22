import type { Domain, Taxonomy } from "../taxonomy";
import { documentInstructions, documentUserText } from "./prompt";
import { extractionSchemaFor, schemaName } from "./schemas";

interface SearchableDocument {
  id: string;
  title: string;
  kind: string;
  editionDate: string;
  pageCount: number | null;
  language?: string | null;
  country: { vectorStoreId: string | null };
}

/** Every indexed page is eligible. The API's result limit only bounds passages per search. */
export function documentRequest(doc: SearchableDocument, domain: Domain, tax: Taxonomy, model: string) {
  if (!doc.country.vectorStoreId) throw new Error(`Document ${doc.id} has no vector store`);
  return {
    model,
    instructions: documentInstructions(tax),
    text: documentUserText(doc, domain, tax),
    schema: extractionSchemaFor(tax.topicIds),
    schemaName: schemaName("document"),
    diagnosticContext: `${doc.id}:${domain.id}:extraction`,
    validateOutput(output: { findings: unknown[]; not_found: boolean }) {
      if (output.not_found !== (output.findings.length === 0)) throw new Error("not_found must agree with whether findings is empty");
    },
    fileSearch: {
      vectorStoreId: doc.country.vectorStoreId,
      filters: { type: "eq" as const, key: "document_id", value: doc.id },
      maxNumResults: domain.maxResults,
    },
  };
}
