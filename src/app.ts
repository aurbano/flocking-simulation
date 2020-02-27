import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';

const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') === '' || urlParams.get('debug') === 'true' ? true : false;
const heatmap = urlParams.get('heatmap') === '' || urlParams.get('heatmap') === 'true' ? true : false;


const options: Options = {
  containerId: 'flock',
  boidLength: 5,
  boidHeight: 10,
  number: debug ? 5 : 700,
  heatmapGridSize: 10,
  background: 0x111111,
  debug: debug,

  heatmap: heatmap,
  heatmapIncrease: 1,
  heatmapAttenuation: 1,

  speed: 1,
  turningSpeed: 100,
  visionAngle: 35,

  cohesionRadius: 400,
  alignmentRadius: 100,
  separationRadius: 30,
  predatorRadius: 400,

  cohesionForce: 0,
  separationForce: 0,
  alignmentForce: 0,
  predatorForce: 0,
  obstacleForce: 5,
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(
  options,
  renderer
);

renderer.start();
