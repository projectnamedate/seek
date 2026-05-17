# Seek Mission Location Taxonomy Draft

Date: 2026-05-17

Status: Approved by the user on 2026-05-17 before the 600-mission pool rewrite.

This draft replaces the ad hoc mission pool with a global, location-native
structure. It avoids USA-specific targets where possible and uses location
families that should exist across Solana Mobile markets: apartments, streets,
parks, transit, shops, campuses, offices, lobbies, cafes, gyms, libraries, and
service counters.

Difficulty rule:

- Tier 1 should be simple and location-native. Avoid color requirements, rare
  brands, exact counts, or overly specific conditions unless they are needed for
  safety or AI clarity.
- Tier 2 should be harder and more specific. Add observable constraints such as
  labels, signs, counts, condition, placement, or paired objects.
- Tier 3 should be almost impossible inside the timer, but still legal,
  privacy-safe, and plausible somewhere in the world. Use rare combinations,
  simultaneous cues, active states, posted labels, and multi-object validation.

## Mission Count Split

Outdoor comes first in the split.

| Tier | Total | Outdoor | Indoor |
|---|---:|---:|---:|
| Tier 1 | 200 | 140 | 60 |
| Tier 2 | 200 | 120 | 80 |
| Tier 3 | 200 | 100 | 100 |

## Location Quotas

Use 20 global location families: 10 outdoor and 10 indoor.

Each outdoor family contributes 14 Tier 1 missions, 12 Tier 2 missions, and 10
Tier 3 missions. Each indoor family contributes 6 Tier 1 missions, 8 Tier 2
missions, and 10 Tier 3 missions.

| Location Type | Families | Tier 1 Each | Tier 2 Each | Tier 3 Each | Total |
|---|---:|---:|---:|---:|---:|
| Outdoor | 10 | 14 | 12 | 10 | 360 |
| Indoor | 10 | 6 | 8 | 10 | 240 |
| Total | 20 | 200 | 200 | 200 | 600 |

## Outdoor Location Families

### 1. Residential Street Or Lane

- Tier 1 native tasks: numbered doorway, bicycle rack, parked scooter, planted
  curb strip, building entrance mat.
- Tier 2 native tasks: matching row of mailboxes or intercoms, delivery drop
  point, marked building service entrance, balcony with visible plant cluster.
- Tier 3 native tasks: two independent address markers in one frame, numbered
  entrance plus delivery locker, street-level entrance with camera and access
  panel visible.

### 2. Apartment Or Housing Complex Exterior

- Tier 1 native tasks: shared entrance, exterior stairwell, row of balconies,
  courtyard bench, exterior light.
- Tier 2 native tasks: building directory, parcel locker, gated pedestrian
  entrance, trash or recycling area with signage.
- Tier 3 native tasks: directory plus unit row, courtyard amenity with posted
  rule sign, exterior camera plus intercom in one frame.

### 3. Public Park Or Plaza

- Tier 1 native tasks: bench, planted bed, paved path, public bin, shade tree.
- Tier 2 native tasks: map board, drinking fountain, monument plaque, exercise
  station, public art.
- Tier 3 native tasks: map board plus route marker, active public fountain,
  statue with inscription, exercise station with instruction panel.

### 4. Playground Or Sports Court

- Tier 1 native tasks: swing, slide, court line, goal post, hoop.
- Tier 2 native tasks: painted boundary plus equipment, court sign, netted goal,
  marked free-throw line, exercise equipment.
- Tier 3 native tasks: scoreboard or rule sign plus court line, two sport types
  in one frame, equipment in use without requiring identifiable faces.

### 5. Transit Stop Or Station Exterior

- Tier 1 native tasks: stop sign, shelter roof, timetable board, platform edge,
  ticket machine.
- Tier 2 native tasks: route map, real-time arrival board, bike parking near
  transit, accessibility ramp, wayfinding sign.
- Tier 3 native tasks: route map plus platform marker, ticket machine plus fare
  gate, transit vehicle with route number visible.

### 6. Market Street Or Shopfront Row

- Tier 1 native tasks: awning, shop sign, produce crate, menu board, display
  window.
- Tier 2 native tasks: open service window, price board with multiple items,
  stacked crates, queue barrier, outdoor display rack.
- Tier 3 native tasks: three adjacent shopfronts, menu board plus payment sign,
  vendor stall with scale and labeled goods.

### 7. Parking Area Or Garage

- Tier 1 native tasks: marked parking bay, height clearance sign, pay machine,
  ramp, painted arrows.
- Tier 2 native tasks: electric charging bay, motorcycle parking zone, floor
  level marker, accessible parking symbol, security mirror.
- Tier 3 native tasks: level marker plus bay number, charging station with cable
  docked, pay machine plus tariff board.

### 8. Waterfront, Bridge, Canal, Or Promenade

- Tier 1 native tasks: railing, bridge span, water reflection, dock cleat, life
  ring cabinet.
- Tier 2 native tasks: bridge name plaque, ferry sign, mooring rope, flood mark,
  canal lock gate.
- Tier 3 native tasks: bridge plaque plus waterway visible, life ring plus
  emergency sign, ferry pier with route board.

### 9. Campus, Civic, Or Public Building Grounds

- Tier 1 native tasks: entrance steps, flagpole, notice board, public clock,
  bike racks.
- Tier 2 native tasks: campus map, building directory, public notice case,
  accessible entrance sign, courtyard sculpture.
- Tier 3 native tasks: directory plus named building entrance, public clock plus
  plaza marker, notice case with date and location marker.

### 10. Construction, Maintenance, Or Utility Area

- Tier 1 native tasks: traffic cone, temporary barrier, utility cover, work
  light, caution tape.
- Tier 2 native tasks: scaffolding, portable generator, roadwork sign, cable
  reel, temporary ramp.
- Tier 3 native tasks: permit board plus barrier, scaffolding tag plus platform,
  utility cabinet with warning label and numbered marker.

## Indoor Location Families

### 11. Apartment, Hotel, Or Residential Lobby

- Tier 1 native tasks: elevator call button, lobby plant, parcel shelf, room
  number sign, doormat.
- Tier 2 native tasks: directory board, intercom panel, mailroom lockers,
  reception bell, elevator inspection sign.
- Tier 3 native tasks: intercom plus directory, elevator panel plus floor sign,
  parcel area with posted rules.

### 12. Shared Hallway Or Corridor

- Tier 1 native tasks: exit sign, fire extinguisher, numbered door, hallway
  window, floor marker.
- Tier 2 native tasks: evacuation map, fire hose cabinet, security camera,
  cleaning cart, directional sign.
- Tier 3 native tasks: evacuation map plus exit sign, numbered door plus
  peephole and floor marker, fire cabinet with inspection tag visible.

### 13. Office Or Co-working Area

- Tier 1 native tasks: desk lamp, shared printer, meeting room door, whiteboard,
  rolling chair.
- Tier 2 native tasks: conference room booking screen, projector control panel,
  cable organizer, visitor badge station, shared phone booth.
- Tier 3 native tasks: booking screen plus room name, whiteboard with diagram
  and marker tray, printer station with posted instructions.

### 14. Retail, Grocery, Or Indoor Market

- Tier 1 native tasks: shopping basket stack, aisle sign, price tag, checkout
  belt, refrigerated case.
- Tier 2 native tasks: scale station, produce section label, self-checkout
  kiosk, promotional endcap, locked display case.
- Tier 3 native tasks: aisle sign plus shelf labels, scale station with produce,
  checkout lane light plus payment terminal.

### 15. Cafe, Restaurant, Or Food Court

- Tier 1 native tasks: menu board, condiment station, tray return, table number,
  coffee cup stack.
- Tier 2 native tasks: espresso machine, order pickup shelf, queue marker,
  pastry display, water station.
- Tier 3 native tasks: order screen plus pickup shelf, menu board with three
  categories, condiment station with recycling sign.

### 16. Transit Concourse Or Covered Platform

- Tier 1 native tasks: ticket gate, platform number, bench row, vending machine,
  overhead sign.
- Tier 2 native tasks: departure board, route map, fare machine, escalator sign,
  lost-and-found counter.
- Tier 3 native tasks: departure board plus platform number, fare gate plus
  ticket machine, route map with transfer marker.

### 17. Gym, Recreation, Or Community Center

- Tier 1 native tasks: locker row, dumbbell rack, water fountain, court floor
  line, yoga mat stack.
- Tier 2 native tasks: treadmill console, exercise instruction placard,
  equipment reservation sign, climbing wall grip, pool lane marker.
- Tier 3 native tasks: instruction placard plus matching equipment, scoreboard
  plus court line, locker row with posted rule sign.

### 18. Library, Study Room, Or Learning Space

- Tier 1 native tasks: bookshelf row, study carrel, book return slot, reading
  lamp, catalog terminal.
- Tier 2 native tasks: section sign, checkout kiosk, reserved study room sign,
  magazine rack, printer station.
- Tier 3 native tasks: section sign plus shelf labels, checkout kiosk plus book
  return, study room sign plus booking panel.

### 19. Clinic, Pharmacy, Or Service Waiting Area

- Tier 1 native tasks: waiting chairs, queue number display, service counter,
  brochure rack, sanitizer station.
- Tier 2 native tasks: check-in kiosk, privacy screen, pharmacy pickup sign,
  ticket dispenser, posted hours sign.
- Tier 3 native tasks: queue display plus ticket dispenser, kiosk plus service
  counter, pharmacy sign plus pickup shelf. Do not require patient documents,
  medical labels, or identifiable private information.

### 20. Workshop, Maker Space, Or Repair Counter

- Tier 1 native tasks: tool wall, workbench, safety glasses station, parts bin,
  pegboard.
- Tier 2 native tasks: labeled tool cabinet, soldering station, clamp setup,
  repair ticket holder, measuring mat.
- Tier 3 native tasks: tool wall plus safety sign, soldering station with fume
  extractor, repair counter with numbered ticket holder.

## Globalization Rules

- Avoid country-specific objects unless the wording accepts local equivalents.
  Use "postal box" instead of a national postal brand, "speed sign" instead of
  MPH-only wording, and "national flag" only when the mission does not require a
  specific country.
- Avoid brand-specific tasks unless the brand is global enough and there is a
  non-brand equivalent in the same tier.
- Avoid private-home-only tasks that let one apartment farm repeated wins.
  Apartment-friendly missions should usually require common spaces, lobbies,
  hallways, posted signs, intercoms, or shared amenities.
- Avoid tasks that require photographing sensitive documents, children,
  patients, license plates as the primary target, or private security details.
- Prefer multi-cue validation: object plus location cue, sign, label, count,
  condition, or relationship to another object.

## Approval Gate

The user approved this taxonomy and split on 2026-05-17. The production mission
pool should stay aligned with this document unless the user approves a new
taxonomy.
