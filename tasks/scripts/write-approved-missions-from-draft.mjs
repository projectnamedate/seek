import fs from 'node:fs';
import path from 'node:path';

const draftPath = path.resolve('tasks/mission-final-list-draft.md');
const outputPath = path.resolve('backend/src/data/missions.ts');
const listOutputPath = path.resolve('tasks/mission-list-by-tier.md');

const draft = fs.readFileSync(draftPath, 'utf8').split(/\r?\n/);

const rows = [];
let currentLocation = null;

for (const line of draft) {
  const locationMatch = line.match(/^### (Outdoor|Indoor) \((\d+)\)$/);
  if (locationMatch) {
    currentLocation = locationMatch[1].toLowerCase();
    continue;
  }

  const missionMatch = line.match(/^- `t([123])-(\d{3})` (Find .+)$/);
  if (!missionMatch) continue;

  if (currentLocation !== 'outdoor' && currentLocation !== 'indoor') {
    throw new Error(`Mission without location section: ${line}`);
  }

  rows.push({
    tier: Number(missionMatch[1]),
    expectedIndex: Number(missionMatch[2]),
    description: missionMatch[3],
    location: currentLocation,
  });
}

const expected = {
  1: { outdoor: 140, indoor: 60 },
  2: { outdoor: 120, indoor: 80 },
  3: { outdoor: 100, indoor: 100 },
};

function count(tier, location) {
  return rows.filter((row) => row.tier === tier && row.location === location).length;
}

for (const tier of [1, 2, 3]) {
  const tierRows = rows.filter((row) => row.tier === tier);
  if (tierRows.length !== 200) {
    throw new Error(`tier ${tier} expected 200 missions, got ${tierRows.length}`);
  }

  for (const location of ['outdoor', 'indoor']) {
    const actual = count(tier, location);
    if (actual !== expected[tier][location]) {
      throw new Error(`tier ${tier} ${location} expected ${expected[tier][location]}, got ${actual}`);
    }
  }

  tierRows.forEach((row, index) => {
    if (row.expectedIndex !== index + 1) {
      throw new Error(`tier ${tier} index mismatch at ${row.description}`);
    }
  });
}

if (rows.length !== 600) {
  throw new Error(`expected 600 missions, got ${rows.length}`);
}

const seenDescriptions = new Set();
for (const row of rows) {
  if (seenDescriptions.has(row.description)) {
    throw new Error(`duplicate mission description: ${row.description}`);
  }
  seenDescriptions.add(row.description);
}

function quote(value) {
  return JSON.stringify(value);
}

const seedLines = rows.map((row) => {
  return `  { tier: ${row.tier}, description: ${quote(row.description)}, location: '${row.location}' },`;
});

const source = `import { Mission, Tier } from '../types';

type MissionLocation = Mission['location'];
type MissionDifficulty = Mission['difficulty'];
type MissionSeed = Pick<Mission, 'tier' | 'description' | 'location'>;

const TIER_LIST = [1, 2, 3] as const;
const LOCATION_LIST = ['outdoor', 'indoor'] as const;

export const OUTDOOR_RATIO: Record<Tier, number> = { 1: 0.70, 2: 0.60, 3: 0.50 };

const EXPECTED_COUNTS: Record<Tier, Record<MissionLocation, number>> = {
  1: { outdoor: 140, indoor: 60 },
  2: { outdoor: 120, indoor: 80 },
  3: { outdoor: 100, indoor: 100 },
};

const DIFFICULTY_BY_TIER: Record<Tier, MissionDifficulty> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
};

const KEYWORD_STOPWORDS = new Set([
  'find', 'with', 'showing', 'visible', 'together', 'beside', 'nearby', 'near',
  'above', 'below', 'under', 'inside', 'outside', 'behind', 'front', 'area',
  'zone', 'point', 'sign', 'and', 'the', 'for', 'from', 'into', 'onto', 'one',
  'two', 'three', 'four', 'its', 'or', 'of', 'a', 'an', 'in', 'on', 'at', 'to',
]);

const missionSeeds: MissionSeed[] = [
${seedLines.join('\n')}
];

function missionId(tier: Tier, index: number): string {
  return \`t\${tier}-\${String(index + 1).padStart(3, '0')}\`;
}

function deriveKeywords(description: string): string[] {
  const normalized = description
    .replace(/^Find\\s+/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, ' ')
    .replace(/-/g, ' ');

  const words = normalized
    .split(/\\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !KEYWORD_STOPWORDS.has(word));

  return Array.from(new Set(words)).slice(0, 8);
}

function assertMissionPoolShape(missions: Mission[]): void {
  if (missions.length !== 600) {
    throw new Error(\`Expected 600 missions, got \${missions.length}\`);
  }

  const ids = new Set<string>();
  const descriptions = new Set<string>();

  for (const mission of missions) {
    if (ids.has(mission.id)) {
      throw new Error(\`Duplicate mission id: \${mission.id}\`);
    }
    ids.add(mission.id);

    if (descriptions.has(mission.description)) {
      throw new Error(\`Duplicate mission description: \${mission.description}\`);
    }
    descriptions.add(mission.description);

    if (mission.keywords.length === 0) {
      throw new Error(\`Mission has no validation keywords: \${mission.id}\`);
    }
  }

  for (const tier of TIER_LIST) {
    const tierMissions = missions.filter((mission) => mission.tier === tier);
    if (tierMissions.length !== 200) {
      throw new Error(\`Tier \${tier} expected 200 missions, got \${tierMissions.length}\`);
    }

    for (const location of LOCATION_LIST) {
      const actual = tierMissions.filter((mission) => mission.location === location).length;
      const expected = EXPECTED_COUNTS[tier][location];
      if (actual !== expected) {
        throw new Error(\`Tier \${tier} \${location} expected \${expected} missions, got \${actual}\`);
      }
    }
  }
}

function generateMissions(): Mission[] {
  const tierIndexes: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };

  const missions = missionSeeds.map((seed) => {
    const index = tierIndexes[seed.tier]++;

    return {
      ...seed,
      id: missionId(seed.tier, index),
      difficulty: DIFFICULTY_BY_TIER[seed.tier],
      keywords: deriveKeywords(seed.description),
    };
  });

  assertMissionPoolShape(missions);
  return missions;
}

export const MISSIONS = generateMissions();

export function getMissionsByTier(tier: Tier): Mission[] {
  return MISSIONS.filter((mission) => mission.tier === tier);
}

export function getMissionsByTierAndLocation(tier: Tier, location: MissionLocation): Mission[] {
  return MISSIONS.filter((mission) => mission.tier === tier && mission.location === location);
}

export function getRandomMission(tier: Tier, random: () => number = Math.random): Mission {
  const location: MissionLocation = random() < OUTDOOR_RATIO[tier] ? 'outdoor' : 'indoor';
  const pool = getMissionsByTierAndLocation(tier, location);

  if (pool.length === 0) {
    const allTierMissions = getMissionsByTier(tier);
    return allTierMissions[Math.floor(random() * allTierMissions.length)];
  }

  return pool[Math.floor(random() * pool.length)];
}

export function getMissionById(id: string): Mission | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
`;

fs.writeFileSync(outputPath, source);
console.log(outputPath);

const productionList = fs.readFileSync(draftPath, 'utf8')
  .replace(
    '# Seek Final Mission List Draft',
    '# Seek Mission List By Tier'
  )
  .replace(
    /^Status: .+$/m,
    'Status: Approved production mission list. Updated on 2026-05-19 for the 500 / 1000 / 2000 SKR tier ladder and more globally plausible targets.'
  );

fs.writeFileSync(listOutputPath, `${productionList.trimEnd()}\n`);
console.log(listOutputPath);
