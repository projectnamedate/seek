# Seek Logo Geometry Audit

Date: 2026-05-01

## Audit Result

The prior Seek iris was too geometric and blade-like. It was symmetrical, but it
read more like a segmented target than a real camera aperture. The new direction
uses the user-supplied iris reference as a geometry study: six curved separator
paths, a thick outer lens ring, and a rounded aperture opening.

The reference image appears watermarked, so it should not be copied directly as
a final production trademark. The production files now use a Seek-owned vector
construction derived from the same camera-iris logic, with Seeker-aligned colors
and editable path geometry.

## Shared Geometry

- Center: `256,256`.
- Outer black lens disk: radius `236`.
- Seeker support ring: radius `220`.
- Inner lens boundary: radius `209`.
- Separator clipping circle: radius `205`.
- Separator count: `6`.
- Rotation step: `60deg`.
- Separator path id: `#seekTraceSeparator`.
- Opening path id: `#seekTraceOpening`.

## Corrections Made

- Added `iris-reference-trace.svg` as the black/white geometry study.
- Added `seek-iris-trace.svg` as the branded Seek version.
- Rebuilt the option sheet around the six-blade trace geometry.
- Replaced the eight-blade source mark in icon, lockup, banner, and feature
  graphic sources.
- Kept 48 px stress-test copies on the option sheet.
- Kept yellow/gold out of the core mark.

## Current Recommendation

Use option B, `SEEK TRACE`, as the production app icon direction. It is closer
to a real shutter iris, still uses Seeker-native color, and stays legible at
48 px. Keep option A as reference-only; do not ship it as a trademark without
rights clearance.

## Pass Criteria

- The mark must stay circular at every scale.
- The six separator curves must rotate from one center at exact `60deg` steps.
- No visible separator may pass outside the inner lens boundary.
- The center opening must be a clean aperture shape, not a target dot.
- No Solana, Solana Mobile, or Seeker marks may be repurposed as the Seek logo.
- No yellow/gold accent belongs in the core mark.
