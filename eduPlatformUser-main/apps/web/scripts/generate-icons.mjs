/**
 * PWA Icon Generator
 * Run: node scripts/generate-icons.mjs
 *
 * Requires: npm install -D sharp (one-time)
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");

mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(join(iconsDir, "icon.svg"));

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, name));
  console.log(`✓ Generated ${name} (${size}x${size})`);
}

console.log("\nDone! PWA icons generated in public/icons/");
