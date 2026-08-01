#!/usr/bin/env node
// 從 frontend/public/icons/source.svg 生成 PWA 所需的各尺寸 PNG icon
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(here, '../../frontend/public/icons');
const publicDir = path.resolve(here, '../../frontend/public');
const srcSvg = path.join(iconsDir, 'source.svg');

const svg = await fs.readFile(srcSvg);

const outputs = [
  { file: path.join(iconsDir, 'icon-192.png'), size: 192 },
  { file: path.join(iconsDir, 'icon-512.png'), size: 512 },
  { file: path.join(iconsDir, 'icon-512-maskable.png'), size: 512 },
  { file: path.join(iconsDir, 'apple-touch-icon.png'), size: 180 },
  { file: path.join(publicDir, 'favicon.png'), size: 64 },
];

for (const { file, size } of outputs) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log(`✓ ${path.relative(process.cwd(), file)} (${size}×${size})`);
}
