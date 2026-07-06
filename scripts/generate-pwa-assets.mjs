import { mkdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const iconDir = "public/icons";
const splashDir = "public/splash";
const sourceIcon = `${iconDir}/app-icon-source.png`;

await mkdir(iconDir, { recursive: true });
await mkdir(splashDir, { recursive: true });

async function writeIcon(size, name) {
  await sharp(sourceIcon)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .png()
    .toFile(`${iconDir}/${name}`);
}

function splashSvg(width, height) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f5f0e6"/>
      <image href="data:image/png;base64,${sourceIconBase64}" x="${width / 2 - 128}" y="${height * 0.38 - 128}" width="256" height="256"/>
      <text x="50%" y="${height * 0.55}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="#22223b">Tarot Trainer</text>
      <text x="50%" y="${height * 0.55 + 72}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#7b4f35">Practice the reading, not the guess</text>
    </svg>
  `;
}

const sourceIconBase64 = await sharp(sourceIcon).resize(256, 256, { fit: "cover", position: "center" }).png().toBuffer().then((buffer) => buffer.toString("base64"));

await writeIcon(192, "pwa-192x192.png");
await writeIcon(512, "pwa-512x512.png");
await writeIcon(512, "pwa-maskable-512x512.png");
await writeIcon(180, "apple-touch-icon.png");
await writeIcon(192, "tarot-app-icon-192.png");
await writeIcon(512, "tarot-app-icon-512.png");
await writeIcon(512, "tarot-app-icon-maskable-512.png");
await writeIcon(180, "tarot-apple-touch-icon.png");

for (const [width, height] of [
  [1170, 2532],
  [1290, 2796],
  [1284, 2778],
  [1125, 2436],
  [828, 1792],
]) {
  await sharp(Buffer.from(splashSvg(width, height))).png().toFile(`${splashDir}/apple-splash-${width}-${height}.png`);
}
