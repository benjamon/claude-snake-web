export const COLS = 16, ROWS = 16;
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbw_CY1x56zs6NPG7WMk3Bjf9mudcZqEFtkGV-tsUAa03iBXoWOd2mRdYoVLb8zRBEm4/exec';
export const PORTAL_COLORS = [[60,120,255],[255,150,20],[200,40,220]];

export const C = {
  BG:         [18, 18, 18],
  BOARD_BG:   [24, 24, 24],
  BOARD_BOR:  [45, 65, 45],
  GRID:       [36, 36, 36],
  HEAD:       [110,235,110],
  BODY:       [55, 175, 55],
  FOOD:       [230, 75, 75],
  UI_BG:      [8,   8,  8],
  DIM:        [150,150,150],
  BLOCK:      [90,  30, 30],
  BLOCK_MARK: [185, 55, 55],
  TUNNEL_OUT: [139, 90, 43],
  TUNNEL_IN:  [65,  35, 12],
  PHASE_BODY: [55, 155,205],
  PHASE_HEAD: [120,210,255],
  GHOST:      [40, 100,140],
  WALL:       [255,160, 40],
};

export const C_LABELS = {
  BG:'Background', BOARD_BG:'Board BG', BOARD_BOR:'Board Border', GRID:'Grid',
  HEAD:'Head', BODY:'Body', FOOD:'Food', UI_BG:'UI Bar', DIM:'Dim Text',
  BLOCK:'Death Block', BLOCK_MARK:'Block Mark', TUNNEL_OUT:'Tunnel Out',
  TUNNEL_IN:'Tunnel In', PHASE_BODY:'Phase Body', PHASE_HEAD:'Phase Head',
  GHOST:'Ghost Trail', WALL:'Wall Warning',
};

export const C_KEYS = Object.keys(C);

export const PALETTES = [
  { name: 'Classic', data: null },
  { name: 'Neon', data: {
    BG:[5,0,15],BOARD_BG:[8,5,20],BOARD_BOR:[80,0,200],GRID:[15,8,35],
    HEAD:[0,255,120],BODY:[0,180,80],FOOD:[255,0,120],UI_BG:[5,0,10],DIM:[100,0,200],
    BLOCK:[140,0,80],BLOCK_MARK:[200,0,100],TUNNEL_OUT:[255,140,0],TUNNEL_IN:[120,60,0],
    PHASE_BODY:[0,150,255],PHASE_HEAD:[100,220,255],GHOST:[0,100,200],WALL:[255,100,0],
  }},
  { name: 'Forest', data: {
    BG:[5,12,5],BOARD_BG:[8,18,8],BOARD_BOR:[40,80,30],GRID:[12,25,12],
    HEAD:[120,220,60],BODY:[80,160,40],FOOD:[220,80,30],UI_BG:[5,10,5],DIM:[80,120,60],
    BLOCK:[140,40,20],BLOCK_MARK:[180,80,20],TUNNEL_OUT:[100,160,60],TUNNEL_IN:[40,80,20],
    PHASE_BODY:[40,200,120],PHASE_HEAD:[100,255,180],GHOST:[30,150,80],WALL:[200,160,40],
  }},
];
PALETTES[0].data = Object.fromEntries(C_KEYS.map(k => [k, [...C[k]]]));

export function applyPalette(idx) {
  const p = PALETTES[idx].data;
  for (const k of C_KEYS) if (p[k]) C[k] = [...p[k]];
}

export function rgb(key, a = 1) {
  const [r, g, b] = C[key];
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}
export function rgbA(arr, a = 1) {
  const [r, g, b] = arr;
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}
export function brighten(arr, t) {
  return arr.map(v => Math.min(255, Math.round(v + (255 - v) * t)));
}
