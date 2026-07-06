import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const iconDir = "public/icons";
const splashDir = "public/splash";

await mkdir(iconDir, { recursive: true });
await mkdir(splashDir, { recursive: true });

function iconSvg(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.2);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="#22223b"/>
      <circle cx="${size * 0.74}" cy="${size * 0.22}" r="${size * 0.09}" fill="#f5f0e6" opacity="0.92"/>
      <path d="M ${size * 0.74} ${size * 0.06} L ${size * 0.765} ${size * 0.175} L ${size * 0.88} ${size * 0.2} L ${size * 0.765} ${size * 0.225} L ${size * 0.74} ${size * 0.34} L ${size * 0.715} ${size * 0.225} L ${size * 0.6} ${size * 0.2} L ${size * 0.715} ${size * 0.175} Z" fill="#d8b36a"/>
      <rect x="${size * 0.24}" y="${size * 0.21}" width="${size * 0.42}" height="${size * 0.58}" rx="${size * 0.035}" fill="#f5f0e6" stroke="#d8b36a" stroke-width="${size * 0.025}"/>
      <path d="M ${size * 0.45} ${size * 0.34} C ${size * 0.36} ${size * 0.44}, ${size * 0.36} ${size * 0.57}, ${size * 0.45} ${size * 0.66} C ${size * 0.54} ${size * 0.57}, ${size * 0.54} ${size * 0.44}, ${size * 0.45} ${size * 0.34} Z" fill="#7f1d3a"/>
      <circle cx="${size * 0.45}" cy="${size * 0.5}" r="${size * 0.055}" fill="#d8b36a"/>
      <text x="50%" y="${size * 0.9}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${size * 0.105}" font-weight="700" fill="#f5f0e6">Tarot</text>
    </svg>
  `;
}

async function writeIcon(size, name, maskable = false) {
  await sharp(Buffer.from(iconSvg(size, maskable))).png().toFile(`${iconDir}/${name}`);
}

function splashSvg(width, height) {
  const icon = iconSvg(256)
    .replace('<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">', "")
    .replace("</svg>", "");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f5f0e6"/>
      <g transform="translate(${width / 2 - 128} ${height * 0.38 - 128})">${icon}</g>
      <text x="50%" y="${height * 0.55}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="#22223b">Tarot Trainer</text>
      <text x="50%" y="${height * 0.55 + 72}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#7b4f35">Practice the reading, not the guess</text>
    </svg>
  `;
}

await writeIcon(192, "pwa-192x192.png");
await writeIcon(512, "pwa-512x512.png");
await writeIcon(512, "pwa-maskable-512x512.png", true);
await writeIcon(180, "apple-touch-icon.png");

for (const [width, height] of [
  [1170, 2532],
  [1290, 2796],
  [1284, 2778],
  [1125, 2436],
  [828, 1792],
]) {
  await sharp(Buffer.from(splashSvg(width, height))).png().toFile(`${splashDir}/apple-splash-${width}-${height}.png`);
}
