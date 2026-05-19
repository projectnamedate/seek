# Mission Globalization Audit - 2026-05-19

## Scope

Audited the full 600-mission production pool after the `500 / 1000 / 2000 SKR`
tier update. Source of truth files:

- `tasks/scripts/generate-mission-final-list-draft.mjs`
- `tasks/mission-final-list-draft.md`
- `tasks/mission-list-by-tier.md`
- `backend/src/data/missions.ts`

## Standard

Missions should be legal, privacy-safe, and plausible outside the United
States, including dense Asian and Indian cities. A mission may still be hard or
locally inconvenient, especially at Tier 3, but it should not depend on a
US-only brand, postal object, street fixture, payment phrase, or civic system.

## Changes Made

- Replaced postal/mail targets with doorbell, buzzer, parcel shelf, parcel
  locker, or delivery-drop targets.
- Replaced curb/sidewalk wording with pedestrian path, raised edge, street-edge,
  or ramped crossing-edge wording.
- Replaced porch-specific wording with entry-light and doorway wording.
- Replaced drinking-fountain-only targets with broader public-water-point
  targets.
- Replaced picnic-table and lawn-only targets with public-seating-table and
  open-park-area wording.
- Replaced parking pay-machine and garage-or-lot wording with parking payment
  terminal, tariff board, and parking-area wording.
- Replaced rideshare wording with taxi or hired-car waiting-area wording.
- Replaced transit stop-sign wording with route-marker wording.

## Result

The pool still has 600 unique missions and preserves the approved tier/location
shape:

| Tier | Total | Outdoor | Indoor |
|---|---:|---:|---:|
| 1 | 200 | 140 | 60 |
| 2 | 200 | 120 | 80 |
| 3 | 200 | 100 | 100 |

The backend mission test now rejects USA-centric and country-specific terms
before future exports, including USPS, postal/mail targets, ZIP code, porch,
curb, sidewalk, driveway, cul-de-sac, parking lot, DMV/license plate, pay phone,
fire hydrant, school bus, bodega, MetroCard, and US currency terms.
