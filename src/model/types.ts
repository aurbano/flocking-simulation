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

  speed: number,

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
