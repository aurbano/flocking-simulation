import * as PIXI from "pixi.js";

export const TYPES = {
  PREDATORS: 'predators',
  SEPARATION: 'separation',
  ALIGNMENT: 'alignment',
  COHESION: 'cohesion',
  OBSTACLES: 'obstacles',
};

type ColorMap = {
  [key: string]: number;
};

export const COLORS: ColorMap = {
  [TYPES.COHESION]: 0x666666,
  [TYPES.ALIGNMENT]: 0x509e02,
  [TYPES.SEPARATION]: 0xeb0000,
  [TYPES.PREDATORS]: 0xeb0000,
  [TYPES.OBSTACLES]: 0xeb0000,
};

export const UI_COLORS = {
  VISIBLE: 0x03b6fc,
  DESIRED: 0xf7b12f,
  NONE: 0x333333,
};

export const textStyle = new PIXI.TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: "#666666",
  wordWrap: true,
  wordWrapWidth: 440
});
