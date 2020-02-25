import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';

const options: Options = {
  containerId: 'flock',
  boidLength: 5,
  boidHeight: 10,
  number: 3,
  heatmapGridSize: 10,
  background: 0x111111,
  debug: true,

  heatmap: false,
  heatmapIncrease: 1,
  heatmapAttenuation: 1,

  speed: 1,
  visionAngle: 35,

  cohesionRadius: 400,
  alignmentRadius: 60,
  separationRadius: 20,
  predatorRadius: 0,

  cohesionForce: 0,
  separationForce: 0,
  alignmentForce: 0,
  predatorForce: 0,
  obstacleForce: 0,
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(options, renderer.togglePause);

renderer.start();
