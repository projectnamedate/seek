import { Mission, Tier } from '../types';

// Indoor/outdoor ratio per tier (outdoor percentage)
const OUTDOOR_RATIO: Record<Tier, number> = { 1: 0.70, 2: 0.60, 3: 0.50 };

// Tier 1: Easy objects - 3 minutes to find
// Target: 70 outdoor + 30 indoor = 100 total
const tier1Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (70) ===
  { description: 'Find a red fire hydrant', keywords: ['fire hydrant', 'red', 'hydrant'], location: 'outdoor' },
  { description: 'Find a blue car', keywords: ['car', 'blue', 'vehicle', 'automobile'], location: 'outdoor' },
  { description: 'Find a dog', keywords: ['dog', 'canine', 'puppy', 'pet'], location: 'outdoor' },
  { description: 'Find a stop sign', keywords: ['stop sign', 'sign', 'red', 'octagon'], location: 'outdoor' },
  { description: 'Find a tree', keywords: ['tree', 'plant', 'oak', 'pine', 'leaves'], location: 'outdoor' },
  { description: 'Find a bicycle', keywords: ['bicycle', 'bike', 'cycle'], location: 'outdoor' },
  { description: 'Find a trash can', keywords: ['trash can', 'garbage', 'bin', 'waste'], location: 'outdoor' },
  { description: 'Find a streetlight', keywords: ['streetlight', 'lamp', 'light pole', 'street lamp'], location: 'outdoor' },
  { description: 'Find a bench', keywords: ['bench', 'seat', 'park bench'], location: 'outdoor' },
  { description: 'Find a mailbox', keywords: ['mailbox', 'mail', 'post box'], location: 'outdoor' },
  { description: 'Find a bird', keywords: ['bird', 'pigeon', 'sparrow', 'crow'], location: 'outdoor' },
  { description: 'Find a flower', keywords: ['flower', 'bloom', 'plant', 'petal'], location: 'outdoor' },
  { description: 'Find a cat', keywords: ['cat', 'feline', 'kitty', 'kitten'], location: 'outdoor' },
  { description: 'Find a white car', keywords: ['car', 'white', 'vehicle'], location: 'outdoor' },
  { description: 'Find a fence', keywords: ['fence', 'barrier', 'gate'], location: 'outdoor' },
  { description: 'Find a parking meter', keywords: ['parking meter', 'meter', 'parking'], location: 'outdoor' },
  { description: 'Find a crosswalk', keywords: ['crosswalk', 'pedestrian crossing', 'zebra crossing'], location: 'outdoor' },
  { description: 'Find a bus stop', keywords: ['bus stop', 'bus', 'stop', 'transit'], location: 'outdoor' },
  { description: 'Find a sidewalk', keywords: ['sidewalk', 'pavement', 'walkway'], location: 'outdoor' },
  { description: 'Find a cloud', keywords: ['cloud', 'sky', 'weather'], location: 'outdoor' },
  { description: 'Find a rock', keywords: ['rock', 'stone', 'boulder'], location: 'outdoor' },
  { description: 'Find a puddle', keywords: ['puddle', 'water', 'rain'], location: 'outdoor' },
  { description: 'Find a motorcycle', keywords: ['motorcycle', 'motorbike', 'bike'], location: 'outdoor' },
  { description: 'Find a traffic light', keywords: ['traffic light', 'signal', 'stoplight'], location: 'outdoor' },
  { description: 'Find a speed limit sign', keywords: ['speed limit', 'sign', 'mph'], location: 'outdoor' },
  { description: 'Find a flag', keywords: ['flag', 'banner', 'pole'], location: 'outdoor' },
  { description: 'Find a basketball hoop', keywords: ['basketball', 'hoop', 'net', 'rim'], location: 'outdoor' },
  { description: 'Find a playground', keywords: ['playground', 'swing', 'slide', 'park'], location: 'outdoor' },
  { description: 'Find a manhole cover', keywords: ['manhole', 'cover', 'sewer'], location: 'outdoor' },
  { description: 'Find a fire escape', keywords: ['fire escape', 'ladder', 'emergency'], location: 'outdoor' },
  { description: 'Find a brick wall', keywords: ['brick', 'wall', 'red brick'], location: 'outdoor' },
  { description: 'Find a potted plant', keywords: ['potted plant', 'pot', 'plant', 'planter'], location: 'outdoor' },
  { description: 'Find a picnic table', keywords: ['picnic table', 'table', 'outdoor'], location: 'outdoor' },
  { description: 'Find a water fountain', keywords: ['water fountain', 'fountain', 'drinking'], location: 'outdoor' },
  { description: 'Find a dumpster', keywords: ['dumpster', 'trash', 'garbage', 'container'], location: 'outdoor' },
  { description: 'Find a newspaper stand', keywords: ['newspaper', 'stand', 'news'], location: 'outdoor' },
  { description: 'Find a construction cone', keywords: ['cone', 'traffic cone', 'orange'], location: 'outdoor' },
  { description: 'Find a shopping cart', keywords: ['shopping cart', 'cart', 'trolley'], location: 'outdoor' },
  { description: 'Find a handicap sign', keywords: ['handicap', 'accessible', 'wheelchair'], location: 'outdoor' },
  { description: 'Find a yield sign', keywords: ['yield', 'sign', 'triangle'], location: 'outdoor' },
  { description: 'Find a no parking sign', keywords: ['no parking', 'sign', 'parking'], location: 'outdoor' },
  { description: 'Find a one way sign', keywords: ['one way', 'sign', 'arrow'], location: 'outdoor' },
  { description: 'Find a bus', keywords: ['bus', 'transit', 'public transport'], location: 'outdoor' },
  { description: 'Find a taxi', keywords: ['taxi', 'cab', 'yellow'], location: 'outdoor' },
  { description: 'Find a truck', keywords: ['truck', 'lorry', 'vehicle'], location: 'outdoor' },
  { description: 'Find a van', keywords: ['van', 'vehicle', 'minivan'], location: 'outdoor' },
  { description: 'Find a convertible', keywords: ['convertible', 'car', 'open top'], location: 'outdoor' },
  { description: 'Find a SUV', keywords: ['SUV', 'car', 'vehicle'], location: 'outdoor' },
  { description: 'Find a palm tree', keywords: ['palm tree', 'palm', 'tropical'], location: 'outdoor' },
  { description: 'Find a pine tree', keywords: ['pine tree', 'pine', 'evergreen'], location: 'outdoor' },
  { description: 'Find a hedge', keywords: ['hedge', 'bush', 'shrub'], location: 'outdoor' },
  { description: 'Find ivy', keywords: ['ivy', 'vine', 'climbing plant'], location: 'outdoor' },
  { description: 'Find a statue', keywords: ['statue', 'sculpture', 'monument'], location: 'outdoor' },
  { description: 'Find a fountain', keywords: ['fountain', 'water feature', 'spray'], location: 'outdoor' },
  { description: 'Find a garden', keywords: ['garden', 'plants', 'flowers'], location: 'outdoor' },
  { description: 'Find a lawn', keywords: ['lawn', 'grass', 'yard'], location: 'outdoor' },
  { description: 'Find a parking lot', keywords: ['parking lot', 'parking', 'cars'], location: 'outdoor' },
  { description: 'Find a garage', keywords: ['garage', 'parking', 'cars'], location: 'outdoor' },
  { description: 'Find a driveway', keywords: ['driveway', 'entrance', 'house'], location: 'outdoor' },
  { description: 'Find a bridge', keywords: ['bridge', 'crossing', 'overpass'], location: 'outdoor' },
  { description: 'Find a bird feeder', keywords: ['bird feeder', 'feeder', 'birds'], location: 'outdoor' },
  { description: 'Find a birdhouse', keywords: ['birdhouse', 'bird', 'house'], location: 'outdoor' },
  { description: 'Find a garden gnome', keywords: ['gnome', 'garden', 'decoration'], location: 'outdoor' },
  { description: 'Find a house number', keywords: ['house number', 'number', 'address'], location: 'outdoor' },
  { description: 'Find a porch light', keywords: ['porch light', 'light', 'door'], location: 'outdoor' },
  { description: 'Find a rocking chair', keywords: ['rocking chair', 'chair', 'porch'], location: 'outdoor' },
  { description: 'Find a hammock', keywords: ['hammock', 'swing', 'relax'], location: 'outdoor' },
  { description: 'Find a grill', keywords: ['grill', 'BBQ', 'barbecue'], location: 'outdoor' },
  { description: 'Find a patio umbrella', keywords: ['umbrella', 'patio', 'shade'], location: 'outdoor' },
  { description: 'Find a pool', keywords: ['pool', 'swimming', 'water'], location: 'outdoor' },

  // === INDOOR (30) ===
  { description: 'Find a window', keywords: ['window', 'glass', 'building'], location: 'indoor' },
  { description: 'Find a door', keywords: ['door', 'entrance', 'exit'], location: 'indoor' },
  { description: 'Find stairs', keywords: ['stairs', 'steps', 'staircase'], location: 'indoor' },
  { description: 'Find a fire alarm', keywords: ['fire alarm', 'alarm', 'emergency'], location: 'indoor' },
  { description: 'Find a vending machine', keywords: ['vending machine', 'machine', 'snack'], location: 'indoor' },
  { description: 'Find an ATM', keywords: ['ATM', 'cash machine', 'bank'], location: 'indoor' },
  { description: 'Find a fire extinguisher', keywords: ['fire extinguisher', 'extinguisher', 'red'], location: 'indoor' },
  { description: 'Find a security camera', keywords: ['security camera', 'camera', 'surveillance'], location: 'indoor' },
  { description: 'Find a welcome mat', keywords: ['welcome mat', 'mat', 'door'], location: 'indoor' },
  { description: 'Find a doorbell', keywords: ['doorbell', 'bell', 'door'], location: 'indoor' },
  { description: 'Find a coffee mug', keywords: ['coffee mug', 'mug', 'cup', 'coffee'], location: 'indoor' },
  { description: 'Find a bookshelf', keywords: ['bookshelf', 'shelf', 'books', 'bookcase'], location: 'indoor' },
  { description: 'Find a TV remote', keywords: ['remote', 'TV remote', 'remote control', 'television'], location: 'indoor' },
  { description: 'Find a microwave', keywords: ['microwave', 'oven', 'kitchen', 'appliance'], location: 'indoor' },
  { description: 'Find a couch', keywords: ['couch', 'sofa', 'loveseat', 'furniture'], location: 'indoor' },
  { description: 'Find a clock', keywords: ['clock', 'time', 'wall clock', 'alarm clock'], location: 'indoor' },
  { description: 'Find a mirror', keywords: ['mirror', 'reflection', 'glass'], location: 'indoor' },
  { description: 'Find a light switch', keywords: ['light switch', 'switch', 'wall', 'electric'], location: 'indoor' },
  { description: 'Find a ceiling fan', keywords: ['ceiling fan', 'fan', 'ceiling', 'blades'], location: 'indoor' },
  { description: 'Find a toaster', keywords: ['toaster', 'bread', 'kitchen', 'appliance'], location: 'indoor' },
  { description: 'Find a refrigerator', keywords: ['refrigerator', 'fridge', 'kitchen', 'cold'], location: 'indoor' },
  { description: 'Find a lamp', keywords: ['lamp', 'light', 'table lamp', 'floor lamp'], location: 'indoor' },
  { description: 'Find a pillow', keywords: ['pillow', 'cushion', 'bed', 'soft'], location: 'indoor' },
  { description: 'Find a rug', keywords: ['rug', 'carpet', 'floor', 'mat'], location: 'indoor' },
  { description: 'Find a picture frame', keywords: ['picture frame', 'frame', 'photo', 'wall'], location: 'indoor' },
  { description: 'Find a houseplant', keywords: ['houseplant', 'plant', 'indoor plant', 'pot'], location: 'indoor' },
  { description: 'Find a power outlet', keywords: ['power outlet', 'outlet', 'plug', 'socket'], location: 'indoor' },
  { description: 'Find a trash bag', keywords: ['trash bag', 'garbage bag', 'bag', 'waste'], location: 'indoor' },
  { description: 'Find a coat rack', keywords: ['coat rack', 'rack', 'hooks', 'hanger'], location: 'indoor' },
  { description: 'Find a smoke detector', keywords: ['smoke detector', 'detector', 'ceiling', 'safety'], location: 'indoor' },
];

// Tier 2: Specific objects - 2 minutes to find
// Target: 60 outdoor + 40 indoor = 100 total
const tier2Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (60) ===
  { description: 'Find a Starbucks cup', keywords: ['Starbucks', 'coffee cup', 'green logo'], location: 'outdoor' },
  { description: 'Find a golden retriever', keywords: ['golden retriever', 'dog', 'golden', 'retriever'], location: 'outdoor' },
  { description: 'Find a Tesla', keywords: ['Tesla', 'electric car', 'Model'], location: 'outdoor' },
  { description: 'Find a pizza box', keywords: ['pizza box', 'pizza', 'delivery'], location: 'outdoor' },
  { description: 'Find a red rose', keywords: ['red rose', 'rose', 'flower', 'red'], location: 'outdoor' },
  { description: 'Find a German Shepherd', keywords: ['German Shepherd', 'dog', 'shepherd'], location: 'outdoor' },
  { description: 'Find a Nike logo', keywords: ['Nike', 'swoosh', 'logo'], location: 'outdoor' },
  { description: 'Find a McDonald\'s sign', keywords: ['McDonald\'s', 'golden arches', 'M'], location: 'outdoor' },
  { description: 'Find a Coca-Cola can', keywords: ['Coca-Cola', 'Coke', 'red can'], location: 'outdoor' },
  { description: 'Find a FedEx truck', keywords: ['FedEx', 'delivery truck', 'purple'], location: 'outdoor' },
  { description: 'Find a UPS truck', keywords: ['UPS', 'delivery', 'brown truck'], location: 'outdoor' },
  { description: 'Find an Amazon package', keywords: ['Amazon', 'package', 'box', 'smile'], location: 'outdoor' },
  { description: 'Find a Prius', keywords: ['Prius', 'Toyota', 'hybrid'], location: 'outdoor' },
  { description: 'Find a Jeep Wrangler', keywords: ['Jeep', 'Wrangler', 'off-road'], location: 'outdoor' },
  { description: 'Find a Ford F-150', keywords: ['Ford', 'F-150', 'truck', 'pickup'], location: 'outdoor' },
  { description: 'Find a Mini Cooper', keywords: ['Mini Cooper', 'Mini', 'small car'], location: 'outdoor' },
  { description: 'Find a Mustang', keywords: ['Mustang', 'Ford', 'sports car'], location: 'outdoor' },
  { description: 'Find a Subaru', keywords: ['Subaru', 'car', 'AWD'], location: 'outdoor' },
  { description: 'Find a Honda Civic', keywords: ['Honda', 'Civic', 'sedan'], location: 'outdoor' },
  { description: 'Find a labrador', keywords: ['labrador', 'lab', 'dog', 'retriever'], location: 'outdoor' },
  { description: 'Find a poodle', keywords: ['poodle', 'dog', 'curly'], location: 'outdoor' },
  { description: 'Find a bulldog', keywords: ['bulldog', 'dog', 'wrinkled'], location: 'outdoor' },
  { description: 'Find a husky', keywords: ['husky', 'dog', 'siberian'], location: 'outdoor' },
  { description: 'Find a corgi', keywords: ['corgi', 'dog', 'short legs'], location: 'outdoor' },
  { description: 'Find a sunflower', keywords: ['sunflower', 'flower', 'yellow', 'tall'], location: 'outdoor' },
  { description: 'Find a fire truck', keywords: ['fire truck', 'red', 'emergency'], location: 'outdoor' },
  { description: 'Find a police car', keywords: ['police car', 'cop', 'law enforcement'], location: 'outdoor' },
  { description: 'Find an ambulance', keywords: ['ambulance', 'emergency', 'medical'], location: 'outdoor' },
  { description: 'Find a school bus', keywords: ['school bus', 'yellow bus', 'bus'], location: 'outdoor' },
  { description: 'Find an ice cream truck', keywords: ['ice cream truck', 'ice cream', 'music'], location: 'outdoor' },
  { description: 'Find a food truck', keywords: ['food truck', 'street food', 'mobile'], location: 'outdoor' },
  { description: 'Find a cement mixer', keywords: ['cement mixer', 'concrete', 'construction'], location: 'outdoor' },
  { description: 'Find a crane', keywords: ['crane', 'construction', 'lifting'], location: 'outdoor' },
  { description: 'Find a bulldozer', keywords: ['bulldozer', 'construction', 'yellow'], location: 'outdoor' },
  { description: 'Find a skateboard', keywords: ['skateboard', 'skate', 'board'], location: 'outdoor' },
  { description: 'Find a scooter', keywords: ['scooter', 'electric scooter', 'kick scooter'], location: 'outdoor' },
  { description: 'Find a mountain bike', keywords: ['mountain bike', 'MTB', 'bicycle'], location: 'outdoor' },
  { description: 'Find a baby stroller', keywords: ['stroller', 'baby', 'carriage'], location: 'outdoor' },
  { description: 'Find a kayak', keywords: ['kayak', 'boat', 'paddle'], location: 'outdoor' },
  { description: 'Find a surfboard', keywords: ['surfboard', 'surf', 'beach'], location: 'outdoor' },
  { description: 'Find a sailboat', keywords: ['sailboat', 'sail', 'boat'], location: 'outdoor' },
  { description: 'Find a camping tent', keywords: ['camping tent', 'tent', 'outdoor'], location: 'outdoor' },
  { description: 'Find hiking boots', keywords: ['hiking boots', 'boots', 'outdoor'], location: 'outdoor' },
  { description: 'Find a drone', keywords: ['drone', 'UAV', 'flying'], location: 'outdoor' },
  { description: 'Find a kite', keywords: ['kite', 'flying', 'wind'], location: 'outdoor' },
  { description: 'Find a frisbee', keywords: ['frisbee', 'disc', 'flying'], location: 'outdoor' },
  { description: 'Find a football', keywords: ['football', 'NFL', 'american'], location: 'outdoor' },
  { description: 'Find a soccer ball', keywords: ['soccer ball', 'football', 'FIFA'], location: 'outdoor' },
  { description: 'Find a basketball', keywords: ['basketball', 'NBA', 'orange'], location: 'outdoor' },
  { description: 'Find a baseball', keywords: ['baseball', 'MLB', 'ball'], location: 'outdoor' },
  { description: 'Find a tennis ball', keywords: ['tennis ball', 'yellow', 'fuzzy'], location: 'outdoor' },
  { description: 'Find a golf club', keywords: ['golf club', 'club', 'golf'], location: 'outdoor' },
  { description: 'Find a baseball bat', keywords: ['baseball bat', 'bat', 'wood'], location: 'outdoor' },
  { description: 'Find a jump rope', keywords: ['jump rope', 'rope', 'exercise'], location: 'outdoor' },
  { description: 'Find a trampoline', keywords: ['trampoline', 'jumping', 'bounce'], location: 'outdoor' },
  { description: 'Find a tulip', keywords: ['tulip', 'flower', 'spring'], location: 'outdoor' },
  { description: 'Find a daisy', keywords: ['daisy', 'flower', 'white', 'yellow'], location: 'outdoor' },
  { description: 'Find a cactus', keywords: ['cactus', 'succulent', 'desert'], location: 'outdoor' },
  { description: 'Find a bonsai tree', keywords: ['bonsai', 'tree', 'small', 'japanese'], location: 'outdoor' },
  { description: 'Find a hula hoop', keywords: ['hula hoop', 'hoop', 'toy'], location: 'outdoor' },

  // === INDOOR (40) ===
  { description: 'Find a yoga mat', keywords: ['yoga mat', 'mat', 'exercise'], location: 'indoor' },
  { description: 'Find dumbbells', keywords: ['dumbbells', 'weights', 'exercise'], location: 'indoor' },
  { description: 'Find a backpack', keywords: ['backpack', 'bag', 'hiking'], location: 'indoor' },
  { description: 'Find boxing gloves', keywords: ['boxing gloves', 'gloves', 'boxing'], location: 'indoor' },
  { description: 'Find a telescope', keywords: ['telescope', 'stars', 'astronomy'], location: 'indoor' },
  { description: 'Find a PlayStation controller', keywords: ['PlayStation', 'controller', 'gamepad', 'DualSense'], location: 'indoor' },
  { description: 'Find a Keurig coffee maker', keywords: ['Keurig', 'coffee maker', 'K-cup', 'brewer'], location: 'indoor' },
  { description: 'Find a LEGO set', keywords: ['LEGO', 'bricks', 'building blocks', 'toy'], location: 'indoor' },
  { description: 'Find an Apple logo', keywords: ['Apple', 'logo', 'iPhone', 'Mac'], location: 'indoor' },
  { description: 'Find a KitchenAid mixer', keywords: ['KitchenAid', 'mixer', 'stand mixer', 'kitchen'], location: 'indoor' },
  { description: 'Find a Dyson vacuum', keywords: ['Dyson', 'vacuum', 'cleaner', 'cordless'], location: 'indoor' },
  { description: 'Find a Nintendo Switch', keywords: ['Nintendo', 'Switch', 'Joy-Con', 'gaming'], location: 'indoor' },
  { description: 'Find an Xbox controller', keywords: ['Xbox', 'controller', 'gamepad', 'Microsoft'], location: 'indoor' },
  { description: 'Find a Roomba', keywords: ['Roomba', 'robot vacuum', 'iRobot', 'cleaning'], location: 'indoor' },
  { description: 'Find a Kindle', keywords: ['Kindle', 'e-reader', 'Amazon', 'reading'], location: 'indoor' },
  { description: 'Find an Instant Pot', keywords: ['Instant Pot', 'pressure cooker', 'kitchen', 'cooking'], location: 'indoor' },
  { description: 'Find a Vitamix blender', keywords: ['Vitamix', 'blender', 'kitchen', 'smoothie'], location: 'indoor' },
  { description: 'Find a Sonos speaker', keywords: ['Sonos', 'speaker', 'audio', 'music'], location: 'indoor' },
  { description: 'Find a Peloton bike', keywords: ['Peloton', 'bike', 'exercise', 'stationary'], location: 'indoor' },
  { description: 'Find a Weber grill', keywords: ['Weber', 'grill', 'charcoal', 'cooking'], location: 'indoor' },
  { description: 'Find a tabby cat', keywords: ['tabby', 'cat', 'striped'], location: 'indoor' },
  { description: 'Find a black cat', keywords: ['black cat', 'cat', 'black'], location: 'indoor' },
  { description: 'Find a kettlebell', keywords: ['kettlebell', 'weight', 'exercise'], location: 'indoor' },
  { description: 'Find a chess set', keywords: ['chess', 'chess set', 'board game', 'pieces'], location: 'indoor' },
  { description: 'Find a globe', keywords: ['globe', 'world', 'earth', 'map'], location: 'indoor' },
  { description: 'Find a piano', keywords: ['piano', 'keyboard', 'keys', 'music'], location: 'indoor' },
  { description: 'Find a guitar', keywords: ['guitar', 'strings', 'acoustic', 'music'], location: 'indoor' },
  { description: 'Find a fish tank', keywords: ['fish tank', 'aquarium', 'fish', 'water'], location: 'indoor' },
  { description: 'Find a record player', keywords: ['record player', 'turntable', 'vinyl', 'music'], location: 'indoor' },
  { description: 'Find a candle', keywords: ['candle', 'flame', 'wax', 'wick'], location: 'indoor' },
  { description: 'Find a board game', keywords: ['board game', 'game', 'Monopoly', 'Scrabble'], location: 'indoor' },
  { description: 'Find a sewing machine', keywords: ['sewing machine', 'sewing', 'fabric', 'thread'], location: 'indoor' },
  { description: 'Find a blender', keywords: ['blender', 'kitchen', 'smoothie', 'mix'], location: 'indoor' },
  { description: 'Find a washing machine', keywords: ['washing machine', 'laundry', 'washer', 'clothes'], location: 'indoor' },
  { description: 'Find a treadmill', keywords: ['treadmill', 'running', 'exercise', 'gym'], location: 'indoor' },
  { description: 'Find a medicine cabinet', keywords: ['medicine cabinet', 'cabinet', 'bathroom', 'mirror'], location: 'indoor' },
  { description: 'Find a printer', keywords: ['printer', 'paper', 'ink', 'print'], location: 'indoor' },
  { description: 'Find a desk lamp', keywords: ['desk lamp', 'lamp', 'light', 'desk'], location: 'indoor' },
  { description: 'Find a whiteboard', keywords: ['whiteboard', 'marker', 'board', 'write'], location: 'indoor' },
  { description: 'Find a filing cabinet', keywords: ['filing cabinet', 'cabinet', 'files', 'office'], location: 'indoor' },
];

// Tier 3: Hard scenarios - 1 minute to find
// Target: 50 outdoor + 50 indoor = 100 total
const tier3Missions: Omit<Mission, 'id' | 'tier' | 'difficulty'>[] = [
  // === OUTDOOR (50) ===
  { description: 'Find a dog jumping', keywords: ['dog', 'jumping', 'leap', 'air'], location: 'outdoor' },
  { description: 'Find a person on a bicycle', keywords: ['person', 'bicycle', 'riding', 'cyclist'], location: 'outdoor' },
  { description: 'Find someone wearing red shoes', keywords: ['person', 'red shoes', 'footwear'], location: 'outdoor' },
  { description: 'Find a bird in flight', keywords: ['bird', 'flying', 'wings', 'air'], location: 'outdoor' },
  { description: 'Find someone taking a selfie', keywords: ['person', 'selfie', 'phone', 'camera'], location: 'outdoor' },
  { description: 'Find a dog with a ball', keywords: ['dog', 'ball', 'playing', 'fetch'], location: 'outdoor' },
  { description: 'Find someone jogging', keywords: ['person', 'jogging', 'running', 'exercise'], location: 'outdoor' },
  { description: 'Find someone walking a dog', keywords: ['person', 'walking', 'dog', 'leash'], location: 'outdoor' },
  { description: 'Find a child on a swing', keywords: ['child', 'swing', 'playground', 'swinging'], location: 'outdoor' },
  { description: 'Find someone eating ice cream', keywords: ['person', 'eating', 'ice cream', 'cone'], location: 'outdoor' },
  { description: 'Find a couple holding hands', keywords: ['couple', 'holding hands', 'together'], location: 'outdoor' },
  { description: 'Find a squirrel eating', keywords: ['squirrel', 'eating', 'nut', 'food'], location: 'outdoor' },
  { description: 'Find a person with an umbrella', keywords: ['person', 'umbrella', 'rain'], location: 'outdoor' },
  { description: 'Find a dog catching a frisbee', keywords: ['dog', 'frisbee', 'catching', 'air'], location: 'outdoor' },
  { description: 'Find a skateboarder doing a trick', keywords: ['skateboarder', 'trick', 'skateboard'], location: 'outdoor' },
  { description: 'Find someone wearing sunglasses', keywords: ['person', 'sunglasses', 'wearing'], location: 'outdoor' },
  { description: 'Find a baby in a stroller', keywords: ['baby', 'stroller', 'parent'], location: 'outdoor' },
  { description: 'Find someone carrying groceries', keywords: ['person', 'groceries', 'bags', 'shopping'], location: 'outdoor' },
  { description: 'Find a dog playing with another dog', keywords: ['dogs', 'playing', 'two dogs'], location: 'outdoor' },
  { description: 'Find someone hailing a taxi', keywords: ['person', 'taxi', 'hailing', 'arm up'], location: 'outdoor' },
  { description: 'Find a cyclist with a helmet', keywords: ['cyclist', 'helmet', 'bicycle', 'safety'], location: 'outdoor' },
  { description: 'Find a bird on a wire', keywords: ['bird', 'wire', 'sitting', 'perched'], location: 'outdoor' },
  { description: 'Find a dog wearing clothes', keywords: ['dog', 'clothes', 'dressed', 'outfit'], location: 'outdoor' },
  { description: 'Find a street performer', keywords: ['street performer', 'musician', 'busker'], location: 'outdoor' },
  { description: 'Find a person jumping', keywords: ['person', 'jumping', 'air', 'leap'], location: 'outdoor' },
  { description: 'Find someone waving', keywords: ['person', 'waving', 'hand', 'greeting'], location: 'outdoor' },
  { description: 'Find a delivery person', keywords: ['delivery', 'person', 'package', 'uniform'], location: 'outdoor' },
  { description: 'Find someone fishing', keywords: ['person', 'fishing', 'rod', 'water'], location: 'outdoor' },
  { description: 'Find someone blowing bubbles', keywords: ['person', 'bubbles', 'blowing', 'soap'], location: 'outdoor' },
  { description: 'Find a dog swimming', keywords: ['dog', 'swimming', 'water', 'wet'], location: 'outdoor' },
  { description: 'Find someone flying a kite', keywords: ['person', 'kite', 'flying', 'wind'], location: 'outdoor' },
  { description: 'Find a child drawing with chalk', keywords: ['child', 'chalk', 'drawing', 'sidewalk'], location: 'outdoor' },
  { description: 'Find someone feeding birds', keywords: ['person', 'feeding', 'birds', 'food'], location: 'outdoor' },
  { description: 'Find someone doing pushups', keywords: ['person', 'pushups', 'exercise', 'ground'], location: 'outdoor' },
  { description: 'Find a dog shaking off water', keywords: ['dog', 'shaking', 'water', 'wet'], location: 'outdoor' },
  { description: 'Find someone taking a photo', keywords: ['person', 'taking photo', 'camera', 'phone'], location: 'outdoor' },
  { description: 'Find someone playing guitar', keywords: ['person', 'guitar', 'playing', 'music'], location: 'outdoor' },
  { description: 'Find someone laughing', keywords: ['person', 'laughing', 'smile', 'happy'], location: 'outdoor' },
  { description: 'Find a person dancing', keywords: ['person', 'dancing', 'dance', 'moving'], location: 'outdoor' },
  { description: 'Find someone hugging', keywords: ['people', 'hugging', 'embrace', 'hug'], location: 'outdoor' },
  { description: 'Find a dog with a stick', keywords: ['dog', 'stick', 'carrying', 'mouth'], location: 'outdoor' },
  { description: 'Find someone watering plants', keywords: ['person', 'watering', 'plants', 'garden'], location: 'outdoor' },
  { description: 'Find someone juggling', keywords: ['person', 'juggling', 'balls', 'throwing'], location: 'outdoor' },
  { description: 'Find a dog with its tongue out', keywords: ['dog', 'tongue', 'out', 'panting'], location: 'outdoor' },
  { description: 'Find someone skateboarding', keywords: ['person', 'skateboarding', 'skate', 'board'], location: 'outdoor' },
  { description: 'Find someone sprinting', keywords: ['person', 'sprinting', 'running fast', 'speed'], location: 'outdoor' },
  { description: 'Find someone shaking hands', keywords: ['people', 'shaking hands', 'handshake', 'greeting'], location: 'outdoor' },
  { description: 'Find a person with a balloon', keywords: ['person', 'balloon', 'holding', 'colorful'], location: 'outdoor' },
  { description: 'Find a child on a parent\'s shoulders', keywords: ['child', 'shoulders', 'parent', 'carrying'], location: 'outdoor' },
  { description: 'Find a dog digging', keywords: ['dog', 'digging', 'dirt', 'ground'], location: 'outdoor' },

  // === INDOOR (50) ===
  { description: 'Find a cat sitting in a window', keywords: ['cat', 'window', 'sitting', 'inside'], location: 'indoor' },
  { description: 'Find someone reading a book', keywords: ['person', 'reading', 'book', 'sitting'], location: 'indoor' },
  { description: 'Find someone typing on a laptop', keywords: ['person', 'laptop', 'typing', 'computer'], location: 'indoor' },
  { description: 'Find a person with headphones', keywords: ['person', 'headphones', 'music', 'listening'], location: 'indoor' },
  { description: 'Find someone cooking', keywords: ['person', 'cooking', 'kitchen', 'stove', 'food'], location: 'indoor' },
  { description: 'Find someone making a bed', keywords: ['person', 'making bed', 'bed', 'sheets', 'bedroom'], location: 'indoor' },
  { description: 'Find someone playing a video game', keywords: ['person', 'video game', 'gaming', 'controller', 'screen'], location: 'indoor' },
  { description: 'Find someone on a phone call', keywords: ['person', 'phone', 'talking', 'call'], location: 'indoor' },
  { description: 'Find a person drinking coffee', keywords: ['person', 'drinking', 'coffee', 'cup'], location: 'indoor' },
  { description: 'Find someone stretching', keywords: ['person', 'stretching', 'exercise', 'yoga'], location: 'indoor' },
  { description: 'Find someone painting', keywords: ['person', 'painting', 'art', 'canvas'], location: 'indoor' },
  { description: 'Find someone meditating', keywords: ['person', 'meditating', 'sitting', 'zen'], location: 'indoor' },
  { description: 'Find a person doing yoga', keywords: ['person', 'yoga', 'pose', 'stretch'], location: 'indoor' },
  { description: 'Find a person climbing', keywords: ['person', 'climbing', 'up', 'ascending'], location: 'indoor' },
  { description: 'Find a cat stretching', keywords: ['cat', 'stretching', 'yawn'], location: 'indoor' },
  { description: 'Find someone pushing a shopping cart', keywords: ['person', 'shopping cart', 'pushing'], location: 'indoor' },
  { description: 'Find a person with a camera', keywords: ['person', 'camera', 'photography'], location: 'indoor' },
  { description: 'Find a child blowing out candles', keywords: ['child', 'candles', 'blowing', 'birthday'], location: 'indoor' },
  { description: 'Find someone opening a gift', keywords: ['person', 'gift', 'opening', 'present'], location: 'indoor' },
  { description: 'Find a person clapping', keywords: ['person', 'clapping', 'hands', 'applause'], location: 'indoor' },
  { description: 'Find someone whispering', keywords: ['person', 'whispering', 'secret', 'ear'], location: 'indoor' },
  { description: 'Find someone checking their watch', keywords: ['person', 'watch', 'time', 'wrist'], location: 'indoor' },
  { description: 'Find a cat pouncing', keywords: ['cat', 'pouncing', 'jump', 'attack'], location: 'indoor' },
  { description: 'Find someone tying their shoes', keywords: ['person', 'tying', 'shoes', 'laces'], location: 'indoor' },
  { description: 'Find a person yawning', keywords: ['person', 'yawning', 'tired', 'mouth'], location: 'indoor' },
  { description: 'Find someone pointing', keywords: ['person', 'pointing', 'finger', 'direction'], location: 'indoor' },
  { description: 'Find someone sneezing', keywords: ['person', 'sneezing', 'achoo'], location: 'indoor' },
  { description: 'Find a dog barking', keywords: ['dog', 'barking', 'mouth open', 'vocal'], location: 'indoor' },
  { description: 'Find a person carrying a child', keywords: ['person', 'carrying', 'child', 'parent'], location: 'indoor' },
  { description: 'Find a cat grooming', keywords: ['cat', 'grooming', 'licking', 'cleaning'], location: 'indoor' },
  { description: 'Find a dog rolling over', keywords: ['dog', 'rolling', 'ground', 'back'], location: 'indoor' },
  { description: 'Find a dog catching a treat', keywords: ['dog', 'catching', 'treat', 'food'], location: 'indoor' },
  { description: 'Find someone balancing on one foot', keywords: ['person', 'balancing', 'one foot', 'standing'], location: 'indoor' },
  { description: 'Find a person blowing a kiss', keywords: ['person', 'blowing kiss', 'hand', 'lips'], location: 'indoor' },
  { description: 'Find someone piggyback riding', keywords: ['people', 'piggyback', 'carrying', 'back'], location: 'indoor' },
  { description: 'Find someone doing jumping jacks', keywords: ['person', 'jumping jacks', 'exercise', 'arms'], location: 'indoor' },
  { description: 'Find a dog fetching', keywords: ['dog', 'fetching', 'running', 'retrieving'], location: 'indoor' },
  { description: 'Find someone taking a bow', keywords: ['person', 'bow', 'bowing', 'bend'], location: 'indoor' },
  { description: 'Find a person doing lunges', keywords: ['person', 'lunges', 'exercise', 'leg'], location: 'indoor' },
  { description: 'Find a cat sleeping in the sun', keywords: ['cat', 'sleeping', 'sun', 'relaxed'], location: 'indoor' },
  { description: 'Find someone arm wrestling', keywords: ['people', 'arm wrestling', 'arms', 'table'], location: 'indoor' },
  { description: 'Find a cat hunting', keywords: ['cat', 'hunting', 'stalking', 'prey'], location: 'indoor' },
  { description: 'Find someone doing a handstand', keywords: ['person', 'handstand', 'upside down', 'hands'], location: 'indoor' },
  { description: 'Find someone folding laundry', keywords: ['person', 'folding', 'laundry', 'clothes'], location: 'indoor' },
  { description: 'Find someone washing dishes', keywords: ['person', 'washing', 'dishes', 'kitchen', 'sink'], location: 'indoor' },
  { description: 'Find someone brushing their teeth', keywords: ['person', 'brushing', 'teeth', 'toothbrush', 'bathroom'], location: 'indoor' },
  { description: 'Find someone vacuuming', keywords: ['person', 'vacuuming', 'vacuum', 'cleaning', 'floor'], location: 'indoor' },
  { description: 'Find someone playing with a cat', keywords: ['person', 'playing', 'cat', 'toy', 'pet'], location: 'indoor' },
  { description: 'Find someone writing at a desk', keywords: ['person', 'writing', 'desk', 'pen', 'paper'], location: 'indoor' },
  { description: 'Find someone putting on a coat', keywords: ['person', 'coat', 'putting on', 'jacket', 'wearing'], location: 'indoor' },
];

// Generate mission IDs and combine all missions
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

// Get missions by tier
export function getMissionsByTier(tier: Tier): Mission[] {
  return MISSIONS.filter(m => m.tier === tier);
}

// Get missions by tier and location
export function getMissionsByTierAndLocation(tier: Tier, location: 'indoor' | 'outdoor'): Mission[] {
  return MISSIONS.filter(m => m.tier === tier && m.location === location);
}

// Get random mission for a tier, using indoor/outdoor ratio
export function getRandomMission(tier: Tier): Mission {
  const outdoorChance = OUTDOOR_RATIO[tier];
  const roll = Math.random();
  const location: 'indoor' | 'outdoor' = roll < outdoorChance ? 'outdoor' : 'indoor';

  const pool = getMissionsByTierAndLocation(tier, location);

  // Fallback: if the pool is empty (shouldn't happen), pick from all tier missions
  if (pool.length === 0) {
    const allTierMissions = getMissionsByTier(tier);
    return allTierMissions[Math.floor(Math.random() * allTierMissions.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// Get mission by ID
export function getMissionById(id: string): Mission | undefined {
  return MISSIONS.find(m => m.id === id);
}
