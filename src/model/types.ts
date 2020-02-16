export type Options = {
  containerId: string,
  boidLength: number,
  boidHeight: number,
  number: number,
  gridSize: number,
  background: number,

  gridIncrease: number,
  gridAttenuation: number,

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
