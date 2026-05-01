import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIRS = ['backend/src', 'mobile/src'];
const FORBIDDEN_PATTERNS = [
  /\bDEMO_[A-Z0-9_]+\b/,
  /\bgetDemoVerification\b/,
  /\bDemoSGTMint\b/,
  /\bisDemoMode\b/,
  /\bisDemo\b/,
  /\bdemoBadge\b/,
  /\bdemoBadgeText\b/,
  /Demo Mode/i,
  /\/demo\b/,
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

test('production source has no demo-mode residue', () => {
  const matches: string[] = [];

  for (const sourceDir of SOURCE_DIRS) {
    for (const file of walk(path.join(REPO_ROOT, sourceDir))) {
      const contents = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(contents)) {
          matches.push(`${path.relative(REPO_ROOT, file)} matched ${pattern}`);
        }
      }
    }
  }

  assert.deepEqual(matches, []);
});
