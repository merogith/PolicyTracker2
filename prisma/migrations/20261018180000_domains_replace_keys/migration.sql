-- Domains replace analysis keys (user decision, 2026-10-18).
-- Answers made per key cannot be mapped to domains, so they are removed here. `npm run db:seed` seeds
-- the domains and topics from fresh-start/config/taxonomy.json and queues every document again.
DELETE FROM "Citation";
DELETE FROM "AnalysisResult";
DELETE FROM "Job" WHERE "type" IN ('analyse_document_key', 'synthesise_country_key');

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnalysisKey";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "groups" JSONB NOT NULL,
    "searchHints" JSONB NOT NULL,
    "maxResults" INTEGER NOT NULL DEFAULT 20,
    "order" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "placements" JSONB NOT NULL,
    "routing" JSONB NOT NULL,
    "legacyIds" JSONB NOT NULL,
    "splitFrom" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "retiredAt" DATETIME,
    "replacedBy" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxonomyState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'current',
    "baseVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domainId" TEXT NOT NULL,
    "domainVersion" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "documentId" TEXT,
    "countryId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "output" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "taxonomyVersion" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "fileSearchCalls" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "sources" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    CONSTRAINT "AnalysisResult_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisResult_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Answers keyed by analysis keys cannot be mapped to domains; they were cleared above.
DROP TABLE "AnalysisResult";
ALTER TABLE "new_AnalysisResult" RENAME TO "AnalysisResult";
CREATE INDEX "AnalysisResult_countryId_idx" ON "AnalysisResult"("countryId");
CREATE INDEX "AnalysisResult_documentId_idx" ON "AnalysisResult"("documentId");
CREATE UNIQUE INDEX "AnalysisResult_domainId_domainVersion_slot_key" ON "AnalysisResult"("domainId", "domainVersion", "slot");
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    "countryId" TEXT,
    "documentId" TEXT,
    "domainId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Job" ("attempts", "costUsd", "countryId", "createdAt", "dedupeKey", "documentId", "error", "finishedAt", "id", "inputTokens", "maxAttempts", "outputTokens", "payload", "runAfter", "startedAt", "status", "type") SELECT "attempts", "costUsd", "countryId", "createdAt", "dedupeKey", "documentId", "error", "finishedAt", "id", "inputTokens", "maxAttempts", "outputTokens", "payload", "runAfter", "startedAt", "status", "type" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_status_runAfter_idx" ON "Job"("status", "runAfter");
CREATE INDEX "Job_dedupeKey_status_idx" ON "Job"("dedupeKey", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Domain_prefix_key" ON "Domain"("prefix");

