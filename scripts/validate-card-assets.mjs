import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const manifestPath = path.join(rootDir, "src", "data", "tarot", "cards", "cards-manifest.json");

function normalizePublicPath(value) {
  if (!value || typeof value !== "string") return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

async function assertExactCase(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  const segments = relativePath.split(path.sep);
  let currentDir = rootDir;

  for (const segment of segments) {
    const entries = await readdir(currentDir);
    if (!entries.includes(segment)) {
      const caseInsensitiveMatch = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
      return {
        ok: false,
        reason: caseInsensitiveMatch ? `case mismatch: expected "${caseInsensitiveMatch}", got "${segment}"` : `missing segment "${segment}"`,
      };
    }
    currentDir = path.join(currentDir, segment);
  }

  return { ok: true };
}

async function validateAsset(cardId, field, value) {
  const publicPath = normalizePublicPath(value);
  if (!publicPath) {
    return [`${cardId}.${field}: empty path`];
  }

  if (/^https?:\/\//i.test(publicPath)) {
    return [];
  }

  if (!publicPath.startsWith("/cards/")) {
    return [`${cardId}.${field}: expected /cards/... path, got ${publicPath}`];
  }

  const filePath = path.join(publicDir, publicPath.slice(1));
  try {
    await access(filePath);
  } catch {
    return [`${cardId}.${field}: missing file ${publicPath}`];
  }

  const caseCheck = await assertExactCase(filePath);
  if (!caseCheck.ok) {
    return [`${cardId}.${field}: ${caseCheck.reason} (${publicPath})`];
  }

  return [];
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

for (const [cardId, meta] of Object.entries(manifest)) {
  errors.push(...(await validateAsset(cardId, "image", meta.image)));
  errors.push(...(await validateAsset(cardId, "original_image", meta.original_image)));
}

if (errors.length > 0) {
  console.error(`Card asset validation failed: ${errors.length} issue(s)`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Card asset validation passed: ${Object.keys(manifest).length} cards checked, 0 missing assets.`);
