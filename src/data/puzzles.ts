export interface PuzzleDefinition {
  id: string;
  title: string;
  words: [string, string, string, string, string, string];
  clues: [string, string, string, string];
  tileRack: string[];
}

const DEC_LETTERS = ['A', 'E', 'I', 'O', 'U', 'R', 'S', 'T', 'L', 'N', 'D', 'C', 'M', 'P', 'B', 'H', 'K', 'G', 'F', 'W'];

function buildTileRack(words: string[], extras: string[]): string[] {
  const set = new Set<string>();
  for (const w of words) {
    for (const ch of w) set.add(ch);
  }
  for (const ch of extras) {
    if (set.size >= 12) break;
    set.add(ch);
  }
  for (const ch of DEC_LETTERS) {
    if (set.size >= 12) break;
    set.add(ch);
  }
  return Array.from(set).sort();
}

export const PUZZLES: PuzzleDefinition[] = [
  {
    id: 'puzzle-01',
    title: 'Thermal Shift',
    words: ['COLD', 'BOLD', 'BALD', 'BARD', 'WARD', 'WARM'],
    clues: [
      'Courageous and daring',
      'Lacking hair or covering',
      'Wandering poet or minstrel',
      'Hospital wing or protective watch',
    ],
    tileRack: buildTileRack(['COLD', 'BOLD', 'BALD', 'BARD', 'WARD', 'WARM'], ['H', 'K', 'S', 'T', 'E']),
  },
  {
    id: 'puzzle-02',
    title: 'Anatomy Bridge',
    words: ['HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL'],
    clues: [
      'Recover from an injury',
      'Deep blue-green color',
      'Communicate or narrate',
      'Of great vertical height',
    ],
    tileRack: buildTileRack(['HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL'], ['S', 'R', 'N', 'B', 'W']),
  },
  {
    id: 'puzzle-03',
    title: 'Hearth & Craft',
    words: ['FIRE', 'WIRE', 'WORE', 'WORK', 'FORK', 'FORM'],
    clues: [
      'Thin flexible metal strand',
      'Had on as clothing',
      'Mental or physical effort',
      'Pronged dining utensil',
    ],
    tileRack: buildTileRack(['FIRE', 'WIRE', 'WORE', 'WORK', 'FORK', 'FORM'], ['L', 'T', 'C', 'D', 'P']),
  },
  {
    id: 'puzzle-04',
    title: 'Coastline Turn',
    words: ['LOVE', 'COVE', 'CORE', 'CARE', 'HARE', 'HATE'],
    clues: [
      'Small sheltered coastal bay',
      'Central innermost part',
      'Provide attention or concern',
      'Swift long-eared mammal',
    ],
    tileRack: buildTileRack(['LOVE', 'COVE', 'CORE', 'CARE', 'HARE', 'HATE'], ['D', 'M', 'S', 'B', 'N']),
  },
  {
    id: 'puzzle-05',
    title: 'Harbor Crossing',
    words: ['ROOT', 'BOOT', 'BOAT', 'BEAT', 'FEAT', 'FEAR'],
    clues: [
      'Sturdy ankle footwear',
      'Small vessel for water',
      'Rhythmic pulse or strike',
      'Daring or skillful achievement',
    ],
    tileRack: buildTileRack(['ROOT', 'BOOT', 'BOAT', 'BEAT', 'FEAT', 'FEAR'], ['S', 'L', 'H', 'M', 'C']),
  },
  {
    id: 'puzzle-06',
    title: 'Market Trail',
    words: ['LOST', 'COST', 'CAST', 'CART', 'PART', 'PARK'],
    clues: [
      'Price paid for something',
      'Group of actors in a play',
      'Two-wheeled hand wagon',
      'Component piece of a whole',
    ],
    tileRack: buildTileRack(['LOST', 'COST', 'CAST', 'CART', 'PART', 'PARK'], ['D', 'M', 'F', 'B', 'E']),
  },
  {
    id: 'puzzle-07',
    title: 'Atelier Bench',
    words: ['WORK', 'WORE', 'MORE', 'MARE', 'MAKE', 'CAKE'],
    clues: [
      'Had on as clothing',
      'Greater in quantity',
      'Adult female horse',
      'Create or assemble',
    ],
    tileRack: buildTileRack(['WORK', 'WORE', 'MORE', 'MARE', 'MAKE', 'CAKE'], ['L', 'T', 'S', 'D', 'B']),
  },
  {
    id: 'puzzle-08',
    title: 'Stagecraft',
    words: ['STAR', 'STAY', 'SLAY', 'CLAY', 'CLAP', 'CLIP'],
    clues: [
      'Remain in one place',
      'Overwhelm with amusement',
      'Moldable earthy material',
      'Strike palms together',
    ],
    tileRack: buildTileRack(['STAR', 'STAY', 'SLAY', 'CLAY', 'CLAP', 'CLIP'], ['B', 'M', 'O', 'E', 'D']),
  },
  {
    id: 'puzzle-09',
    title: 'Vault Ledger',
    words: ['GOLD', 'BOLD', 'BOND', 'FOND', 'FIND', 'MIND'],
    clues: [
      'Confident and vivid',
      'Strong unifying connection',
      'Having affection for',
      'Discover after searching',
    ],
    tileRack: buildTileRack(['GOLD', 'BOLD', 'BOND', 'FOND', 'FIND', 'MIND'], ['S', 'W', 'R', 'A', 'K']),
  },
  {
    id: 'puzzle-10',
    title: 'Tide & Timber',
    words: ['RAIN', 'MAIN', 'MAIL', 'SAIL', 'SOIL', 'SOUL'],
    clues: [
      'Primary or principal',
      'Letters and parcels',
      'Canvas sheet catching wind',
      'Dark earth for planting',
    ],
    tileRack: buildTileRack(['RAIN', 'MAIN', 'MAIL', 'SAIL', 'SOIL', 'SOUL'], ['T', 'P', 'C', 'D', 'E']),
  },
  {
    id: 'puzzle-11',
    title: 'Clockwork',
    words: ['TIME', 'DIME', 'DOME', 'HOME', 'HOLE', 'HOLD'],
    clues: [
      'Ten-cent silver coin',
      'Rounded vault roof',
      'Place of residence',
      'Hollow opening or gap',
    ],
    tileRack: buildTileRack(['TIME', 'DIME', 'DOME', 'HOME', 'HOLE', 'HOLD'], ['S', 'R', 'A', 'B', 'N']),
  },
  {
    id: 'puzzle-12',
    title: 'Pressroom',
    words: ['WOOD', 'GOOD', 'GOAD', 'LOAD', 'LEAD', 'READ'],
    clues: [
      'Virtuous or high quality',
      'Prod or spur into action',
      'Heavy cargo carried',
      'Guide the way forward',
    ],
    tileRack: buildTileRack(['WOOD', 'GOOD', 'GOAD', 'LOAD', 'LEAD', 'READ'], ['M', 'S', 'H', 'B', 'T']),
  },
  {
    id: 'puzzle-13',
    title: 'Studio Pigments',
    words: ['BLUE', 'GLUE', 'GLUT', 'GOUT', 'BOUT', 'BOAT'],
    clues: [
      'Sticky bonding adhesive',
      'Excessive oversupply',
      'Painful joint condition',
      'Brief period or match',
    ],
    tileRack: buildTileRack(['BLUE', 'GLUE', 'GLUT', 'GOUT', 'BOUT', 'BOAT'], ['R', 'S', 'M', 'C', 'D']),
  },
  {
    id: 'puzzle-14',
    title: 'Crown & Choir',
    words: ['KING', 'RING', 'SING', 'SINK', 'SILK', 'MILK'],
    clues: [
      'Circular band of metal',
      'Make musical vocal tones',
      'Basin with a faucet',
      'Smooth lustrous fiber',
    ],
    tileRack: buildTileRack(['KING', 'RING', 'SING', 'SINK', 'SILK', 'MILK'], ['W', 'B', 'T', 'A', 'E']),
  },
];

// Anchor epoch: 2026-01-01 = Puzzle #1
const EPOCH_MS = Date.UTC(2026, 0, 1);

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPuzzleNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const targetMs = Date.UTC(y, m - 1, d);
  const diffDays = Math.floor((targetMs - EPOCH_MS) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

export function getDailyPuzzle(dateKey: string): { puzzle: PuzzleDefinition; puzzleNumber: number } {
  const puzzleNumber = getPuzzleNumber(dateKey);
  // Offset so 2026-11-26 (#330) starts on puzzle-01 ('Thermal Shift': COLD -> WARM)
  const index = ((puzzleNumber - 330) % PUZZLES.length + PUZZLES.length) % PUZZLES.length;
  return {
    puzzle: PUZZLES[index],
    puzzleNumber,
  };
}
