export type Options = {
  containerId: string,
  boidLength: number,
  boidHeight: number,
  number: number,
  heatmapGridSize: number,
  background: number,

  heatmap: boolean,
  heatmapIncrease: number,
  heatmapAttenuation: number,

  mouseAsPredator: boolean,

  speed: number,
  turningSpeed: number,
  randomMoveChance: number,
  visionAngle: number,
  returnMargin: number,
  cooldown: number,

  radius: {
    [key: string]: number;
  },

  weight: {
    [key: string]: number;
  },
};

export type PointInfo = {
  isVisible: boolean,
  angle: number,
};

export type Vector = {
  x: number,
  y: number,
  rotation: number,
};

export type Force = {
  rotation: number,
  magnitude: number,
};

export type Neighbour = {
  x: number,
  y: number,
  rotation: number,
  magnitude: number,
};
