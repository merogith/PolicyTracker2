ALTER TABLE "Country" ADD COLUMN "mainReportId" TEXT REFERENCES "CountryReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "CountryReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CountryReport_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CountryReport_countryId_fingerprint_key" ON "CountryReport"("countryId", "fingerprint");
CREATE INDEX "CountryReport_countryId_createdAt_idx" ON "CountryReport"("countryId", "createdAt");
CREATE TRIGGER "CountryReport_immutable" BEFORE UPDATE ON "CountryReport"
BEGIN SELECT RAISE(ABORT, 'Saved reports are immutable; create a new report'); END;
