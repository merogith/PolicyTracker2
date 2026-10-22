import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// The storage folder is configured at run time (STORAGE_DIR), so the bundler is told not to trace
// these paths; otherwise it would copy the whole project into the server output.

export function storageDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || "./storage");
}

/** Path of a document's original PDF, relative to the storage folder. */
export function pdfRelativePath(iso3: string, documentId: string) {
  return path.join(iso3, `${documentId}.pdf`);
}

export async function savePdf(relativePath: string, data: Buffer) {
  const full = path.join(/*turbopackIgnore: true*/ storageDir(), relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export function readPdf(relativePath: string) {
  return readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ storageDir(), relativePath));
}

export async function deletePdf(relativePath: string) {
  await rm(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ storageDir(), relativePath), { force: true });
}
