export type Options = {
  containerId: string,
  boidLength: number,
  boidHeight: number,
  number: number,
  heatmapGridSize: number,
  background: number,
  debug?: boolean,

  heatmap: boolean,
  heatmapIncrease: number,
  heatmapAttenuation: number,

  speed: number,
  turningSpeed: number,
  randomMoveChance: number,
  visionAngle: number,

  radius: {
    [key: string]: number;
  },

  weight: {
    [key: string]: number;
  },
};

export type Neighbour = {
  x: number,
  y: number,
  distance: number,
  rotation: number,
};
