#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const assets = path.join(root, 'assets');
const screenshotDir = path.join(assets, 'screenshots', 'en-US');

const REQUIRED = [
  { path: path.join(assets, 'icon.png'), width: 512, height: 512, label: 'icon' },
  { path: path.join(assets, 'banner.png'), width: 1200, height: 600, label: 'banner' },
];

const OPTIONAL = [
  {
    path: path.join(assets, 'feature-graphic.png'),
    width: 1200,
    height: 1200,
    label: 'feature graphic',
  },
];

const errors = [];
const warnings = [];

for (const item of REQUIRED) {
  checkImage(item, errors);
}

for (const item of OPTIONAL) {
  if (fs.existsSync(item.path)) {
    checkImage(item, errors);
  } else {
    warnings.push(`${item.label}: optional file missing (${rel(item.path)})`);
  }
}

const screenshotFiles = fs.existsSync(screenshotDir)
  ? fs
      .readdirSync(screenshotDir)
      .filter((name) => /\.(png|jpe?g|mp4)$/i.test(name))
      .map((name) => path.join(screenshotDir, name))
      .sort()
  : [];

if (screenshotFiles.length < 4) {
  errors.push(
    `screenshots: expected at least 4 PNG/JPG/MP4 files in ${rel(screenshotDir)}, found ${screenshotFiles.length}`
  );
}

const imageScreenshots = [];
for (const file of screenshotFiles) {
  if (/\.mp4$/i.test(file)) {
    warnings.push(`screenshots: ${rel(file)} is MP4; dimensions not checked by this script`);
    continue;
  }
  const dimensions = readImageDimensions(file);
  if (!dimensions) {
    errors.push(`screenshots: could not read dimensions for ${rel(file)}`);
    continue;
  }
  if (dimensions.width < 1080 || dimensions.height < 1080) {
    errors.push(
      `screenshots: ${rel(file)} is ${dimensions.width}x${dimensions.height}; minimum is 1080x1080`
    );
  }
  imageScreenshots.push({ file, ...dimensions });
}

const firstAspect = imageScreenshots[0]
  ? aspectRatio(imageScreenshots[0].width, imageScreenshots[0].height)
  : null;
for (const shot of imageScreenshots.slice(1)) {
  const currentAspect = aspectRatio(shot.width, shot.height);
  if (firstAspect && currentAspect !== firstAspect) {
    errors.push(
      `screenshots: ${rel(shot.file)} aspect ratio ${currentAspect} does not match ${firstAspect}`
    );
  }
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`FAIL ${error}`);
  }
  process.exit(1);
}

console.log('dApp Store assets OK');

function checkImage(item, output) {
  if (!fs.existsSync(item.path)) {
    output.push(`${item.label}: missing ${rel(item.path)}`);
    return;
  }
  const dimensions = readImageDimensions(item.path);
  if (!dimensions) {
    output.push(`${item.label}: could not read dimensions for ${rel(item.path)}`);
    return;
  }
  if (dimensions.width !== item.width || dimensions.height !== item.height) {
    output.push(
      `${item.label}: expected ${item.width}x${item.height}, found ${dimensions.width}x${dimensions.height}`
    );
  }
}

function readImageDimensions(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24) return null;

  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) return null;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

function aspectRatio(width, height) {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function gcd(a, b) {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function rel(file) {
  return path.relative(root, file);
}
