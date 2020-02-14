export type Options = {
  containerId: string,
  boidLength: number,
  boidHeight: number,
  number: number,

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
