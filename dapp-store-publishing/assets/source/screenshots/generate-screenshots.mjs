#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'en-US');
fs.mkdirSync(outDir, { recursive: true });

const W = 1440;
const H = 2880;
const font = "'PP Mori Regular','PP Mori Regular Placeholder','Avenir Next','Helvetica Neue',Arial,sans-serif";
const utility = "'Rational TW Text Book','Rational TW Text Book Placeholder','Avenir Next','Helvetica Neue',Arial,sans-serif";
const iconHref = '../../logo/seek-mark.svg';

function escapeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function text({ x, y, value, size = 48, fill = '#f6f6f5', weight = 400, family = font, spacing = 0, anchor = 'start', opacity = 1 }) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" opacity="${opacity}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}">${escapeText(value)}</text>`;
}

function line({ x1, y1, x2, y2, stroke = '#10282c', width = 2, opacity = 1 }) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`;
}

function rect({ x, y, width, height, rx = 32, fill = '#101618', stroke = '#10282c', strokeWidth = 2, opacity = 1 }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
}

function pill(x, y, width, label, fill = '#cfe6e4', color = '#010101') {
  return [
    rect({ x, y, width, height: 92, rx: 46, fill, stroke: fill, strokeWidth: 0 }),
    text({ x: x + width / 2, y: y + 58, value: label, size: 30, fill: color, anchor: 'middle' }),
  ].join('\n');
}

function chrome(title, kicker) {
  return `
    ${text({ x: 92, y: 112, value: '9:41', size: 30, fill: '#99b3be', family: utility })}
    ${text({ x: 1348, y: 112, value: '5G', size: 28, fill: '#99b3be', family: utility, anchor: 'end' })}
    <image href="${iconHref}" x="92" y="170" width="132" height="132"/>
    ${text({ x: 252, y: 240, value: 'Seek', size: 72, fill: 'url(#wordmark)', spacing: -2.2 })}
    ${text({ x: 252, y: 282, value: kicker, size: 24, fill: '#99b3be', family: utility, spacing: 1.1 })}
    ${rect({ x: 1090, y: 178, width: 258, height: 74, rx: 37, fill: 'rgba(1,1,1,0.55)', stroke: '#373c3e', strokeWidth: 2 })}
    ${text({ x: 1219, y: 226, value: 'seeker.skr', size: 26, fill: '#cfe6e4', anchor: 'middle' })}
    ${text({ x: 92, y: 420, value: title, size: 74, fill: '#f6f6f5', spacing: -2.4 })}
  `;
}

function tier(x, y, label, entry, reward, active = false) {
  return `
    ${rect({ x, y, width: 380, height: 280, rx: 34, fill: active ? 'rgba(207,230,228,0.1)' : '#101618', stroke: active ? '#95d2e6' : '#10282c', strokeWidth: active ? 4 : 2 })}
    ${text({ x: x + 34, y: y + 62, value: label, size: 34, fill: active ? '#f6f6f5' : '#cfe6e4' })}
    ${text({ x: x + 34, y: y + 136, value: entry, size: 54, fill: '#95d2e6', spacing: -1 })}
    ${text({ x: x + 34, y: y + 194, value: reward, size: 25, fill: '#99b3be', family: utility })}
    ${rect({ x: x + 34, y: y + 222, width: active ? 230 : 160, height: 12, rx: 6, fill: active ? '#61afbd' : '#373c3e', stroke: 'none', strokeWidth: 0 })}
  `;
}

function base(title, kicker, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#010101"/>
      <stop offset="0.58" stop-color="#071314"/>
      <stop offset="1" stop-color="#10282c"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#101618"/>
      <stop offset="0.5" stop-color="#0b3446"/>
      <stop offset="0.74" stop-color="#0f0704"/>
      <stop offset="1" stop-color="#247b71"/>
    </linearGradient>
    <linearGradient id="wordmark" x1="92" y1="120" x2="486" y2="310" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f6f6f5"/>
      <stop offset="0.62" stop-color="#cfe6e4"/>
      <stop offset="1" stop-color="#95d2e6"/>
    </linearGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${line({ x1: 0, y1: 720, x2: W, y2: 720, stroke: '#cfe6e4', opacity: 0.04 })}
  ${line({ x1: 0, y1: 1440, x2: W, y2: 1440, stroke: '#cfe6e4', opacity: 0.04 })}
  ${line({ x1: 360, y1: 0, x2: 360, y2: H, stroke: '#cfe6e4', opacity: 0.035 })}
  ${line({ x1: 720, y1: 0, x2: 720, y2: H, stroke: '#cfe6e4', opacity: 0.035 })}
  ${line({ x1: 1080, y1: 0, x2: 1080, y2: H, stroke: '#cfe6e4', opacity: 0.035 })}
  ${chrome(title, kicker)}
  ${body}
  <text x="92" y="2750" fill="#373c3e" font-family="${utility}" font-size="24" letter-spacing="1.1">PROJECTNAMEDATE LLC</text>
</svg>`;
}

const screens = {
  '01-home.svg': base(
    'Scavenger hunts built for Seeker.',
    'Hunt. Capture. Win.',
    `
    ${rect({ x: 92, y: 508, width: 1256, height: 446, rx: 44, fill: 'url(#panel)', stroke: '#10282c', strokeWidth: 2 })}
    ${text({ x: 144, y: 612, value: 'Connected wallet', size: 26, fill: '#99b3be', family: utility, spacing: 1.1 })}
    ${text({ x: 144, y: 706, value: '12,840 SKR', size: 88, fill: '#cfe6e4', spacing: -2 })}
    ${text({ x: 144, y: 772, value: "Ready for today's field missions", size: 32, fill: '#f6f6f5' })}
    ${pill(144, 824, 276, 'Start hunt')}
    ${text({ x: 1050, y: 704, value: '4', size: 124, fill: '#95d2e6', anchor: 'middle', spacing: -2 })}
    ${text({ x: 1050, y: 758, value: 'DAY STREAK', size: 24, fill: '#99b3be', family: utility, spacing: 1.2, anchor: 'middle' })}
    ${text({ x: 92, y: 1064, value: 'Choose a tier', size: 44, fill: '#f6f6f5' })}
    ${tier(92, 1120, 'Scout', '50 SKR', 'Return on win')}
    ${tier(530, 1120, 'Hunter', '100 SKR', 'Return on win', true)}
    ${tier(968, 1120, 'Legend', '250 SKR', 'Return on win')}
    ${rect({ x: 92, y: 1488, width: 1256, height: 336, rx: 34, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 144, y: 1584, value: 'Recent mission', size: 32, fill: '#cfe6e4' })}
    ${text({ x: 144, y: 1662, value: 'Find a public chess table with pieces in play.', size: 40, fill: '#f6f6f5' })}
    ${text({ x: 144, y: 1728, value: 'Settled on Solana - return claimed', size: 28, fill: '#99b3be' })}
    `
  ),
  '02-connect-wallet.svg': base(
    'Connect your Seeker wallet.',
    'MOBILE WALLET ADAPTER',
    `
    ${rect({ x: 136, y: 560, width: 1168, height: 936, rx: 52, fill: '#101618', stroke: '#10282c' })}
    <image href="${iconHref}" x="520" y="650" width="400" height="400" filter="url(#softGlow)"/>
    ${text({ x: 720, y: 1160, value: 'Seeker wallet required', size: 58, fill: '#f6f6f5', anchor: 'middle', spacing: -1.4 })}
    ${text({ x: 720, y: 1230, value: 'Connect with Mobile Wallet Adapter to enter SKR missions and settle hunts.', size: 31, fill: '#99b3be', anchor: 'middle' })}
    ${pill(486, 1320, 468, 'Connect wallet')}
    ${rect({ x: 178, y: 1606, width: 1084, height: 360, rx: 34, fill: '#010101', stroke: '#373c3e' })}
    ${text({ x: 230, y: 1698, value: 'Seeker-native checks', size: 36, fill: '#cfe6e4' })}
    ${text({ x: 230, y: 1770, value: 'SKR balance • .skr identity • real camera proof', size: 32, fill: '#f6f6f5' })}
    ${text({ x: 230, y: 1840, value: 'No screenshots. No gallery uploads. No fake targets.', size: 30, fill: '#99b3be' })}
    `
  ),
  '03-start-hunt.svg': base(
    'Enter with SKR, reveal the hunt.',
    'COMMITMENT FLOW',
    `
    ${text({ x: 92, y: 520, value: 'Selected tier', size: 34, fill: '#99b3be', family: utility, spacing: 1.1 })}
    ${tier(92, 586, 'Hunter', '100 SKR', 'Payout: 250 SKR', true)}
    ${rect({ x: 530, y: 586, width: 818, height: 280, rx: 34, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 590, y: 674, value: 'Entry transaction', size: 42, fill: '#f6f6f5' })}
    ${text({ x: 590, y: 748, value: 'Your entry enters escrow before the target is revealed.', size: 31, fill: '#99b3be' })}
    ${rect({ x: 590, y: 802, width: 466, height: 16, rx: 8, fill: '#61afbd', stroke: 'none', strokeWidth: 0 })}
    ${rect({ x: 92, y: 980, width: 1256, height: 566, rx: 44, fill: 'url(#panel)', stroke: '#10282c' })}
    ${text({ x: 156, y: 1104, value: 'Mission remains hidden', size: 56, fill: '#f6f6f5', spacing: -1.4 })}
    ${text({ x: 156, y: 1190, value: 'Approve the entry, then Seek reveals the real-world target and starts the timer.', size: 34, fill: '#cfe6e4' })}
    ${pill(156, 1340, 390, 'Approve entry')}
    ${text({ x: 92, y: 1668, value: 'Launch-safe economics', size: 42, fill: '#f6f6f5' })}
    ${text({ x: 92, y: 1732, value: 'Small tiers keep the first mainnet pool controlled while validation is tuned.', size: 31, fill: '#99b3be' })}
    `
  ),
  '04-mission.svg': base(
    'Find the target in real life.',
    'LIVE FIELD MISSION',
    `
    ${rect({ x: 92, y: 528, width: 1256, height: 698, rx: 52, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 720, y: 650, value: '07:42', size: 128, fill: '#95d2e6', anchor: 'middle', spacing: -2 })}
    ${text({ x: 720, y: 710, value: 'TIME REMAINING', size: 26, fill: '#99b3be', family: utility, spacing: 1.4, anchor: 'middle' })}
    ${text({ x: 156, y: 850, value: 'Target', size: 32, fill: '#99b3be', family: utility, spacing: 1.1 })}
    ${text({ x: 156, y: 944, value: 'Find a public chess table', size: 64, fill: '#f6f6f5', spacing: -1.8 })}
    ${text({ x: 156, y: 1022, value: 'with pieces currently in play.', size: 48, fill: '#cfe6e4', spacing: -1 })}
    ${pill(156, 1088, 344, 'Open camera')}
    ${rect({ x: 92, y: 1350, width: 596, height: 408, rx: 34, fill: '#010101', stroke: '#373c3e' })}
    ${text({ x: 144, y: 1460, value: 'Rules', size: 40, fill: '#f6f6f5' })}
    ${text({ x: 144, y: 1538, value: 'Live camera only', size: 31, fill: '#99b3be' })}
    ${text({ x: 144, y: 1602, value: 'No screenshots', size: 31, fill: '#99b3be' })}
    ${text({ x: 144, y: 1666, value: 'Target must be visible', size: 31, fill: '#99b3be' })}
    ${rect({ x: 752, y: 1350, width: 596, height: 408, rx: 34, fill: '#010101', stroke: '#373c3e' })}
    ${text({ x: 804, y: 1460, value: 'Reward', size: 40, fill: '#f6f6f5' })}
    ${text({ x: 804, y: 1550, value: '250 SKR', size: 78, fill: '#61afbd', spacing: -1 })}
    `
  ),
  '05-validation.svg': base(
    'Capture proof, then validate.',
    'CAMERA PROOF',
    `
    ${rect({ x: 92, y: 520, width: 1256, height: 1220, rx: 58, fill: '#020101', stroke: '#373c3e', strokeWidth: 3 })}
    ${line({ x1: 242, y1: 700, x2: 1198, y2: 700, stroke: '#cfe6e4', width: 3, opacity: 0.35 })}
    ${line({ x1: 242, y1: 1560, x2: 1198, y2: 1560, stroke: '#cfe6e4', width: 3, opacity: 0.35 })}
    ${line({ x1: 242, y1: 700, x2: 242, y2: 1560, stroke: '#cfe6e4', width: 3, opacity: 0.35 })}
    ${line({ x1: 1198, y1: 700, x2: 1198, y2: 1560, stroke: '#cfe6e4', width: 3, opacity: 0.35 })}
    ${text({ x: 720, y: 1088, value: 'LIVE CAMERA', size: 42, fill: '#373c3e', family: utility, spacing: 1.3, anchor: 'middle' })}
    ${text({ x: 720, y: 1170, value: 'Chess table target in frame', size: 46, fill: '#cfe6e4', anchor: 'middle' })}
    <circle cx="720" cy="1618" r="78" fill="#f6f6f5"/>
    <circle cx="720" cy="1618" r="54" fill="#010101" stroke="#95d2e6" stroke-width="6"/>
    ${rect({ x: 92, y: 1848, width: 1256, height: 332, rx: 36, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 156, y: 1952, value: 'Validation in progress', size: 46, fill: '#f6f6f5' })}
    ${text({ x: 156, y: 2030, value: 'AI checks target, context, and live-capture signals before settlement.', size: 31, fill: '#99b3be' })}
    ${rect({ x: 156, y: 2092, width: 760, height: 16, rx: 8, fill: '#373c3e', stroke: 'none', strokeWidth: 0 })}
    ${rect({ x: 156, y: 2092, width: 520, height: 16, rx: 8, fill: '#61afbd', stroke: 'none', strokeWidth: 0 })}
    `
  ),
  '06-results.svg': base(
    'Settle and get paid.',
    'ON-CHAIN RESULT',
    `
    ${rect({ x: 120, y: 560, width: 1200, height: 1000, rx: 58, fill: 'url(#panel)', stroke: '#10282c' })}
    ${text({ x: 720, y: 760, value: 'COMPLETE', size: 118, fill: '#f6f6f5', anchor: 'middle', spacing: -2 })}
    ${text({ x: 720, y: 870, value: '+250 SKR', size: 118, fill: '#95d2e6', anchor: 'middle', spacing: -2 })}
    ${text({ x: 720, y: 942, value: 'Mission validated and settlement proposed.', size: 34, fill: '#cfe6e4', anchor: 'middle' })}
    ${rect({ x: 220, y: 1064, width: 1000, height: 210, rx: 34, fill: 'rgba(1,1,1,0.48)', stroke: '#373c3e' })}
    ${text({ x: 276, y: 1152, value: 'Target', size: 28, fill: '#99b3be', family: utility, spacing: 1.1 })}
    ${text({ x: 276, y: 1220, value: 'Public chess table with pieces in play', size: 38, fill: '#f6f6f5' })}
    ${pill(512, 1364, 416, 'Back to hunts')}
    ${rect({ x: 92, y: 1718, width: 596, height: 340, rx: 34, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 144, y: 1820, value: 'Total rewards', size: 34, fill: '#99b3be' })}
    ${text({ x: 144, y: 1910, value: '1,420 SKR', size: 76, fill: '#cfe6e4', spacing: -1 })}
    ${rect({ x: 752, y: 1718, width: 596, height: 340, rx: 34, fill: '#101618', stroke: '#10282c' })}
    ${text({ x: 804, y: 1820, value: 'Best streak', size: 34, fill: '#99b3be' })}
    ${text({ x: 804, y: 1910, value: '7 hunts', size: 76, fill: '#cfe6e4', spacing: -1 })}
    `
  ),
};

for (const [name, content] of Object.entries(screens)) {
  fs.writeFileSync(path.join(outDir, name), content);
}

console.log(`wrote ${Object.keys(screens).length} screenshot SVGs to ${outDir}`);
