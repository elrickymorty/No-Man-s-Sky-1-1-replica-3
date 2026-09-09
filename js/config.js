// ============ NO MAN'S SKY Réplica · world data ============

export const GAME = {
  CHUNK: 256,            // world units per chunk side
  CHUNK_SEG: 48,         // segments per chunk side (48*48 quads)
  RADIUS: 4,             // chunks loaded each direction (9x9)
  WALK: 6.5,
  SPRINT: 11.5,
  GRAVITY: 23,
  JUMP: 7.6,
  DAY_SECONDS: 24 * 60,  // one in-game day = 24 min real time
  START_TIME: 0.42,      // ~10:00
  FOG_DENSITY: 0.0016,
  MAX_BATTERY: 100,
};

// ---------------- BIOMES ----------------
// ground1/ground2: lowland → upland vertex colors
export const BIOMES = {
  prairie: {
    label: 'PRADERÍA',
    base: 7, mountain: 0.65,
    ground1: 0x55803e, ground2: 0x79a455, rock: 0x8a8172,
    snow: true, snowLine: 46,
    treeDensity: 0.17, treeTypes: ['tree_round', 'tree_cone'],
    rockDensity: 0.045, bushDensity: 0.09, crystalDensity: 0.003,
    resources: [['iron', 3], ['silicon', 3], ['carbon', 5], ['water', 4], ['copper', 2.4], ['manganese', 1]],
    toxicChance: 0.05,
    sky: { top: 0x28569b, mid: 0x79b7e6, bot: 0xd2e9f7 },
    fog: 0xcfe6f2,
    foliage: 0x3e7a2e,
    waterTint: 0x3f8fbf,
    faunaPalette: [0x7a9a52, 0x9ab26e, 0x5d8a63, 0xc9b98a],
    spaceColors: [0x3f7a3f, 0x79a455, 0x9ac46e],
  },
  desert: {
    label: 'DESERTO',
    base: 8.5, mountain: 0.8,
    ground1: 0xc9a35f, ground2: 0xe0c084, rock: 0xb08a56,
    snow: false, snowLine: 999,
    treeDensity: 0.028, treeTypes: ['cactus'],
    rockDensity: 0.06, bushDensity: 0.03, crystalDensity: 0.006,
    resources: [['salt', 4], ['iron', 3], ['silicon', 3], ['gold', 1.2], ['uranium', 0.8], ['copper', 2]],
    toxicChance: 0.06,
    sky: { top: 0x3a5a9e, mid: 0xd8c193, bot: 0xf0dcae },
    fog: 0xe8d2a4,
    foliage: 0x6a7a3a,
    waterTint: 0x3f7fa8,
    faunaPalette: [0xc9a86a, 0xb08a56, 0xe0c084],
    spaceColors: [0xc9a35f, 0xe0c084, 0xb08a56],
  },
  rocky: {
    label: 'MONTAÑOSO',
    base: 9, mountain: 1.0,
    ground1: 0x7d746a, ground2: 0x9a9086, rock: 0x6e655c,
    snow: true, snowLine: 29,
    treeDensity: 0.02, treeTypes: ['tree_cone'],
    rockDensity: 0.11, bushDensity: 0.02, crystalDensity: 0.004,
    resources: [['iron', 5], ['lead', 3], ['silicon', 2.5], ['titanium', 1.4], ['manganese', 2], ['uranium', 0.9]],
    toxicChance: 0.1,
    sky: { top: 0x2c3f66, mid: 0x8fa8c4, bot: 0xd8e4ee },
    fog: 0xd4dee8,
    foliage: 0x4a6a4a,
    waterTint: 0x3f6f9f,
    faunaPalette: [0x8a8178, 0x6e655c, 0xb0a898],
    spaceColors: [0x7d746a, 0x9a9086, 0x5a544c],
  },
  tundra: {
    label: 'TUNDRA',
    base: 6.5, mountain: 0.5,
    ground1: 0x9aa88a, ground2: 0xc4cdb8, rock: 0x7d8478,
    snow: true, snowLine: 24,
    treeDensity: 0.05, treeTypes: ['tree_cone'],
    rockDensity: 0.05, bushDensity: 0.05, crystalDensity: 0.005,
    resources: [['water', 5], ['carbon', 3], ['salt', 2.5], ['titanium', 1.2], ['silicon', 2]],
    toxicChance: 0.08,
    sky: { top: 0x2a4a7a, mid: 0x9fc0dd, bot: 0xe8f2f8 },
    fog: 0xe2eef5,
    foliage: 0x5a7a55,
    waterTint: 0x4a90c0,
    faunaPalette: [0xc4cdb8, 0x8a9a8a, 0xe8f0ea],
    spaceColors: [0xc4cdb8, 0x9aa88a, 0xe8f2f8],
  },
  swamp: {
    label: 'PANTANO',
    base: 5.2, mountain: 0.35,
    ground1: 0x4a5a35, ground2: 0x5f7042, rock: 0x5c5448,
    snow: false, snowLine: 999,
    treeDensity: 0.13, treeTypes: ['tree_round'],
    rockDensity: 0.035, bushDensity: 0.14, crystalDensity: 0.004,
    resources: [['carbon', 6], ['water', 6], ['manganese', 2.4], ['iron', 2], ['crystal', 0.9]],
    toxicChance: 0.3,
    sky: { top: 0x2e4a5a, mid: 0x7fa8a0, bot: 0xcfe0d8 },
    fog: 0xc4d8c8,
    foliage: 0x3a5a2e,
    waterTint: 0x3f7f8f,
    faunaPalette: [0x5f7042, 0x8a9a6a, 0x4a5a35],
    spaceColors: [0x4a5a35, 0x5f7042, 0x3a4a2e],
  },
  volcanic: {
    label: 'VOLCÁNICO',
    base: 8, mountain: 1.15,
    ground1: 0x3a3134, ground2: 0x5a4a44, rock: 0x2e282a,
    snow: false, snowLine: 999,
    treeDensity: 0.0, treeTypes: ['tree_dead'],
    rockDensity: 0.13, bushDensity: 0.0, crystalDensity: 0.02,
    resources: [['iron', 4], ['uranium', 2.6], ['titanium', 2.4], ['gold', 1.4], ['crystal', 2], ['silicon', 2]],
    toxicChance: 0.75,
    sky: { top: 0x331a1e, mid: 0x8a4a3a, bot: 0xd8906a },
    fog: 0xc07a5a,
    foliage: 0x2e282a,
    waterTint: 0x6a2a2a,
    faunaPalette: [0x8a4a3a, 0x5a3a30, 0xc07a5a],
    spaceColors: [0x5a4a44, 0x3a3134, 0x8a4a3a],
  },
  crystalline: {
    label: 'CRISTALINO',
    base: 7, mountain: 0.75,
    ground1: 0x6a4a8a, ground2: 0x9a6ab0, rock: 0x5c4478,
    snow: false, snowLine: 999,
    treeDensity: 0.0, treeTypes: ['mega_crystal'],
    rockDensity: 0.05, bushDensity: 0.06, crystalDensity: 0.03,
    resources: [['crystal', 7], ['silicon', 5], ['gold', 1.6], ['water', 2.4], ['uranium', 1]],
    toxicChance: 0.18,
    sky: { top: 0x2e1e5a, mid: 0x8a5ab0, bot: 0xe0a8e8 },
    fog: 0xd8b0e8,
    foliage: 0x9a6ab0,
    waterTint: 0x8a5ac0,
    faunaPalette: [0x9a6ab0, 0xe0a8e8, 0x6a4a8a],
    spaceColors: [0x9a6ab0, 0x6a4a8a, 0xe0a8e8],
  },
  frost: {
    label: 'HIELA',
    base: 6, mountain: 0.7,
    ground1: 0xb8ccd8, ground2: 0xe0eaf0, rock: 0x8a9aa8,
    snow: true, snowLine: 14,
    treeDensity: 0.03, treeTypes: ['tree_cone'],
    rockDensity: 0.06, bushDensity: 0.02, crystalDensity: 0.012,
    resources: [['water', 7], ['titanium', 2.6], ['salt', 3], ['silicon', 2], ['helium3', 0.7]],
    toxicChance: 0.15,
    sky: { top: 0x1e3a6a, mid: 0x7fa8d8, bot: 0xdceef8 },
    fog: 0xdceef8,
    foliage: 0x7a9ab0,
    waterTint: 0x5a9ac8,
    faunaPalette: [0xdceef8, 0x8aa8c8, 0xb8ccd8],
    spaceColors: [0xe0eaf0, 0xb8ccd8, 0x8aa8c8],
  },
};
export const BIOME_KEYS = Object.keys(BIOMES);
export const BIOME_WEIGHTS = [
  ['prairie', 24], ['desert', 16], ['rocky', 14], ['tundra', 10],
  ['swamp', 12], ['volcanic', 10], ['crystalline', 7], ['frost', 7],
];

// ---------------- RESOURCES ----------------
export const RESOURCES = {
  water:     { name: 'AGUA',       code: 'H2O', color: 0x4fc3ff },
  iron:      { name: 'HIERRO',     code: 'FE',  color: 0xd8d8ee },
  silicon:   { name: 'SILICIO',    code: 'SI',  color: 0xb06cf0 },
  carbon:    { name: 'CARBONO',    code: 'C',   color: 0x7a8a7a },
  gold:      { name: 'ORO',        code: 'AU',  color: 0xffd24a },
  copper:    { name: 'COBRE',      code: 'CU',  color: 0xff8a4a },
  manganese: { name: 'MANGANESO',  code: 'MN',  color: 0x7a9fc5 },
  titanium:  { name: 'TITANIO',    code: 'TI',  color: 0xa8c8e8 },
  lead:      { name: 'PLOMO',      code: 'PB',  color: 0x9aa8b8 },
  salt:      { name: 'SAL',        code: 'NA',  color: 0xf0f0e4 },
  uranium:   { name: 'URANIO',     code: 'U',   color: 0x6aff8a },
  crystal:   { name: 'CRISTAL',    code: 'CR',  color: 0xe07aff },
  helium3:   { name: 'HELI0-3',    code: 'HE3', color: 0x7affd2 },
};

// ---------------- RECIPES ----------------
export const RECIPES = [
  { id: 'solar',    name: 'PANEL SOLAR',        cost: { silicon: 10, carbon: 5 },          desc: 'Se instala en modo construcción. Recarga la batería si estás cerca.' },
  { id: 'battery',  name: 'MÓDULO DE BATERÍA',  cost: { silicon: 10, gold: 5 },            desc: 'Aumenta la batería máxima del traje en un 50%.' },
  { id: 'o2tank',   name: 'TANQUE DE OXÍGENO',  cost: { carbon: 10, water: 10 },           desc: 'Se consume automáticamente al agotarse el O2 en atmósferas tóxicas.' },
  { id: 'suit2',    name: 'TRAJE EXPLORADOR MK-II', cost: { gold: 10, titanium: 10 },      desc: 'Recolorea tu traje y aumenta tu velocidad un 10%.' },
  { id: 'floor',    name: 'SUELO',              cost: { silicon: 10 },                     desc: 'Placa de suelo modular (4×4 m).' },
  { id: 'wall',     name: 'MURO',               cost: { iron: 10, silicon: 5 },            desc: 'Pared modular (4×4 m).' },
  { id: 'roof',     name: 'TECHO',              cost: { silicon: 10 },                     desc: 'Tejado modular (4×4 m).' },
  { id: 'door',     name: 'PUERTA',             cost: { iron: 10, gold: 5 },               desc: 'Puerta automática para tus módulos.' },
  { id: 'bunker',   name: 'BÚNKER',             cost: { iron: 20, silicon: 10 },           desc: 'Habitación cerrada con puerta integrada.' },
  { id: 'beacon',   name: 'BALIZA',             cost: { titanium: 10, gold: 5 },           desc: 'Faro luminoso que marca tu base.' },
  { id: 'table',    name: 'MESA',               cost: { iron: 5, carbon: 5 },              desc: 'Mesa de trabajo para tus investigaciones.' },
  { id: 'chair',    name: 'SILLA',              cost: { iron: 5, carbon: 5 },              desc: 'Para descansar entre un salto y otro.' },
];

// ---------------- BUILDABLES (visual size in world units) ----------------
export const BUILDABLES = {
  floor:  { name: 'SUELO',  size: [4, 0.6, 4] },
  wall:   { name: 'MURO',   size: [4, 4, 1] },
  roof:   { name: 'TECHO',  size: [4, 0.7, 4] },
  door:   { name: 'PUERTA', size: [3, 4, 1] },
  bunker: { name: 'BÚNKER', size: [4, 5, 4] },
  beacon: { name: 'BALIZA', size: [2, 7, 2] },
  solar:  { name: 'PANEL SOLAR', size: [3, 3.4, 3] },
  table:  { name: 'MESA',   size: [2, 1.6, 2] },
  chair:  { name: 'SILLA',  size: [1.6, 2, 1.6] },
};

// ---------------- NAMES ----------------
export const SYL_A = ['Ae','Ag','Al','An','Ar','As','Aur','Bel','Cal','Cor','Cyr','Dra','Ere','Eri','Gal','Hel','Hyr','Ith','Ira','Jor','Kai','Kor','Leu','Lyr','Ma','Mel','Mer','Mor','Myr','Ner','Nor','Oph','Or','Phe','Pha','Pyra','Qua','Ra','Rha','Sel','Ser','Syl','Ta','Tel','Ter','Tha','Tor','Va','Ver','Ves','Vor','Xan','Xar','Yth','Zen'];
export const SYL_M = ['th','a','e','o','i','r','s','m','n','l','v','k','d','g','ph','ar','or','es','an','el'];
export const SYL_B = ['a','ea','ia','oa','ua','is','os','us','ix','ion','aris','aeth','or','um','ax','es','ei','ara','eon','ia','us'];
export const SYSTEM_NAMES = ['Aldrin','Armstrong','Bell','Clarke','Copernicus','Curie','Daedalus','Einstein','Faraday','Fermi','Galilei','Gauss','Gödel','Hale','Halden','Halley','Herschel','Hubble','Kant','Kepler','Lagrange','Laplace','Maupertuis','Moebius','Newton','Poincaré','Riemann','Rutherford','Sagan','Turing','Vesalius','Weierstrass','Wright','Aristarchus','Babbage','Chandra','Dante','Fresnel','Lavoisier','Olympia'];
export const CREATURE_INDIV = ['Aurelia','Barnabas','Celestine','Dante','Esme','Felix','Greta','Hiro','Inés','Juno','Klaus','Luna','Milo','Nadia','Orion','Pip','Quill','Rhea','Sable','Tessa','Ulric','Vera','Wren','Xeno'];
export const CREATURE_BEHAV = ['Vagabundo', 'Fugitivo', 'Aislado', 'Comunal', 'Errante'];

// ---------------- CREATURE SPECIES ----------------
export const CREATURES = {
  mollusc:    { name: 'MOLUSCO',        speed: 0.6,  flee: 0,   size: 1.6 },
  runner:     { name: 'CORREDOR',       speed: 5.2,  flee: 16,  size: 1.4 },
  terrorbird: { name: 'AVE DEL TERROR', speed: 2.4,  flee: 24,  size: 1.2 },
  shrieker:   { name: 'GRIETERO',       speed: 3.4,  flee: 20,  size: 1.1 },
};
export const CREATURE_KEYS = Object.keys(CREATURES);

// ---------------- STAR COLORS (blackbody-ish) ----------------
export const STAR_COLORS = [0xff6a3a, 0xffa04a, 0xffe08a, 0xfff4e0, 0xdfe8ff, 0xaac4ff, 0x8ab0ff];
