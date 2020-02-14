import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';

const options: Options = {
  containerId: 'flock',
  boidLength: 5,
  boidHeight: 10,
  number: 350,

  speed: 3,

  cohesionRadius: 130,
  alignmentRadius: 25,
  separationRadius: 10,
  predatorRadius: 150,

  cohesionForce: 10,
  separationForce: 25,
  alignmentForce: 50,
  predatorForce: 60,
  obstacleForce: 20,
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(options);

renderer.start();
