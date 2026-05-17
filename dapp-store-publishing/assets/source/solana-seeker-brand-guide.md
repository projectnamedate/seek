# Solana Seeker Brand Extraction For Seek

Date: 2026-05-01
Source: `https://solanamobile.com/seeker`
Method: Playwright live-page screenshot plus DOM computed-style extraction.

Evidence files:

- `reference/seeker-brand-reference-full.png`
- `reference/seeker-brand-extract.json`

## Important Correction

Seek should align with the Solana Mobile Seeker visual system, not generic
Solana corporate branding. Do not lead with Solana purple/green. Do not add
yellow/gold reward accents to the core logo. Gold/yellow is not part of the
extracted Seeker page system and should be treated as out of bounds for the
identity unless the user explicitly asks for a separate promo/reward variant.

## Extracted Color Tokens

These tokens were present in the live page CSS variables and computed styles:

| Role | Hex | Notes |
|---|---:|---|
| Ink | `#010101` | Primary near-black page and component base. |
| Page black | `#020101` | Body background at extraction viewport. |
| Carbon | `#101618` | Raised panels/cards. |
| Deep teal | `#10282c` | Borders, dark gradient stops, depth. |
| Line gray | `#373c3e` | Secondary borders and inactive structure. |
| Frost | `#cfe6e4` | Primary CTA fill and high-contrast light accent. |
| Ice | `#95d2e6` | Large display headline accent. |
| Aqua | `#61afbd` | Brighter Seeker accent. |
| Mist | `#99b3be` | Secondary/support text. |
| Off-white | `#f6f6f5` | Main text on dark. |
| Warm off-white | `#faf9f4` | Hero display contrast word. |

Computed frequency leaders: `#f6f6f5`, `#cfe6e4`, `#010101`, `#99b3be`,
`#101618`, `#95d2e6`, `#10282c`, and `#61afbd`.

## Extracted Gradients

Use Seeker gradients as dark atmosphere, not loud crypto decoration.

```css
/* dApp Store 2.0 feature panel */
linear-gradient(
  rgb(16, 22, 24) 0%,
  rgb(11, 52, 70) 50.498%,
  rgb(15, 7, 4) 73.8334%,
  rgb(36, 123, 113) 100%
);

/* lower CTA panel */
linear-gradient(
  rgb(1, 1, 1) 0%,
  rgb(11, 52, 70) 60%,
  rgb(79, 171, 168) 100%
);

/* newsletter panel */
linear-gradient(
  rgb(150, 183, 193) 0%,
  rgb(167, 192, 200) 100%
);
```

Practical Seek gradient tokens:

- `seeker-panel-gradient`: `#101618 0% -> #0b3446 50% -> #0f0704 74% -> #247b71 100%`
- `seeker-cta-gradient`: `#010101 0% -> #0b3446 60% -> #4faba8 100%`
- `seeker-light-gradient`: `#96b7c1 0% -> #a7c0c8 100%`

## Typography

Extracted fonts:

- Display: `PP Mori Regular`, `PP Mori SemiBold`
- Utility/body: `Rational TW Text Book`
- Fallbacks: system sans / Inter / Arial

Observed headline behavior:

- Large display text is regular-weight, not heavy black.
- Hero H2 at desktop extracted around `104px`, `font-weight: 400`,
  `line-height: 100%`, `letter-spacing: -2.08px`.
- Secondary utility labels use uppercase, Rational TW Text Book, small sizes
  around `14px` to `18px`, and positive tracking around `0.48px` to `1.08px`.

Seek usage:

- Use the iris mark and simple wordmark; avoid heavy, loud gamer typography.
- Use large calm type with tight negative tracking for hero/site surfaces.
- Use small uppercase utility labels sparingly.

## Shape And Layout Language

Observed motifs:

- Dark full-bleed page, not card-heavy.
- Large product image blocks and phone mockups carry the experience.
- Rounded panels are substantial but restrained: feature panels around `30px`,
  newsletter panel around `16px`, pill buttons around `59px`.
- Border system uses deep teal and carbon rather than bright outlines.
- Spacing is generous with large vertical product sections and minimal copy.

Seek usage:

- Store/site graphics may use full-bleed dark gradients and device/product cues.
- App UI should stay operational and compact, but use the same ink/carbon/frost
  palette and restrained rounded surfaces.
- Logo should not include target brackets, gold route lines, or Solana
  parallelogram structures.

## Iris Logo Direction

The Seek mark should be a clean camera aperture:

- Symmetrical circular construction.
- Six evenly spaced curved iris separators arranged concentrically around a
  central aperture opening.
- Blades should read as a real shutter iris like a camera lens, not as a
  pinwheel, route map, scope, compass, or token.
- Center aperture must be stable, clean, and camera-iris shaped; avoid target
  dots and route-map centers.
- Primary palette: `#010101`, `#101618`, `#10282c`, `#373c3e`, `#cfe6e4`,
  `#95d2e6`, `#61afbd`, `#99b3be`, `#f6f6f5`.
- No yellow/gold in the core mark.
- No generic Solana purple/green in the core mark unless the user explicitly
  asks for a Solana co-branded variant.

## Logo Evaluation Checklist

- Reads as a camera shutter iris at 48 px.
- Outer silhouette remains circular and centered after Android adaptive-icon
  masking.
- Blade spacing is rotationally even.
- Central aperture is a circle, not a jagged hole.
- No decorative path, target brackets, or bonus-pool accent.
- Works in dark full-color, light full-color, and one-color monochrome.
- Feels like it belongs beside the Seeker site: dark, calm, premium,
  product-first.
