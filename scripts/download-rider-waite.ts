import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type sharp from "sharp";
import type { TarotCardMeta, TarotManifest, TarotManifestSuit } from "../src/types/tarot";

type SharpFactory = typeof sharp;

type CardDownloadItem = Omit<TarotCardMeta, "image" | "original_image"> & {
  slug: string;
  sourceFiles: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicCardsDir = path.join(projectRoot, "public", "cards");
const manifestPath = path.join(projectRoot, "src", "data", "tarot", "cards", "cards-manifest.json");
const failedCardsPath = path.join(projectRoot, "failed-cards.json");

const commonsApiUrl = "https://commons.wikimedia.org/w/api.php";
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
const totalCardCount = 78;
const maxCardDownloadAttempts = 5;
const requestDelayRangeMs = [3000, 5000] as const;
const rateLimitBackoffMs = [10000, 30000, 60000, 120000] as const;

type FailedCardRecord = {
  card_id: string;
  source_files: string[];
  last_error: string;
  failed_at: string;
};

const majorCards = [
  ["00", "fool", "바보", "The Fool", "RWS_Tarot_00_Fool.jpg"],
  ["01", "magician", "마법사", "The Magician", "RWS_Tarot_01_Magician.jpg"],
  ["02", "high_priestess", "여사제", "The High Priestess", "RWS_Tarot_02_High_Priestess.jpg"],
  ["03", "empress", "여황제", "The Empress", "RWS_Tarot_03_Empress.jpg"],
  ["04", "emperor", "황제", "The Emperor", "RWS_Tarot_04_Emperor.jpg"],
  ["05", "hierophant", "교황", "The Hierophant", "RWS_Tarot_05_Hierophant.jpg"],
  ["06", "lovers", "연인", "The Lovers", "RWS_Tarot_06_Lovers.jpg"],
  ["07", "chariot", "전차", "The Chariot", "RWS_Tarot_07_Chariot.jpg"],
  ["08", "strength", "힘", "Strength", "RWS_Tarot_08_Strength.jpg"],
  ["09", "hermit", "은둔자", "The Hermit", "RWS_Tarot_09_Hermit.jpg"],
  ["10", "wheel_of_fortune", "운명의 수레바퀴", "Wheel of Fortune", "RWS_Tarot_10_Wheel_of_Fortune.jpg"],
  ["11", "justice", "정의", "Justice", "RWS_Tarot_11_Justice.jpg"],
  ["12", "hanged_man", "매달린 사람", "The Hanged Man", "RWS_Tarot_12_Hanged_Man.jpg"],
  ["13", "death", "죽음", "Death", "RWS_Tarot_13_Death.jpg"],
  ["14", "temperance", "절제", "Temperance", "RWS_Tarot_14_Temperance.jpg"],
  ["15", "devil", "악마", "The Devil", "RWS_Tarot_15_Devil.jpg"],
  ["16", "tower", "탑", "The Tower", "RWS_Tarot_16_Tower.jpg"],
  ["17", "star", "별", "The Star", "RWS_Tarot_17_Star.jpg"],
  ["18", "moon", "달", "The Moon", "RWS_Tarot_18_Moon.jpg"],
  ["19", "sun", "태양", "The Sun", "RWS_Tarot_19_Sun.jpg"],
  ["20", "judgement", "심판", "Judgement", "RWS_Tarot_20_Judgement.jpg"],
  ["21", "world", "세계", "The World", "RWS_Tarot_21_World.jpg"],
] as const;

const minorRanks = [
  ["01", "ace", "Ace", "에이스"],
  ["02", "two", "Two", "2"],
  ["03", "three", "Three", "3"],
  ["04", "four", "Four", "4"],
  ["05", "five", "Five", "5"],
  ["06", "six", "Six", "6"],
  ["07", "seven", "Seven", "7"],
  ["08", "eight", "Eight", "8"],
  ["09", "nine", "Nine", "9"],
  ["10", "ten", "Ten", "10"],
  ["11", "page", "Page", "페이지"],
  ["12", "knight", "Knight", "기사"],
  ["13", "queen", "Queen", "퀸"],
  ["14", "king", "King", "킹"],
] as const;

const suitMeta: Record<TarotManifestSuit, { ko: string; en: string; filePrefixes: string[] }> = {
  wands: { ko: "완드", en: "Wands", filePrefixes: ["Wands"] },
  cups: { ko: "컵", en: "Cups", filePrefixes: ["Cups"] },
  swords: { ko: "소드", en: "Swords", filePrefixes: ["Swords"] },
  pentacles: { ko: "펜타클", en: "Pentacles", filePrefixes: ["Pents", "Pentacles"] },
};

const cardItems: CardDownloadItem[] = [
  ...majorCards.map(([number, slug, nameKo, nameEn, sourceFile]) => ({
    card_id: `major_${number}_${slug}`,
    name_ko: nameKo,
    name_en: nameEn,
    arcana: "major" as const,
    slug: `${number}_${slug}`,
    sourceFiles: [sourceFile],
  })),
  ...Object.entries(suitMeta).flatMap(([suit, meta]) =>
    minorRanks.map(([rankNumber, rankSlug, rankName, rankNameKo]) => ({
      card_id: `${suit}_${rankNumber}`,
      name_ko: `${meta.ko} ${rankNameKo}`,
      name_en: `${rankName} of ${meta.en}`,
      arcana: "minor" as const,
      suit: suit as TarotManifestSuit,
      number: Number(rankNumber),
      slug: `${rankNumber}_${rankSlug}`,
      sourceFiles: meta.filePrefixes.map((prefix) => `${prefix}${rankNumber}.jpg`),
    })),
  ),
];

async function main() {
  const sharp = await loadSharp();
  const sourceUrlMap = await buildSourceUrlMap();
  const failedCards = await readFailedCards();
  const downloadQueue = sortFailedCardsFirst(cardItems, failedCards);
  const failures: FailedCardRecord[] = [];
  let downloadedCount = 0;
  let skippedOriginalCount = 0;
  let optimizedCount = 0;
  let skippedOptimizedCount = 0;

  for (const item of downloadQueue) {
    const originalPath = getOriginalPath(item);
    const optimizedPath = getOptimizedPath(item);
    await mkdir(path.dirname(originalPath), { recursive: true });
    await mkdir(path.dirname(optimizedPath), { recursive: true });

    if (existsSync(originalPath)) {
      skippedOriginalCount += 1;
    } else {
      const result = await downloadOriginal(item, originalPath, sourceUrlMap);
      if (result.ok) {
        downloadedCount += 1;
      } else {
        failures.push({
          card_id: item.card_id,
          source_files: item.sourceFiles,
          last_error: result.error,
          failed_at: new Date().toISOString(),
        });
        continue;
      }
    }

    if (existsSync(optimizedPath)) {
      skippedOptimizedCount += 1;
    } else {
      await optimizeImage(sharp, originalPath, optimizedPath);
      optimizedCount += 1;
    }
  }

  await writeManifest();
  await writeFailedCards(failures);
  const assetStats = countDownloadedCards();

  console.log(`Original downloaded: ${downloadedCount}`);
  console.log(`Original skipped: ${skippedOriginalCount}`);
  console.log(`Optimized created: ${optimizedCount}`);
  console.log(`Optimized skipped: ${skippedOptimizedCount}`);
  console.log(`Manifest written: ${manifestPath}`);
  console.log(`Failed cards queue: ${failedCardsPath}`);
  console.log(`Current images: ${assetStats.completeCards}/${totalCardCount}`);
  console.log(`Remaining images: ${totalCardCount - assetStats.completeCards}`);

  if (failures.length > 0) {
    console.error(`Failed cards (${failures.length}): ${failures.map((failure) => failure.card_id).join(", ")}`);
    process.exitCode = 1;
  }
}

async function loadSharp(): Promise<SharpFactory> {
  try {
    const sharpModule = await import("sharp");
    return sharpModule.default;
  } catch {
    throw new Error("sharp is required. Run `npm install` before `npm run download-cards`.");
  }
}

async function downloadOriginal(item: CardDownloadItem, outputPath: string, sourceUrlMap: Map<string, string>) {
  let lastError = "No source URL resolved";

  for (let attempt = 1; attempt <= maxCardDownloadAttempts; attempt += 1) {
    for (const sourceFile of item.sourceFiles) {
      const resolvedUrl =
        sourceUrlMap.get(sourceFile) ??
        (await resolveSingleSourceUrl(sourceFile)) ??
        `https://en.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(sourceFile)}`;

      const result = await tryDownloadImage(resolvedUrl, sourceFile, outputPath);

      if (result.ok) {
        console.log(`Downloaded ${item.card_id} from ${sourceFile}`);
        return { ok: true as const };
      }

      lastError = result.error;

      if (result.rateLimited && attempt < maxCardDownloadAttempts) {
        const backoffMs = rateLimitBackoffMs[Math.min(attempt - 1, rateLimitBackoffMs.length - 1)];
        console.warn(`${item.card_id} was rate limited. Waiting ${Math.round(backoffMs / 1000)}s before retry ${attempt + 1}/${maxCardDownloadAttempts}.`);
        await delay(backoffMs);
        break;
      }
    }
  }

  console.error(`Could not download ${item.card_id}; tried ${item.sourceFiles.join(", ")}`);
  return { ok: false as const, error: lastError };
}

async function tryDownloadImage(url: string, sourceFile: string, outputPath: string) {
  await delay(randomRequestDelayMs());
  const response = await fetchImage(url);

  if (response.status === 429) {
    return { ok: false as const, rateLimited: true, error: "HTTP 429 rate limited" };
  }

  if (!response.ok || !response.body) {
    return { ok: false as const, rateLimited: false, error: `HTTP ${response.status}` };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    const mediaUrl = extractWikimediaMediaUrl(await response.text(), sourceFile) ?? (await resolveMediaUrlFromFilePage(sourceFile));

    if (!mediaUrl) {
      return { ok: false as const, rateLimited: false, error: `Expected image content, received ${contentType || "unknown"}` };
    }

    await delay(randomRequestDelayMs());
    const mediaResponse = await fetchImage(mediaUrl);

    if (mediaResponse.status === 429) {
      return { ok: false as const, rateLimited: true, error: "HTTP 429 rate limited" };
    }

    if (!mediaResponse.ok || !mediaResponse.headers.get("content-type")?.startsWith("image/")) {
      return { ok: false as const, rateLimited: false, error: `Media request failed with HTTP ${mediaResponse.status}` };
    }

    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    await writeFile(outputPath, buffer);
    return { ok: true as const };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  return { ok: true as const };
}

function extractWikimediaMediaUrl(html: string, sourceFile: string) {
  const escapedFileName = sourceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`https?:\\\\/\\\\/upload\\\\.wikimedia\\\\.org[^"']+${escapedFileName}`, "i"));
  const protocolRelativeMatch = html.match(new RegExp(`//upload\\\\.wikimedia\\\\.org[^"']+${escapedFileName}`, "i"));
  const rawUrl = match?.[0] ?? (protocolRelativeMatch?.[0] ? `https:${protocolRelativeMatch[0]}` : undefined);

  return rawUrl?.replaceAll("&amp;", "&");
}

async function resolveMediaUrlFromFilePage(sourceFile: string) {
  const pageResponse = await fetch(`https://en.wikipedia.org/wiki/File:${encodeURIComponent(sourceFile)}`, {
    headers: {
      "User-Agent": "TarotTrainer/0.1 card asset downloader (Wikimedia Commons)",
    },
  });

  if (!pageResponse.ok) {
    return undefined;
  }

  return extractWikimediaMediaUrl(await pageResponse.text(), sourceFile);
}

async function fetchImage(url: string) {
  return fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "TarotTrainer/0.1 card asset downloader (Wikimedia Commons)",
    },
  });
}

async function resolveSingleSourceUrl(sourceFile: string) {
  await delay(700);

  for (const apiUrl of [commonsApiUrl, wikipediaApiUrl]) {
    const resolvedUrls = await resolveFileUrls(apiUrl, [sourceFile]);
    const resolvedUrl = resolvedUrls.get(sourceFile);

    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  return undefined;
}

async function buildSourceUrlMap() {
  const sourceFiles = [...new Set(cardItems.flatMap((item) => item.sourceFiles))];
  const urlMap = new Map<string, string>();

  for (const apiUrl of [commonsApiUrl, wikipediaApiUrl]) {
    const missingSourceFiles = sourceFiles.filter((sourceFile) => !urlMap.has(sourceFile));
    const resolvedUrls = await resolveFileUrls(apiUrl, missingSourceFiles);

    for (const [sourceFile, url] of resolvedUrls) {
      urlMap.set(sourceFile, url);
    }
  }

  const missingSourceFiles = sourceFiles.filter((sourceFile) => !urlMap.has(sourceFile));
  const pageUrls = await resolveUrlsFromRiderWaitePage(missingSourceFiles);

  for (const [sourceFile, url] of pageUrls) {
    urlMap.set(sourceFile, url);
  }

  return urlMap;
}

async function resolveUrlsFromRiderWaitePage(sourceFiles: string[]) {
  const resolvedUrls = new Map<string, string>();

  if (sourceFiles.length === 0) {
    return resolvedUrls;
  }

  const pageResponse = await fetch("https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot", {
    headers: {
      "User-Agent": "TarotTrainer/0.1 card asset downloader (Wikimedia Commons)",
    },
  });

  if (!pageResponse.ok) {
    return resolvedUrls;
  }

  const html = await pageResponse.text();

  for (const sourceFile of sourceFiles) {
    const escapedFileName = sourceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`//upload\\.wikimedia\\.org/wikipedia/commons/thumb/([^"']+/${escapedFileName})/\\d+px-${escapedFileName}`, "i"));

    if (match?.[1]) {
      resolvedUrls.set(sourceFile, `https://upload.wikimedia.org/wikipedia/commons/${match[1]}`);
    }
  }

  return resolvedUrls;
}

async function resolveFileUrls(apiUrl: string, sourceFiles: string[]) {
  const resolvedUrls = new Map<string, string>();
  const batchSize = 40;

  for (let index = 0; index < sourceFiles.length; index += batchSize) {
    const batch = sourceFiles.slice(index, index + batchSize);
    const batchUrls = await resolveFileUrlBatch(apiUrl, batch);

    for (const [sourceFile, url] of batchUrls) {
      resolvedUrls.set(sourceFile, url);
    }
  }

  return resolvedUrls;
}

async function resolveFileUrlBatch(apiUrl: string, sourceFiles: string[]) {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|mime",
    titles: sourceFiles.map((sourceFile) => `File:${sourceFile}`).join("|"),
  });

  const response = await fetchWithRetry(`${apiUrl}?${query.toString()}`);

  if (!response.ok) {
    return new Map<string, string>();
  }

  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, { title?: string; missing?: string; imageinfo?: Array<{ url?: string; mime?: string }> }>;
    };
  };

  const resolvedUrls = new Map<string, string>();

  for (const page of Object.values(payload.query?.pages ?? {})) {
    const imageInfo = page.imageinfo?.[0];
    const fileName = page.title?.replace(/^File:/, "");

    if (page.missing === undefined && fileName && imageInfo?.url && imageInfo.mime?.startsWith("image/")) {
      resolvedUrls.set(fileName, imageInfo.url);
    }
  }

  return resolvedUrls;
}

async function fetchWithRetry(url: string) {
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TarotTrainer/0.1 card asset downloader (Wikimedia Commons)",
      },
    });

    lastResponse = response;

    if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
      return response;
    }

    const body = await response.text();
    if (!body.includes("too many requests") && response.status !== 429) {
      return new Response(body, { status: response.status, headers: response.headers });
    }

    await delay(5000 * (attempt + 1));
  }

  return lastResponse ?? fetch(url);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomRequestDelayMs() {
  const [min, max] = requestDelayRangeMs;
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function readFailedCards() {
  if (!existsSync(failedCardsPath)) {
    return [];
  }

  try {
    const content = await readFile(failedCardsPath, "utf8");
    const parsed = JSON.parse(content) as FailedCardRecord[];
    const knownCardIds = new Set(cardItems.map((item) => item.card_id));
    return parsed.filter((record) => knownCardIds.has(record.card_id));
  } catch {
    return [];
  }
}

async function writeFailedCards(failures: FailedCardRecord[]) {
  await writeFile(failedCardsPath, `${JSON.stringify(failures, null, 2)}\n`, "utf8");
}

function sortFailedCardsFirst(items: CardDownloadItem[], failedCards: FailedCardRecord[]) {
  const failedCardIds = new Set(failedCards.map((record) => record.card_id));
  const failedItems = items.filter((item) => failedCardIds.has(item.card_id));
  const otherItems = items.filter((item) => !failedCardIds.has(item.card_id));
  return [...failedItems, ...otherItems];
}

function countDownloadedCards() {
  const completeCards = cardItems.filter((item) => existsSync(getOriginalPath(item)) && existsSync(getOptimizedPath(item))).length;
  return { completeCards };
}

async function optimizeImage(sharp: SharpFactory, inputPath: string, outputPath: string) {
  const source = await readFile(inputPath);
  let quality = 82;
  let output = await createWebp(sharp, source, quality);

  while (output.length > 300 * 1024 && quality > 56) {
    quality -= 6;
    output = await createWebp(sharp, source, quality);
  }

  await writeFile(outputPath, output);
}

async function createWebp(sharp: SharpFactory, source: Buffer, quality: number) {
  return sharp(source).resize({ width: 800, withoutEnlargement: true }).webp({ quality }).toBuffer();
}

async function writeManifest() {
  const manifest = cardItems.reduce<TarotManifest>((accumulator, item) => {
    const optimizedPath = toPublicPath(getOptimizedPath(item));
    const originalPath = toPublicPath(getOriginalPath(item));

    accumulator[item.card_id] = {
      card_id: item.card_id,
      name_ko: item.name_ko,
      name_en: item.name_en,
      arcana: item.arcana,
      ...(item.suit ? { suit: item.suit } : {}),
      ...(item.number ? { number: item.number } : {}),
      image: optimizedPath,
      original_image: originalPath,
    };

    return accumulator;
  }, {});

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function getOriginalPath(item: CardDownloadItem) {
  return path.join(publicCardsDir, "original", getCardSubdirectory(item), `${item.slug}.jpg`);
}

function getOptimizedPath(item: CardDownloadItem) {
  return path.join(publicCardsDir, "optimized", getCardSubdirectory(item), `${item.slug}.webp`);
}

function getCardSubdirectory(item: CardDownloadItem) {
  return item.arcana === "major" ? "major" : path.join("minor", item.suit ?? "unknown");
}

function toPublicPath(filePath: string) {
  return filePath.replace(publicCardsDir, "/cards").replaceAll(path.sep, "/") as `/cards/${string}`;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
