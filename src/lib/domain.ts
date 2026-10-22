// Allowed values for the string enumerations in prisma/schema.prisma.

export const DOCUMENT_STATUSES = ["uploaded", "extracting", "indexing", "analysing", "analysed", "partial", "failed", "deleting"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const PAGE_DISPOSITIONS = ["extracted", "unreadable"] as const;
export type PageDisposition = (typeof PAGE_DISPOSITIONS)[number];

export const RESULT_STATUSES = ["queued", "running", "done", "failed"] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const JOB_TYPES = [
  "ingest_document",
  "analyse_document_domain",
  "synthesise_country_domain",
  "retag_result",
  "delete_document",
  "delete_country",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Document kinds offered in the upload form. Any 2-8 capital letters are accepted. */
export const DOCUMENT_KINDS = [
  { id: "NDC", label: "Nationally Determined Contribution" },
  { id: "NAP", label: "National Adaptation Plan" },
  { id: "LTS", label: "Long-term strategy" },
  { id: "DRR", label: "Disaster risk reduction strategy" },
  { id: "NC", label: "National Communication" },
  { id: "BTR", label: "Biennial Transparency Report" },
  { id: "POL", label: "Other policy or law" },
] as const;

export const KIND_PATTERN = /^[A-Z]{2,8}$/;
export const ISO3_PATTERN = /^[A-Z]{3}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DOMAIN_ID_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;
export const PREFIX_PATTERN = /^[A-Z]{2,4}$/;

// Even a short note can carry evidence. Index any non-whitespace text; this does not
// establish that text extraction captured the page's images, tables or scanned content.
export const UNREADABLE_MIN_CHARS = 1;
