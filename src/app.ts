import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';
import { TYPES } from './lib/constants';

const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') === '' || urlParams.get('debug') === 'true' ? true : false;
const heatmap = urlParams.get('heatmap') === '' || urlParams.get('heatmap') === 'true' ? true : false;


const options: Options = {
  containerId: 'flock',
  boidLength: 7,
  boidHeight: 12,
  number: debug ? 5 : 150,
  heatmapGridSize: 10,
  background: null,
  debug: debug,

  heatmap: heatmap,
  heatmapIncrease: 50,
  heatmapAttenuation: 100,

  speed: debug? 2 : 4,
  turningSpeed: debug ? 2 : 10,
  visionAngle: 45,
  randomMoveChance: 10,
  returnMargin: 100,
  cooldown: 0.5,

  radius: {
    [TYPES.COHESION]: 400,
    [TYPES.ALIGNMENT]: 100,
    [TYPES.SEPARATION]: 30,
    [TYPES.PREDATORS]: 200,
    [TYPES.OBSTACLES]: 50,
  },

  weight: {
    [TYPES.COHESION]: 10,
    [TYPES.ALIGNMENT]: 25,
    [TYPES.SEPARATION]: 50,
    [TYPES.PREDATORS]: 60,
    [TYPES.OBSTACLES]: 20,
  },
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(
  options,
  renderer
);

renderer.start();
