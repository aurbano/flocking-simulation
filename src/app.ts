import { Options } from './model/types';
import { Renderer } from './lib/render';
import { setupGui } from './lib/gui';

const options: Options = {
  containerId: 'flock',
  size: 2.5,
  number: 10000,
};

// Setup the Renderer
const renderer = new Renderer(options);

setupGui(options);

renderer.start();
