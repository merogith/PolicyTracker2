-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iso3" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vectorStoreId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "docCounters" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "kindSeq" INTEGER NOT NULL,
    "editionDate" TEXT NOT NULL,
    "language" TEXT,
    "pageCount" INTEGER,
    "pdfPath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "openaiFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Page" (
    "documentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "label" TEXT,
    "text" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "openaiFileId" TEXT,

    PRIMARY KEY ("documentId", "page"),
    CONSTRAINT "Page_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'both',
    "outputType" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'retrieval',
    "searchHints" JSONB NOT NULL,
    "maxResults" INTEGER NOT NULL DEFAULT 20,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyId" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "documentId" TEXT,
    "countryId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "output" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
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
    CONSTRAINT "AnalysisResult_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "AnalysisKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisResult_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "citedPage" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "itemPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "Citation_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AnalysisResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Citation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
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
    "keyId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso3_key" ON "Country"("iso3");

-- CreateIndex
CREATE INDEX "Document_countryId_idx" ON "Document"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_countryId_kind_kindSeq_key" ON "Document"("countryId", "kind", "kindSeq");

-- CreateIndex
CREATE INDEX "AnalysisResult_countryId_idx" ON "AnalysisResult"("countryId");

-- CreateIndex
CREATE INDEX "AnalysisResult_documentId_idx" ON "AnalysisResult"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_keyId_keyVersion_slot_key" ON "AnalysisResult"("keyId", "keyVersion", "slot");

-- CreateIndex
CREATE INDEX "Citation_resultId_idx" ON "Citation"("resultId");

-- CreateIndex
CREATE INDEX "Citation_documentId_page_idx" ON "Citation"("documentId", "page");

-- CreateIndex
CREATE INDEX "Job_status_runAfter_idx" ON "Job"("status", "runAfter");

-- CreateIndex
CREATE INDEX "Job_dedupeKey_status_idx" ON "Job"("dedupeKey", "status");
