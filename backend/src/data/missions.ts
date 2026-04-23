import { Mission, Tier } from '../types';

// Mission pool — rewritten 2026-04-23 for the $1,000 launch house vault.
// Every tier-1 mission requires color/condition/context specificity (not just
// "find a tree"). ~20% of each tier is intentionally near-impossible inside
// the tier timer; the rest are hard-but-doable. Combined with the bumped AI
// thresholds (0.88 / 0.92 / 0.95) this targets an 8-12% realistic player
// win rate, well below the ~26% house-pool break-even. See
// memory/project_economic_model.md for the math + monitoring plan.

const OUTDOOR_RATIO: Record<Tier, number> = { 1: 0.70, 2: 0.60, 3: 0.50 };

const tier1Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (70) ===
  { description: 'Find a red fire hydrant with no chain attached to the cap', keywords: ['fire hydrant', 'red', 'hydrant', 'no chain'], location: 'outdoor' },
  { description: 'Find a parked blue sedan (4-door, not SUV)', keywords: ['blue sedan', 'parked', '4-door', 'car'], location: 'outdoor' },
  { description: 'Find a small dog on a leash being held by a person', keywords: ['small dog', 'leash', 'walked', 'pet'], location: 'outdoor' },
  { description: 'Find a stop sign at a four-way intersection (multiple visible signs)', keywords: ['stop sign', 'intersection', 'four-way', 'multiple signs'], location: 'outdoor' },
  { description: 'Find a tree taller than two stories of a building', keywords: ['tall tree', 'two stories', 'large tree', 'mature'], location: 'outdoor' },
  { description: 'Find a bicycle locked to a bike rack with a U-lock or chain', keywords: ['bicycle', 'locked', 'bike rack', 'chain lock'], location: 'outdoor' },
  { description: 'Find an overflowing trash can (visible spillover)', keywords: ['trash can', 'overflowing', 'garbage', 'full'], location: 'outdoor' },
  { description: 'Find a streetlight illuminated against a dark or dusk sky', keywords: ['streetlight', 'illuminated', 'lit', 'dusk'], location: 'outdoor' },
  { description: 'Find a wooden park bench (not metal)', keywords: ['wooden bench', 'park bench', 'wood', 'slats'], location: 'outdoor' },
  { description: 'Find a USPS mailbox with the red flag in the up position', keywords: ['mailbox', 'USPS', 'flag up', 'red flag'], location: 'outdoor' },
  { description: 'Find a black bird perched on a wire or cable', keywords: ['black bird', 'wire', 'perched', 'crow'], location: 'outdoor' },
  { description: 'Find a yellow flower with at least five visible petals', keywords: ['yellow flower', 'petals', 'five petals', 'bloom'], location: 'outdoor' },
  { description: 'Find a cat outdoors (not in a window or doorway)', keywords: ['cat', 'outdoor', 'outside', 'feline'], location: 'outdoor' },
  { description: 'Find a white SUV (not a sedan, hatchback, or truck)', keywords: ['white SUV', 'SUV', 'white', 'crossover'], location: 'outdoor' },
  { description: 'Find a chain-link fence with at least one visible gate', keywords: ['chain-link fence', 'gate', 'fence', 'metal'], location: 'outdoor' },
  { description: 'Find an active parking meter showing remaining time on the display', keywords: ['parking meter', 'time remaining', 'display', 'paid'], location: 'outdoor' },
  { description: 'Find a freshly painted crosswalk (white lines, no fading or chipping)', keywords: ['crosswalk', 'fresh paint', 'white lines', 'pedestrian'], location: 'outdoor' },
  { description: 'Find a covered bus stop with both a roof and a bench', keywords: ['bus stop', 'covered', 'shelter', 'bench', 'roof'], location: 'outdoor' },
  { description: 'Find a sidewalk with visible cracks or buckling', keywords: ['sidewalk', 'cracks', 'cracked', 'damaged'], location: 'outdoor' },
  { description: 'Find a single isolated cloud against a blue sky', keywords: ['cloud', 'isolated', 'blue sky', 'single'], location: 'outdoor' },
  { description: 'Find a moss-covered rock or stone', keywords: ['moss', 'rock', 'covered', 'green'], location: 'outdoor' },
  { description: 'Find a deep puddle reflecting the sky or buildings', keywords: ['puddle', 'reflection', 'water', 'reflective'], location: 'outdoor' },
  { description: 'Find a parked motorcycle with a visible license plate', keywords: ['motorcycle', 'parked', 'license plate', 'bike'], location: 'outdoor' },
  { description: 'Find a traffic light currently displaying red', keywords: ['traffic light', 'red light', 'stoplight', 'red signal'], location: 'outdoor' },
  { description: 'Find a speed limit sign showing 25 or 30 MPH', keywords: ['speed limit', '25 mph', '30 mph', 'sign'], location: 'outdoor' },
  { description: 'Find an American flag flying on a pole (not a wall mount)', keywords: ['American flag', 'flag pole', 'stars and stripes', 'flying'], location: 'outdoor' },
  { description: 'Find a basketball hoop with a chain net (not nylon)', keywords: ['basketball hoop', 'chain net', 'metal net', 'hoop'], location: 'outdoor' },
  { description: 'Find a swing currently in motion (mid-arc, not still)', keywords: ['swing', 'motion', 'swinging', 'playground'], location: 'outdoor' },
  { description: 'Find a manhole cover with visible text or sewer markings', keywords: ['manhole', 'cover', 'text', 'sewer'], location: 'outdoor' },
  { description: 'Find a fire escape with at least three vertical levels visible', keywords: ['fire escape', 'levels', 'three stories', 'metal'], location: 'outdoor' },
  { description: 'Find a brick wall with graffiti, paste-ups, or stickers on it', keywords: ['brick wall', 'graffiti', 'stickers', 'street art'], location: 'outdoor' },
  { description: 'Find a potted plant with red flowers in active bloom', keywords: ['potted plant', 'red flowers', 'bloom', 'planter'], location: 'outdoor' },
  { description: 'Find a wooden picnic table with attached benches', keywords: ['picnic table', 'wooden', 'attached benches', 'park'], location: 'outdoor' },
  { description: 'Find a working water fountain with water flowing', keywords: ['water fountain', 'flowing', 'drinking fountain', 'active'], location: 'outdoor' },
  { description: 'Find a green commercial dumpster (not blue or brown)', keywords: ['green dumpster', 'commercial', 'trash container', 'green'], location: 'outdoor' },
  { description: 'Find a newspaper stand with at least one paper visible inside', keywords: ['newspaper stand', 'paper inside', 'news', 'box'], location: 'outdoor' },
  { description: 'Find an orange traffic cone with reflective stripes', keywords: ['traffic cone', 'orange', 'reflective stripes', 'cone'], location: 'outdoor' },
  { description: 'Find an abandoned shopping cart away from any store', keywords: ['shopping cart', 'abandoned', 'cart', 'stranded'], location: 'outdoor' },
  { description: 'Find a blue handicap parking sign mounted on a pole', keywords: ['handicap sign', 'blue', 'wheelchair', 'parking'], location: 'outdoor' },
  { description: 'Find a yield sign with visible rust, bent edges, or damage', keywords: ['yield sign', 'rust', 'damaged', 'bent'], location: 'outdoor' },
  { description: 'Find a "No Parking" sign that includes a tow-warning label', keywords: ['no parking', 'tow warning', 'tow-away', 'sign'], location: 'outdoor' },
  { description: 'Find a "One Way" sign with the arrow pointing left', keywords: ['one way', 'arrow left', 'direction', 'sign'], location: 'outdoor' },
  { description: 'Find a city bus in motion with wheels turning', keywords: ['city bus', 'motion', 'moving', 'transit'], location: 'outdoor' },
  { description: 'Find a yellow taxi cab (clearly yellow, not white or black)', keywords: ['yellow taxi', 'taxi cab', 'cab', 'yellow'], location: 'outdoor' },
  { description: 'Find a delivery truck with a visible company logo on the side', keywords: ['delivery truck', 'company logo', 'branded', 'commercial'], location: 'outdoor' },
  { description: 'Find a white work van with no windows on the side panels', keywords: ['work van', 'white van', 'no windows', 'commercial van'], location: 'outdoor' },
  { description: 'Find a convertible with the top fully retracted (not just open)', keywords: ['convertible', 'top down', 'retracted', 'open top'], location: 'outdoor' },
  { description: 'Find a black SUV (not gray, dark blue, or charcoal)', keywords: ['black SUV', 'SUV', 'black', 'dark vehicle'], location: 'outdoor' },
  { description: 'Find a palm tree (not just a tropical-looking plant)', keywords: ['palm tree', 'palm fronds', 'tropical', 'fronds'], location: 'outdoor' },
  { description: 'Find a pine tree with visible pinecones still attached to branches', keywords: ['pine tree', 'pinecones', 'cones attached', 'evergreen'], location: 'outdoor' },
  { description: 'Find a hedge trimmed into a defined geometric shape (cube, sphere)', keywords: ['hedge', 'trimmed', 'geometric', 'topiary'], location: 'outdoor' },
  { description: 'Find ivy climbing the side of a building (not a fence)', keywords: ['ivy', 'climbing', 'building wall', 'vines'], location: 'outdoor' },
  { description: 'Find a bronze or stone statue depicting a human figure', keywords: ['statue', 'bronze', 'stone', 'human figure'], location: 'outdoor' },
  { description: 'Find a fountain with water actively spraying upward', keywords: ['fountain', 'spraying', 'water active', 'jet'], location: 'outdoor' },
  { description: 'Find a vegetable garden with at least three different plant types', keywords: ['vegetable garden', 'plants', 'multiple varieties', 'crops'], location: 'outdoor' },
  { description: 'Find a freshly mowed lawn with visible mower stripe pattern', keywords: ['mowed lawn', 'stripes', 'fresh cut', 'lawn'], location: 'outdoor' },
  { description: 'Find a parking lot with at least ten cars visible in frame', keywords: ['parking lot', 'ten cars', 'many vehicles', 'lot'], location: 'outdoor' },
  { description: 'Find a closed garage door (single or double, fully shut)', keywords: ['garage door', 'closed', 'shut', 'garage'], location: 'outdoor' },
  { description: 'Find a paved driveway with a vehicle parked on it', keywords: ['driveway', 'vehicle parked', 'paved', 'home'], location: 'outdoor' },
  { description: 'Find a stone or concrete bridge spanning over water', keywords: ['bridge', 'stone', 'concrete', 'over water'], location: 'outdoor' },
  { description: 'Find a bird actively eating from a bird feeder', keywords: ['bird feeder', 'bird eating', 'feeding', 'bird present'], location: 'outdoor' },
  { description: 'Find a wooden birdhouse mounted on a pole or tree trunk', keywords: ['birdhouse', 'wooden', 'mounted', 'birdbox'], location: 'outdoor' },
  { description: 'Find a garden gnome (any size, any color, must be a gnome)', keywords: ['garden gnome', 'gnome', 'garden ornament', 'figurine'], location: 'outdoor' },
  { description: 'Find a residential house number ending in the digit 7', keywords: ['house number', 'ends in 7', 'address', 'door number'], location: 'outdoor' },
  { description: 'Find an illuminated porch light during daytime', keywords: ['porch light', 'illuminated', 'lit during day', 'on'], location: 'outdoor' },
  { description: 'Find an empty rocking chair on a porch (no person sitting)', keywords: ['rocking chair', 'empty', 'porch', 'unoccupied'], location: 'outdoor' },
  { description: 'Find a hammock strung between two trees or anchor points', keywords: ['hammock', 'strung', 'between trees', 'anchor'], location: 'outdoor' },
  { description: 'Find an outdoor charcoal grill (not a propane gas grill)', keywords: ['charcoal grill', 'BBQ', 'outdoor grill', 'charcoal'], location: 'outdoor' },
  { description: 'Find a closed/folded patio umbrella (collapsed, not open)', keywords: ['patio umbrella', 'closed', 'folded', 'collapsed'], location: 'outdoor' },
  { description: 'Find an above-ground swimming pool (not in-ground)', keywords: ['pool', 'above-ground', 'swimming pool', 'aboveground'], location: 'outdoor' },

  // === INDOOR (30) ===
  { description: 'Find a window with both sky and clouds visible through it', keywords: ['window', 'sky view', 'clouds', 'glass'], location: 'indoor' },
  { description: 'Find a closed door with visible door hinges', keywords: ['closed door', 'hinges visible', 'door', 'shut'], location: 'indoor' },
  { description: 'Find a spiral staircase (not standard straight stairs)', keywords: ['spiral staircase', 'spiral', 'curved stairs', 'helical'], location: 'indoor' },
  { description: 'Find a fire alarm pull station (red box with handle, NOT a smoke detector)', keywords: ['fire alarm', 'pull station', 'red box', 'manual'], location: 'indoor' },
  { description: 'Find a vending machine with at least three sold-out rows', keywords: ['vending machine', 'sold out', 'empty rows', 'machine'], location: 'indoor' },
  { description: 'Find an ATM with the screen actively visible (not in standby)', keywords: ['ATM', 'screen visible', 'active', 'cash machine'], location: 'indoor' },
  { description: 'Find a fire extinguisher with a clearly visible inspection tag', keywords: ['fire extinguisher', 'inspection tag', 'tag visible', 'extinguisher'], location: 'indoor' },
  { description: 'Find a security camera with a visible LED indicator light', keywords: ['security camera', 'LED light', 'indicator', 'surveillance'], location: 'indoor' },
  { description: 'Find a doormat with the word "Welcome" printed on it', keywords: ['welcome mat', 'doormat', 'welcome text', 'mat'], location: 'indoor' },
  { description: 'Find a video doorbell (Ring, Nest Hello, or similar with camera)', keywords: ['video doorbell', 'Ring', 'Nest', 'smart doorbell'], location: 'indoor' },
  { description: 'Find an empty coffee mug on a table or desk', keywords: ['empty mug', 'coffee mug', 'cup empty', 'mug'], location: 'indoor' },
  { description: 'Find a bookshelf with at least twenty books visible', keywords: ['bookshelf', 'twenty books', 'many books', 'library'], location: 'indoor' },
  { description: 'Find a TV remote with at least thirty buttons', keywords: ['TV remote', 'many buttons', 'remote control', 'thirty buttons'], location: 'indoor' },
  { description: 'Find a microwave currently displaying the time on its panel', keywords: ['microwave', 'time display', 'clock', 'lit display'], location: 'indoor' },
  { description: 'Find a leather couch (not fabric, not microfiber)', keywords: ['leather couch', 'leather sofa', 'leather', 'couch'], location: 'indoor' },
  { description: 'Find an analog wall clock with both hour and minute hands visible', keywords: ['analog clock', 'wall clock', 'hands', 'analog'], location: 'indoor' },
  { description: 'Find a full-length mirror taller than it is wide', keywords: ['full-length mirror', 'tall mirror', 'standing mirror', 'mirror'], location: 'indoor' },
  { description: 'Find a dimmer-style light switch (slider, knob, or smart panel)', keywords: ['dimmer switch', 'dimmer', 'slider', 'light dimmer'], location: 'indoor' },
  { description: 'Find a ceiling fan with the blades currently spinning', keywords: ['ceiling fan', 'spinning', 'rotating', 'fan on'], location: 'indoor' },
  { description: 'Find a toaster with bread slices currently inside the slots', keywords: ['toaster', 'bread inside', 'toasting', 'bread slots'], location: 'indoor' },
  { description: 'Find a stainless steel refrigerator (not white or black)', keywords: ['stainless steel', 'refrigerator', 'fridge', 'silver'], location: 'indoor' },
  { description: 'Find a desk lamp that is currently turned on', keywords: ['desk lamp', 'lamp on', 'lit', 'task lamp'], location: 'indoor' },
  { description: 'Find a decorative throw pillow with a visible pattern (not solid)', keywords: ['throw pillow', 'patterned', 'cushion', 'decorative'], location: 'indoor' },
  { description: 'Find a Persian or Oriental-style patterned area rug', keywords: ['Persian rug', 'Oriental rug', 'patterned rug', 'ornate'], location: 'indoor' },
  { description: 'Find a wooden picture frame containing an actual photograph', keywords: ['picture frame', 'wooden frame', 'photo inside', 'photograph'], location: 'indoor' },
  { description: 'Find a houseplant in a terracotta (clay) pot, not plastic', keywords: ['houseplant', 'terracotta pot', 'clay pot', 'plant'], location: 'indoor' },
  { description: 'Find a power outlet with three or more devices currently plugged in', keywords: ['power outlet', 'multiple plugs', 'plugs in use', 'crowded outlet'], location: 'indoor' },
  { description: 'Find a black plastic trash bag that is filled (not empty)', keywords: ['trash bag', 'filled', 'black bag', 'full garbage bag'], location: 'indoor' },
  { description: 'Find a coat rack or hooks with at least three coats hanging', keywords: ['coat rack', 'three coats', 'hanging coats', 'coats'], location: 'indoor' },
  { description: 'Find a smoke detector mounted on a ceiling (not a wall)', keywords: ['smoke detector', 'ceiling mounted', 'detector', 'overhead'], location: 'indoor' },
];

const tier2Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (60) ===
  { description: 'Find a Starbucks cup with the green siren logo clearly visible', keywords: ['Starbucks cup', 'green siren', 'logo visible', 'coffee'], location: 'outdoor' },
  { description: 'Find a golden retriever with the breed-specific feathered tail visible', keywords: ['golden retriever', 'feathered tail', 'golden coat', 'retriever'], location: 'outdoor' },
  { description: 'Find a Tesla with the T logo on the front grille or hood visible', keywords: ['Tesla', 'T logo', 'electric car', 'Tesla badge'], location: 'outdoor' },
  { description: 'Find a pizza delivery box with restaurant branding visible', keywords: ['pizza box', 'branded', 'delivery box', 'restaurant logo'], location: 'outdoor' },
  { description: 'Find a single red rose in bloom (not in a bouquet or arrangement)', keywords: ['red rose', 'single rose', 'bloom', 'one rose'], location: 'outdoor' },
  { description: 'Find a German Shepherd with both ears upright and pointed', keywords: ['German Shepherd', 'pointed ears', 'shepherd', 'erect ears'], location: 'outdoor' },
  { description: 'Find a Nike swoosh logo on a piece of athletic apparel or shoe', keywords: ['Nike swoosh', 'Nike logo', 'athletic wear', 'swoosh'], location: 'outdoor' },
  { description: 'Find a McDonald\'s golden arches storefront sign (not a wrapper)', keywords: ['McDonalds', 'golden arches', 'storefront', 'M sign'], location: 'outdoor' },
  { description: 'Find a Coca-Cola can or bottle with the logo unobstructed', keywords: ['Coca-Cola', 'Coke can', 'red logo', 'cola'], location: 'outdoor' },
  { description: 'Find a FedEx delivery truck (purple and orange branding)', keywords: ['FedEx truck', 'FedEx', 'purple orange', 'delivery'], location: 'outdoor' },
  { description: 'Find a UPS delivery truck (brown branding, large rear door)', keywords: ['UPS truck', 'brown truck', 'United Parcel', 'delivery'], location: 'outdoor' },
  { description: 'Find an Amazon package with the smile-arrow logo visible', keywords: ['Amazon package', 'smile arrow', 'box', 'Amazon logo'], location: 'outdoor' },
  { description: 'Find a Toyota Prius (hybrid hatchback shape)', keywords: ['Toyota Prius', 'Prius', 'hybrid', 'hatchback'], location: 'outdoor' },
  { description: 'Find a Jeep Wrangler with removable doors or roof off', keywords: ['Jeep Wrangler', 'doors off', 'roof off', 'Wrangler'], location: 'outdoor' },
  { description: 'Find a Ford F-150 pickup truck (not Ranger, not other brand)', keywords: ['Ford F-150', 'F-150', 'pickup', 'Ford truck'], location: 'outdoor' },
  { description: 'Find a Mini Cooper (compact 2-door, distinctive shape)', keywords: ['Mini Cooper', 'Mini', 'compact', 'small car'], location: 'outdoor' },
  { description: 'Find a Ford Mustang (muscle car body style)', keywords: ['Ford Mustang', 'Mustang', 'muscle car', 'pony car'], location: 'outdoor' },
  { description: 'Find a Subaru with visible AWD or model badge', keywords: ['Subaru', 'AWD badge', 'Outback', 'Forester'], location: 'outdoor' },
  { description: 'Find a Honda Civic (sedan or hatchback, with badge visible)', keywords: ['Honda Civic', 'Civic', 'Honda', 'sedan'], location: 'outdoor' },
  { description: 'Find a Labrador Retriever (any color: black, yellow, or chocolate)', keywords: ['Labrador', 'Lab', 'retriever', 'lab dog'], location: 'outdoor' },
  { description: 'Find a Standard or Toy Poodle with curly coat visible', keywords: ['Poodle', 'curly coat', 'standard poodle', 'toy poodle'], location: 'outdoor' },
  { description: 'Find an English Bulldog with characteristic wrinkled face', keywords: ['English Bulldog', 'bulldog', 'wrinkled', 'flat face'], location: 'outdoor' },
  { description: 'Find a Siberian Husky with blue eyes or distinctive markings', keywords: ['Husky', 'Siberian Husky', 'blue eyes', 'sled dog'], location: 'outdoor' },
  { description: 'Find a Welsh Corgi (short legs, fox-like face)', keywords: ['Corgi', 'Welsh Corgi', 'short legs', 'pembroke'], location: 'outdoor' },
  { description: 'Find a sunflower at least five feet tall', keywords: ['sunflower', 'tall sunflower', 'five feet', 'large flower'], location: 'outdoor' },
  { description: 'Find a fire truck with ladder visible (not just an engine)', keywords: ['fire truck', 'ladder truck', 'fire ladder', 'aerial'], location: 'outdoor' },
  { description: 'Find a police car with the light bar visible on the roof', keywords: ['police car', 'light bar', 'cop car', 'cruiser'], location: 'outdoor' },
  { description: 'Find an ambulance with red cross or "AMBULANCE" text visible', keywords: ['ambulance', 'red cross', 'AMBULANCE text', 'emergency'], location: 'outdoor' },
  { description: 'Find a yellow school bus (not a tour or transit bus)', keywords: ['school bus', 'yellow bus', 'school', 'student bus'], location: 'outdoor' },
  { description: 'Find an ice cream truck with the menu or speakers visible', keywords: ['ice cream truck', 'menu visible', 'truck', 'ice cream'], location: 'outdoor' },
  { description: 'Find a food truck with a service window currently open', keywords: ['food truck', 'service window open', 'street food', 'truck'], location: 'outdoor' },
  { description: 'Find a cement mixer truck with the rotating drum visible', keywords: ['cement mixer', 'rotating drum', 'concrete truck', 'mixer'], location: 'outdoor' },
  { description: 'Find a construction crane with the arm/boom extended', keywords: ['crane', 'construction crane', 'boom extended', 'tower crane'], location: 'outdoor' },
  { description: 'Find a yellow construction bulldozer or excavator', keywords: ['bulldozer', 'excavator', 'yellow', 'construction equipment'], location: 'outdoor' },
  { description: 'Find a Bird, Lime, or Lyft branded electric scooter', keywords: ['Bird scooter', 'Lime scooter', 'Lyft scooter', 'shared scooter'], location: 'outdoor' },
  { description: 'Find a mountain bike with knobby off-road tires', keywords: ['mountain bike', 'knobby tires', 'MTB', 'off-road'], location: 'outdoor' },
  { description: 'Find a baby stroller with the canopy raised over a child', keywords: ['baby stroller', 'canopy raised', 'pram', 'stroller'], location: 'outdoor' },
  { description: 'Find a kayak (single or tandem, paddle visible)', keywords: ['kayak', 'paddle', 'small boat', 'paddling'], location: 'outdoor' },
  { description: 'Find a surfboard standing on end or being carried by a person', keywords: ['surfboard', 'carried', 'standing surfboard', 'surf'], location: 'outdoor' },
  { description: 'Find a sailboat with the sails currently raised', keywords: ['sailboat', 'sails raised', 'sailing', 'sail boat'], location: 'outdoor' },
  { description: 'Find a fully assembled camping tent (poles up, fabric tight)', keywords: ['camping tent', 'assembled', 'pitched tent', 'tent'], location: 'outdoor' },
  { description: 'Find hiking boots actively being worn outdoors (on feet)', keywords: ['hiking boots', 'worn', 'on feet', 'outdoor boots'], location: 'outdoor' },
  { description: 'Find a drone in flight, off the ground', keywords: ['drone', 'in flight', 'flying', 'UAV airborne'], location: 'outdoor' },
  { description: 'Find a kite airborne in the sky with string visible', keywords: ['kite', 'airborne', 'flying kite', 'string visible'], location: 'outdoor' },
  { description: 'Find a frisbee in mid-flight (not on the ground or in hand)', keywords: ['frisbee', 'mid-flight', 'flying disc', 'airborne'], location: 'outdoor' },
  { description: 'Find an American football (oval shape, laced — NOT a soccer ball)', keywords: ['American football', 'oval ball', 'laced', 'NFL'], location: 'outdoor' },
  { description: 'Find a soccer ball with the classic black-and-white pentagon pattern', keywords: ['soccer ball', 'pentagon pattern', 'football', 'FIFA'], location: 'outdoor' },
  { description: 'Find a basketball (orange with visible grip lines, not a soccer ball)', keywords: ['basketball', 'orange ball', 'grip lines', 'NBA'], location: 'outdoor' },
  { description: 'Find a baseball with visible red stitching', keywords: ['baseball', 'red stitching', 'white ball', 'MLB'], location: 'outdoor' },
  { description: 'Find a golf club with the head clearly visible', keywords: ['golf club', 'club head', 'golf', 'iron driver'], location: 'outdoor' },
  { description: 'Find a wooden baseball bat (not aluminum)', keywords: ['wooden bat', 'baseball bat', 'wood bat', 'lumber'], location: 'outdoor' },
  { description: 'Find a jump rope currently being used (rope mid-rotation)', keywords: ['jump rope', 'in use', 'jumping rope', 'mid-jump'], location: 'outdoor' },
  { description: 'Find a fully inflated trampoline with safety netting around it', keywords: ['trampoline', 'safety net', 'inflated', 'jumping trampoline'], location: 'outdoor' },
  { description: 'Find a tulip in full bloom (cup-shaped petals open)', keywords: ['tulip', 'in bloom', 'open petals', 'spring flower'], location: 'outdoor' },
  { description: 'Find a daisy with white petals and a yellow center', keywords: ['daisy', 'white petals', 'yellow center', 'flower'], location: 'outdoor' },
  { description: 'Find a cactus with visible spines (not a succulent)', keywords: ['cactus', 'spines', 'desert plant', 'thorns'], location: 'outdoor' },
  { description: 'Find a hula hoop currently being spun on someone\'s body', keywords: ['hula hoop', 'spinning', 'hooping', 'mid-spin'], location: 'outdoor' },
  { description: 'Find a Vespa or vintage-style scooter', keywords: ['Vespa', 'vintage scooter', 'Italian scooter', 'moped'], location: 'outdoor' },
  { description: 'Find a person walking three or more dogs simultaneously', keywords: ['dog walker', 'three dogs', 'multiple dogs', 'pack walking'], location: 'outdoor' },
  { description: 'Find a real estate "For Sale" sign on a residential property', keywords: ['for sale sign', 'real estate', 'house for sale', 'realtor'], location: 'outdoor' },

  // === INDOOR (40) ===
  { description: 'Find a yoga mat unrolled and laid flat on a floor', keywords: ['yoga mat', 'unrolled', 'flat', 'exercise mat'], location: 'indoor' },
  { description: 'Find a pair of dumbbells (must show two, not one)', keywords: ['dumbbells', 'pair', 'two weights', 'free weights'], location: 'indoor' },
  { description: 'Find a backpack with both shoulder straps clearly visible', keywords: ['backpack', 'both straps', 'two straps', 'rucksack'], location: 'indoor' },
  { description: 'Find a pair of boxing gloves (must show both)', keywords: ['boxing gloves', 'pair gloves', 'two gloves', 'boxing'], location: 'indoor' },
  { description: 'Find a telescope mounted on a tripod', keywords: ['telescope', 'tripod', 'mounted', 'astronomy'], location: 'indoor' },
  { description: 'Find a PlayStation DualSense controller (the PS5 white-and-black design)', keywords: ['DualSense', 'PS5 controller', 'PlayStation', 'white controller'], location: 'indoor' },
  { description: 'Find a Keurig single-cup coffee maker (K-cup pod brewer)', keywords: ['Keurig', 'K-cup brewer', 'pod coffee', 'single serve'], location: 'indoor' },
  { description: 'Find an assembled LEGO build (not loose bricks in a box)', keywords: ['LEGO build', 'assembled', 'completed model', 'bricks'], location: 'indoor' },
  { description: 'Find an Apple logo on a device (laptop lid, phone back, watch)', keywords: ['Apple logo', 'apple', 'iPhone', 'MacBook'], location: 'indoor' },
  { description: 'Find a KitchenAid stand mixer (distinctive bowl-lift design)', keywords: ['KitchenAid', 'stand mixer', 'bowl-lift', 'kitchen mixer'], location: 'indoor' },
  { description: 'Find a Dyson vacuum (any cordless or canister model with logo)', keywords: ['Dyson', 'vacuum cleaner', 'cordless', 'Dyson logo'], location: 'indoor' },
  { description: 'Find a Nintendo Switch console (full-size, not Switch Lite)', keywords: ['Nintendo Switch', 'Switch console', 'Joy-Cons', 'Nintendo'], location: 'indoor' },
  { description: 'Find an Xbox controller (Series X or Xbox One generation)', keywords: ['Xbox controller', 'Microsoft', 'gamepad', 'Xbox'], location: 'indoor' },
  { description: 'Find a Roomba robot vacuum on its charging dock', keywords: ['Roomba', 'docked', 'robot vacuum', 'charging'], location: 'indoor' },
  { description: 'Find a Kindle e-reader with text actively displayed on screen', keywords: ['Kindle', 'e-reader', 'text on screen', 'Amazon Kindle'], location: 'indoor' },
  { description: 'Find an Instant Pot pressure cooker (silver pot, digital panel)', keywords: ['Instant Pot', 'pressure cooker', 'digital panel', 'multi-cooker'], location: 'indoor' },
  { description: 'Find a Vitamix blender (high-power, tall pitcher)', keywords: ['Vitamix', 'blender', 'tall pitcher', 'high-power blender'], location: 'indoor' },
  { description: 'Find a Sonos speaker with the Sonos logo visible', keywords: ['Sonos', 'speaker', 'Sonos logo', 'wireless speaker'], location: 'indoor' },
  { description: 'Find a Peloton stationary bike (red P logo, large screen)', keywords: ['Peloton', 'stationary bike', 'red P', 'Peloton bike'], location: 'indoor' },
  { description: 'Find a Weber kettle grill (round black charcoal grill with dome lid)', keywords: ['Weber kettle', 'kettle grill', 'round grill', 'Weber'], location: 'indoor' },
  { description: 'Find a kettlebell (must show its flat bottom or single handle)', keywords: ['kettlebell', 'flat bottom', 'cast iron', 'handle'], location: 'indoor' },
  { description: 'Find a chess board mid-game (pieces NOT in starting positions)', keywords: ['chess board', 'mid-game', 'in progress', 'pieces moved'], location: 'indoor' },
  { description: 'Find a globe of the Earth on a stand', keywords: ['globe', 'Earth globe', 'world globe', 'standing globe'], location: 'indoor' },
  { description: 'Find an upright piano (not a digital keyboard)', keywords: ['upright piano', 'acoustic piano', 'tall piano', 'piano'], location: 'indoor' },
  { description: 'Find an acoustic guitar with a visible sound hole', keywords: ['acoustic guitar', 'sound hole', 'wooden guitar', 'six strings'], location: 'indoor' },
  { description: 'Find a fish tank with at least one live fish visible', keywords: ['fish tank', 'fish visible', 'aquarium', 'live fish'], location: 'indoor' },
  { description: 'Find a record player with a vinyl record on the platter', keywords: ['record player', 'vinyl on platter', 'turntable', 'LP'], location: 'indoor' },
  { description: 'Find a candle with a visible lit flame', keywords: ['lit candle', 'flame', 'burning candle', 'wick'], location: 'indoor' },
  { description: 'Find a board game in progress (pieces placed mid-play)', keywords: ['board game', 'in progress', 'mid-game', 'tabletop game'], location: 'indoor' },
  { description: 'Find a sewing machine with thread loaded and ready', keywords: ['sewing machine', 'threaded', 'thread loaded', 'sewing'], location: 'indoor' },
  { description: 'Find a blender with ingredients currently inside the pitcher', keywords: ['blender with food', 'ingredients inside', 'blending', 'smoothie'], location: 'indoor' },
  { description: 'Find a washing machine actively running (visible water or movement)', keywords: ['washing machine running', 'active wash', 'spinning', 'laundry'], location: 'indoor' },
  { description: 'Find a treadmill with the belt currently moving', keywords: ['treadmill running', 'moving belt', 'active treadmill', 'running machine'], location: 'indoor' },
  { description: 'Find a medicine cabinet with the door open showing contents', keywords: ['medicine cabinet open', 'contents visible', 'bathroom cabinet', 'medications'], location: 'indoor' },
  { description: 'Find a printer actively printing a page (paper coming out)', keywords: ['printer', 'printing', 'paper coming out', 'active print'], location: 'indoor' },
  { description: 'Find a desk lamp with an articulated/adjustable arm', keywords: ['desk lamp arm', 'articulated', 'adjustable arm', 'task lamp'], location: 'indoor' },
  { description: 'Find a whiteboard with at least three lines of writing on it', keywords: ['whiteboard', 'writing on board', 'marker writing', 'dry-erase'], location: 'indoor' },
  { description: 'Find a filing cabinet with at least one drawer pulled open', keywords: ['filing cabinet', 'drawer open', 'files visible', 'office cabinet'], location: 'indoor' },
  { description: 'Find an espresso machine with a portafilter attached', keywords: ['espresso machine', 'portafilter', 'attached', 'espresso'], location: 'indoor' },
  { description: 'Find a sewing kit with multiple thread spools of different colors', keywords: ['sewing kit', 'thread spools', 'multiple colors', 'sewing supplies'], location: 'indoor' },
];

const tier3Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (50) ===
  { description: 'Find a dog mid-jump with all four paws off the ground', keywords: ['dog jumping', 'all paws off ground', 'mid-jump', 'airborne'], location: 'outdoor' },
  { description: 'Find a person actively riding a bicycle in motion', keywords: ['cycling', 'riding bicycle', 'in motion', 'cyclist'], location: 'outdoor' },
  { description: 'Find someone wearing a complete pair of red shoes (both visible)', keywords: ['red shoes', 'pair of red', 'both shoes', 'red footwear'], location: 'outdoor' },
  { description: 'Find a bird in mid-flight with wings outspread', keywords: ['bird flying', 'wings outspread', 'in flight', 'mid-air'], location: 'outdoor' },
  { description: 'Find a person juggling at least three objects in the air', keywords: ['juggler', 'three objects', 'juggling', 'mid-juggle'], location: 'outdoor' },
  { description: 'Find a dog actively catching a ball mid-air', keywords: ['dog catching ball', 'mid-air catch', 'fetch', 'dog ball'], location: 'outdoor' },
  { description: 'Find someone jogging with both feet potentially off the ground', keywords: ['jogger', 'running stride', 'both feet off', 'mid-stride'], location: 'outdoor' },
  { description: 'Find a person walking a dog on a leash (both visible)', keywords: ['walking dog', 'leash', 'dog walker', 'pet walking'], location: 'outdoor' },
  { description: 'Find a child actively swinging on a playground swing in motion', keywords: ['child swinging', 'in motion', 'playground', 'swing motion'], location: 'outdoor' },
  { description: 'Find a person eating an ice cream cone (cone visible in hand)', keywords: ['eating ice cream', 'cone in hand', 'ice cream cone', 'eating'], location: 'outdoor' },
  { description: 'Find a couple actively holding hands while walking', keywords: ['holding hands', 'couple walking', 'linked hands', 'couple'], location: 'outdoor' },
  { description: 'Find a squirrel actively eating something held in its paws', keywords: ['squirrel eating', 'paws holding food', 'nut', 'foraging'], location: 'outdoor' },
  { description: 'Find a person carrying an open umbrella above their head', keywords: ['open umbrella', 'umbrella over head', 'rain', 'carrying umbrella'], location: 'outdoor' },
  { description: 'Find a dog mid-air catching a frisbee in its mouth', keywords: ['dog frisbee', 'mid-air catch', 'frisbee in mouth', 'jumping dog'], location: 'outdoor' },
  { description: 'Find a skateboarder doing an aerial trick (board and rider airborne)', keywords: ['skateboard trick', 'aerial', 'airborne skateboard', 'trick'], location: 'outdoor' },
  { description: 'Find someone wearing reflective or mirrored sunglasses', keywords: ['mirrored sunglasses', 'reflective shades', 'aviator', 'mirror lens'], location: 'outdoor' },
  { description: 'Find a baby strapped into a stroller with restraints visible', keywords: ['baby in stroller', 'strapped in', 'restraints', 'infant stroller'], location: 'outdoor' },
  { description: 'Find a person carrying multiple grocery bags (two or more)', keywords: ['groceries', 'multiple bags', 'shopping bags', 'carrying bags'], location: 'outdoor' },
  { description: 'Find two dogs actively playing together off-leash', keywords: ['two dogs playing', 'off-leash', 'play fighting', 'dogs together'], location: 'outdoor' },
  { description: 'Find a person hailing a taxi with arm fully extended', keywords: ['hailing taxi', 'arm extended', 'flagging cab', 'taxi gesture'], location: 'outdoor' },
  { description: 'Find a cyclist with a clearly visible helmet on their head', keywords: ['cyclist helmet', 'wearing helmet', 'bike helmet', 'safety'], location: 'outdoor' },
  { description: 'Find a bird perched on a power line or telephone wire', keywords: ['bird on wire', 'perched wire', 'telephone wire', 'power line'], location: 'outdoor' },
  { description: 'Find a dog wearing a sweater, jacket, or other clothing', keywords: ['dog clothing', 'dog sweater', 'dressed dog', 'dog jacket'], location: 'outdoor' },
  { description: 'Find a street performer mid-performance with visible audience', keywords: ['street performer', 'audience watching', 'busker', 'performing'], location: 'outdoor' },
  { description: 'Find a person mid-jump with both feet off the ground', keywords: ['person jumping', 'both feet off', 'mid-jump', 'leap'], location: 'outdoor' },
  { description: 'Find someone waving with their hand raised above shoulder height', keywords: ['waving', 'hand raised', 'greeting', 'wave hand'], location: 'outdoor' },
  { description: 'Find a delivery person carrying a package toward a building', keywords: ['delivery person', 'carrying package', 'courier', 'package delivery'], location: 'outdoor' },
  { description: 'Find someone fishing with the rod actively in the water', keywords: ['fishing', 'rod in water', 'angler', 'casting'], location: 'outdoor' },
  { description: 'Find someone actively blowing soap bubbles (bubbles visible)', keywords: ['blowing bubbles', 'soap bubbles', 'bubbles visible', 'bubble wand'], location: 'outdoor' },
  { description: 'Find a dog actively swimming with its head above water', keywords: ['dog swimming', 'head above water', 'swimming dog', 'wet dog'], location: 'outdoor' },
  { description: 'Find a person flying a kite with the string clearly visible', keywords: ['flying kite', 'kite string', 'kite line visible', 'kite flier'], location: 'outdoor' },
  { description: 'Find a child actively drawing on pavement with sidewalk chalk', keywords: ['chalk drawing', 'sidewalk chalk', 'child chalk', 'pavement drawing'], location: 'outdoor' },
  { description: 'Find a person feeding birds with food clearly visible in hand', keywords: ['feeding birds', 'food in hand', 'bird food', 'pigeons'], location: 'outdoor' },
  { description: 'Find a person doing pushups with palms on the ground', keywords: ['pushups', 'palms on ground', 'press-ups', 'plank position'], location: 'outdoor' },
  { description: 'Find a wet dog actively shaking water off its body', keywords: ['dog shaking water', 'wet dog shaking', 'water spray', 'wet shake'], location: 'outdoor' },
  { description: 'Find someone taking a photo with a DSLR camera (not a phone)', keywords: ['DSLR camera', 'taking photo', 'photographer', 'camera with lens'], location: 'outdoor' },
  { description: 'Find someone playing acoustic guitar outdoors', keywords: ['playing guitar', 'acoustic guitar outside', 'busker guitar', 'street guitarist'], location: 'outdoor' },
  { description: 'Find a person mid-laugh with mouth open and visible smile', keywords: ['laughing', 'mouth open', 'mid-laugh', 'big smile'], location: 'outdoor' },
  { description: 'Find a person actively dancing with arms or body in motion', keywords: ['dancing', 'mid-dance', 'arms moving', 'dance pose'], location: 'outdoor' },
  { description: 'Find two people in a full embrace (hug, both arms wrapped)', keywords: ['hugging', 'embrace', 'arms wrapped', 'two people hug'], location: 'outdoor' },
  { description: 'Find a dog carrying a stick in its mouth', keywords: ['dog with stick', 'stick in mouth', 'fetching stick', 'dog branch'], location: 'outdoor' },
  { description: 'Find someone watering plants with a hose (water flowing)', keywords: ['watering hose', 'water flowing', 'garden hose', 'watering plants'], location: 'outdoor' },
  { description: 'Find a person mid-juggle with objects clearly airborne', keywords: ['juggling mid-air', 'objects airborne', 'juggler hands', 'three objects'], location: 'outdoor' },
  { description: 'Find a dog with its tongue extended outside its mouth (panting)', keywords: ['dog tongue out', 'panting', 'tongue extended', 'happy dog'], location: 'outdoor' },
  { description: 'Find someone skateboarding (both feet on the board, in motion)', keywords: ['skateboarding', 'on board', 'rolling skateboard', 'skater'], location: 'outdoor' },
  { description: 'Find someone sprinting with full stride (both arms swinging)', keywords: ['sprinting', 'full stride', 'running fast', 'sprint'], location: 'outdoor' },
  { description: 'Find two people shaking hands (hands clasped)', keywords: ['handshake', 'shaking hands', 'hands clasped', 'greeting'], location: 'outdoor' },
  { description: 'Find a person holding an inflated balloon by a string', keywords: ['holding balloon', 'balloon string', 'inflated balloon', 'balloon in hand'], location: 'outdoor' },
  { description: 'Find a child being carried on an adult\'s shoulders', keywords: ['shoulder ride', 'piggyback', 'on shoulders', 'child carried'], location: 'outdoor' },
  { description: 'Find a dog actively digging with paws in dirt', keywords: ['dog digging', 'paws in dirt', 'digging hole', 'excavating'], location: 'outdoor' },

  // === INDOOR (50) ===
  { description: 'Find a cat sitting on a window sill with paws visible', keywords: ['cat on sill', 'window sill', 'paws visible', 'sitting cat'], location: 'indoor' },
  { description: 'Find someone actively reading a physical book (not a screen)', keywords: ['reading book', 'physical book', 'open book', 'reader'], location: 'indoor' },
  { description: 'Find someone typing on a laptop with both hands on keyboard', keywords: ['typing laptop', 'both hands keyboard', 'fingers on keys', 'computing'], location: 'indoor' },
  { description: 'Find a person wearing over-ear headphones (not earbuds)', keywords: ['over-ear headphones', 'headphones', 'cans', 'large headphones'], location: 'indoor' },
  { description: 'Find someone actively cooking over a stove with food in a pan', keywords: ['cooking stove', 'food in pan', 'sauteing', 'active cooking'], location: 'indoor' },
  { description: 'Find someone in the act of making a bed (sheets mid-fold)', keywords: ['making bed', 'sheets', 'mid-fold', 'bedding'], location: 'indoor' },
  { description: 'Find someone playing a video game with controller in hand', keywords: ['playing video game', 'controller in hand', 'gaming', 'gamer'], location: 'indoor' },
  { description: 'Find someone holding a phone to their ear (active call posture)', keywords: ['phone to ear', 'on call', 'phone call', 'talking phone'], location: 'indoor' },
  { description: 'Find a person drinking from a coffee cup (cup at lips)', keywords: ['drinking coffee', 'cup at lips', 'sipping', 'coffee mug'], location: 'indoor' },
  { description: 'Find someone in an active stretching pose (limb extended)', keywords: ['stretching', 'limb extended', 'stretch pose', 'limber'], location: 'indoor' },
  { description: 'Find someone painting on a canvas with a brush in hand', keywords: ['painting canvas', 'brush in hand', 'easel', 'artist'], location: 'indoor' },
  { description: 'Find someone meditating in a cross-legged seated pose', keywords: ['meditating', 'cross-legged', 'lotus pose', 'zen'], location: 'indoor' },
  { description: 'Find a person in a yoga pose (downward dog, warrior, or tree)', keywords: ['yoga pose', 'downward dog', 'warrior pose', 'asana'], location: 'indoor' },
  { description: 'Find a person actively climbing stairs or a ladder', keywords: ['climbing stairs', 'ladder', 'ascending', 'mid-climb'], location: 'indoor' },
  { description: 'Find a cat mid-stretch with front and rear legs extended', keywords: ['cat stretching', 'legs extended', 'cat yoga', 'arching'], location: 'indoor' },
  { description: 'Find someone pushing a shopping cart through aisles', keywords: ['pushing cart', 'shopping aisle', 'grocery cart', 'shopping'], location: 'indoor' },
  { description: 'Find a person holding a digital camera (not a phone)', keywords: ['digital camera', 'holding camera', 'point-and-shoot', 'photographer'], location: 'indoor' },
  { description: 'Find a child actively blowing out birthday candles', keywords: ['blowing candles', 'birthday', 'candles on cake', 'birthday cake'], location: 'indoor' },
  { description: 'Find someone actively unwrapping a gift (paper torn mid-action)', keywords: ['unwrapping gift', 'torn paper', 'opening present', 'gift'], location: 'indoor' },
  { description: 'Find a person clapping with both hands meeting in front of them', keywords: ['clapping', 'hands meeting', 'applause', 'clap'], location: 'indoor' },
  { description: 'Find someone whispering directly into another person\'s ear', keywords: ['whispering', 'ear to ear', 'secret', 'whisper'], location: 'indoor' },
  { description: 'Find someone checking the time on a wristwatch', keywords: ['checking watch', 'wristwatch', 'looking at time', 'wrist'], location: 'indoor' },
  { description: 'Find a cat mid-pounce (front paws extended, body airborne)', keywords: ['cat pouncing', 'mid-pounce', 'leaping cat', 'attacking'], location: 'indoor' },
  { description: 'Find someone actively tying their shoelaces (hands on laces)', keywords: ['tying shoes', 'hands on laces', 'tying laces', 'shoe tying'], location: 'indoor' },
  { description: 'Find a person mid-yawn with mouth open wide', keywords: ['yawning', 'mouth open', 'mid-yawn', 'tired'], location: 'indoor' },
  { description: 'Find someone pointing at something with arm fully extended', keywords: ['pointing', 'arm extended', 'finger pointing', 'gesturing'], location: 'indoor' },
  { description: 'Find someone mid-sneeze (head back or hand to face)', keywords: ['sneezing', 'mid-sneeze', 'achoo', 'sneeze'], location: 'indoor' },
  { description: 'Find a dog mid-bark with mouth wide open', keywords: ['dog barking', 'mouth open', 'mid-bark', 'vocalizing'], location: 'indoor' },
  { description: 'Find a person carrying a child in their arms', keywords: ['carrying child', 'child in arms', 'parent holding', 'cradling'], location: 'indoor' },
  { description: 'Find a cat actively grooming itself with its tongue', keywords: ['cat grooming', 'tongue cleaning', 'self-cleaning', 'licking'], location: 'indoor' },
  { description: 'Find a dog rolling on its back with paws in the air', keywords: ['dog rolling', 'back rolling', 'paws up', 'belly up'], location: 'indoor' },
  { description: 'Find a dog catching a thrown treat in the air', keywords: ['dog catching treat', 'mid-air treat', 'snapping', 'food catch'], location: 'indoor' },
  { description: 'Find a person balancing on one foot with the other leg raised', keywords: ['balancing one foot', 'leg raised', 'one-legged', 'balance'], location: 'indoor' },
  { description: 'Find a person blowing a kiss (hand near mouth, lips pursed)', keywords: ['blowing kiss', 'hand to mouth', 'kiss gesture', 'air kiss'], location: 'indoor' },
  { description: 'Find someone giving another person a piggyback ride', keywords: ['piggyback', 'on back', 'riding back', 'piggy ride'], location: 'indoor' },
  { description: 'Find someone doing jumping jacks (arms overhead, legs apart)', keywords: ['jumping jacks', 'arms overhead', 'star jump', 'cardio'], location: 'indoor' },
  { description: 'Find a dog actively fetching (running with object in mouth)', keywords: ['dog fetching', 'running with object', 'retrieving', 'fetch'], location: 'indoor' },
  { description: 'Find someone bowing or taking a bow (waist bent forward)', keywords: ['bowing', 'waist bent', 'taking bow', 'bow gesture'], location: 'indoor' },
  { description: 'Find a person in a forward lunge position (knee bent forward)', keywords: ['lunge', 'forward lunge', 'knee bent', 'lunging'], location: 'indoor' },
  { description: 'Find a cat sleeping in a patch of direct sunlight', keywords: ['cat sleeping sunlight', 'sun spot', 'cat sun', 'napping cat'], location: 'indoor' },
  { description: 'Find two people arm wrestling at a table', keywords: ['arm wrestling', 'at table', 'arm wrestle', 'two people'], location: 'indoor' },
  { description: 'Find a cat in a stalking/hunting pose (low to ground, focused)', keywords: ['cat stalking', 'low body', 'hunting pose', 'crouched cat'], location: 'indoor' },
  { description: 'Find someone in a handstand position (upside down, hands on floor)', keywords: ['handstand', 'upside down', 'hands on floor', 'inverted'], location: 'indoor' },
  { description: 'Find someone folding laundry with an item mid-fold', keywords: ['folding laundry', 'mid-fold', 'folding clothes', 'laundry'], location: 'indoor' },
  { description: 'Find someone washing dishes at a sink with running water', keywords: ['washing dishes', 'running water', 'sink', 'dishwashing'], location: 'indoor' },
  { description: 'Find someone brushing teeth with a toothbrush in mouth', keywords: ['brushing teeth', 'toothbrush in mouth', 'dental', 'oral hygiene'], location: 'indoor' },
  { description: 'Find someone vacuuming with the vacuum cleaner clearly running', keywords: ['vacuuming', 'vacuum running', 'cleaning floor', 'hoover'], location: 'indoor' },
  { description: 'Find someone dangling a toy for a cat (cat reaching for it)', keywords: ['cat toy dangle', 'teasing cat', 'cat playing', 'string toy'], location: 'indoor' },
  { description: 'Find someone writing at a desk with a pen visible in hand', keywords: ['writing desk', 'pen in hand', 'writing', 'desk work'], location: 'indoor' },
  { description: 'Find someone in the act of putting on a coat (mid-arm-through-sleeve)', keywords: ['putting on coat', 'arm through sleeve', 'donning jacket', 'mid-action'], location: 'indoor' },
];

function generateMissions(): Mission[] {
  const missions: Mission[] = [];

  tier1Missions.forEach((m, i) => {
    missions.push({
      ...m,
      id: `t1-${String(i + 1).padStart(3, '0')}`,
      tier: 1,
      difficulty: 'easy',
    });
  });

  tier2Missions.forEach((m, i) => {
    missions.push({
      ...m,
      id: `t2-${String(i + 1).padStart(3, '0')}`,
      tier: 2,
      difficulty: 'medium',
    });
  });

  tier3Missions.forEach((m, i) => {
    missions.push({
      ...m,
      id: `t3-${String(i + 1).padStart(3, '0')}`,
      tier: 3,
      difficulty: 'hard',
    });
  });

  return missions;
}

export const MISSIONS = generateMissions();

export function getMissionsByTier(tier: Tier): Mission[] {
  return MISSIONS.filter(m => m.tier === tier);
}

export function getMissionsByTierAndLocation(tier: Tier, location: 'indoor' | 'outdoor'): Mission[] {
  return MISSIONS.filter(m => m.tier === tier && m.location === location);
}

export function getRandomMission(tier: Tier): Mission {
  const outdoorChance = OUTDOOR_RATIO[tier];
  const roll = Math.random();
  const location: 'indoor' | 'outdoor' = roll < outdoorChance ? 'outdoor' : 'indoor';

  const pool = getMissionsByTierAndLocation(tier, location);

  if (pool.length === 0) {
    const allTierMissions = getMissionsByTier(tier);
    return allTierMissions[Math.floor(Math.random() * allTierMissions.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function getMissionById(id: string): Mission | undefined {
  return MISSIONS.find(m => m.id === id);
}
