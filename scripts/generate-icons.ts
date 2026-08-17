import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const standardSvg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3b82f6"/>
  <path d="M160 260 L228 328 L352 184" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const maskableSvg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3b82f6"/>
  <path d="M180 270 L235 325 L332 205" stroke="white" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const appleTouchSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#3b82f6"/>
  <path d="M56 95 L80 119 L124 68" stroke="white" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await sharp(Buffer.from(standardSvg(192))).png().toFile(path.join(OUT_DIR, "icon-192.png"));
  await sharp(Buffer.from(standardSvg(512))).png().toFile(path.join(OUT_DIR, "icon-512.png"));
  await sharp(Buffer.from(maskableSvg(512)))
    .png()
    .toFile(path.join(OUT_DIR, "icon-maskable-512.png"));
  await sharp(Buffer.from(appleTouchSvg))
    .png()
    .toFile(path.join(OUT_DIR, "apple-touch-icon.png"));

  console.log("Icons generated in public/icons/");
}

main();
