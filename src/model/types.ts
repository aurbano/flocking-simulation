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

  cohesionRadius: number,
  separationRadius: number,
  alignmentRadius: number,
  predatorRadius: number,

  cohesionForce: number,
  separationForce: number,
  alignmentForce: number,
  predatorForce: number,
  obstacleForce: number,
};
