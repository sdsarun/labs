import { promises as fsPromises } from "fs";
import { randomBytes } from "crypto";
import { join } from "path";
import type { Request, UploadOptions, UploadedFile } from "../core/types.js";

const { mkdir, writeFile } = fsPromises;

function ensureDirectory(path: string) {
  return mkdir(path, { recursive: true }).catch(() => undefined);
}

/**
 * Parses a multipart/form-data payload into files and form fields.
 */
export async function parseMultipartForm(
  req: Request,
  options: UploadOptions
): Promise<UploadedFile[]> {
  const contentType = req.headers["content-type"];
  if (typeof contentType !== "string" || !contentType.startsWith("multipart/form-data")) {
    return [];
  }

  const boundaryMatch = contentType.match(/boundary=(.*)$/);
  if (!boundaryMatch) {
    return [];
  }

  const boundary = `--${boundaryMatch[1]}`;
  const body = req.rawBody ?? Buffer.alloc(0);
  const parts = body.toString("binary").split(boundary);
  const files: UploadedFile[] = [];
  const fileMap: Record<string, UploadedFile[]> = {};

  const fieldConstraints = new Map<string, { maxCount?: number }>();
  const fieldCounts = new Map<string, number>();
  options.fields?.forEach((field) => {
    fieldConstraints.set(field.name, { maxCount: field.maxCount });
    fieldCounts.set(field.name, 0);
  });

  for (const rawPart of parts) {
    if (rawPart === "--\r\n" || rawPart === "--" || rawPart.trim() === "") {
      continue;
    }

    const [rawHeaders, rawContent] = rawPart.split("\r\n\r\n");
    if (!rawHeaders || rawContent === undefined) {
      continue;
    }

    const headers = rawHeaders.split("\r\n").filter(Boolean);
    const disposition = headers.find((h) => h.toLowerCase().startsWith("content-disposition"));
    if (!disposition) {
      continue;
    }

    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) {
      continue;
    }
    const fieldName = nameMatch[1];

    const filenameMatch = disposition.match(/filename="([^"]*)"/);
    const contentTypeHeader = headers.find((h) => h.toLowerCase().startsWith("content-type"));
    const mimeType = contentTypeHeader ? contentTypeHeader.split(":")[1].trim() : "application/octet-stream";

    let contentBinary = rawContent;
    if (contentBinary.endsWith("--")) {
      contentBinary = contentBinary.slice(0, -2);
    }
    if (contentBinary.endsWith("\r\n")) {
      contentBinary = contentBinary.slice(0, -2);
    }
    const contentBuffer = Buffer.from(contentBinary, "binary");

    if (!filenameMatch || filenameMatch[1] === "") {
      // Treat as field; merge into body object
      const value = contentBuffer.toString("utf8");
      if (!isPlainObject(req.body)) {
        req.body = {};
      }
      (req.body as Record<string, unknown>)[fieldName] = value;
      continue;
    }

    if (options.fields && !fieldConstraints.has(fieldName)) {
      throw new Error(`Unexpected file field ${fieldName}`);
    }

    if (fieldConstraints.has(fieldName)) {
      const current = (fieldCounts.get(fieldName) ?? 0) + 1;
      fieldCounts.set(fieldName, current);
      const limit = fieldConstraints.get(fieldName)?.maxCount;
      if (limit !== undefined && current > limit) {
        throw new Error(`Too many files provided for field ${fieldName}`);
      }
    }

    if (options.allowMimeTypes && !options.allowMimeTypes.includes(mimeType)) {
      throw new Error(`Disallowed file type for field ${fieldName}`);
    }

    if (options.maxFileSize && contentBuffer.length > options.maxFileSize) {
      throw new Error(`File too large for field ${fieldName}`);
    }

    const filename = options.keepExtensions ? filenameMatch[1] : randomFilename(filenameMatch[1]);
    let tempFilePath: string | undefined;

    if (!options.memory) {
      const directory = options.directory ?? join(process.cwd(), "uploads");
      await ensureDirectory(directory);
      tempFilePath = join(directory, filename);
      await writeFile(tempFilePath, contentBuffer);
    }

    files.push({
      fieldName,
      filename,
      mimeType,
      encoding: "binary",
      size: contentBuffer.length,
      buffer: options.memory ? contentBuffer : undefined,
      tempFilePath
    });

    if (!fileMap[fieldName]) {
      fileMap[fieldName] = [];
    }
    fileMap[fieldName].push(files[files.length - 1]);

    if (options.maxFiles && files.length >= options.maxFiles) {
      break;
    }
  }

  if (Object.keys(fileMap).length > 0) {
    req.fileMap = fileMap;
  }

  return files;
}

/**
 * Generates a random filename while optionally keeping original extension.
 */
function randomFilename(originalName: string): string {
  const extIndex = originalName.lastIndexOf(".");
  const ext = extIndex !== -1 ? originalName.slice(extIndex) : "";
  return `${randomBytes(8).toString("hex")}${ext}`;
}

/**
 * Checks whether the supplied value is a plain object literal.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}
