import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';

const options: Options = {
  containerId: 'flock',
  boidLength: 5,
  boidHeight: 10,
  number: 5,
  heatmapGridSize: 10,
  background: 0x111111,
  debug: true,

  heatmap: false,
  heatmapIncrease: 1,
  heatmapAttenuation: 1,

  speed: 1,
  visionAngle: 45,

  cohesionRadius: 400,
  alignmentRadius: 60,
  separationRadius: 20,
  predatorRadius: 0,

  cohesionForce: 5,
  separationForce: 25,
  alignmentForce: 50,
  predatorForce: 60,
  obstacleForce: 20,
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(options);

renderer.start();
