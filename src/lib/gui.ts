import * as dat from 'dat.gui';
import { Options } from '../model/types';

export function setupGui(options: Options) {
  const gui = new dat.GUI({
    name: 'Setings',
    closed: true,
  });

  const rendering = gui.addFolder('Rendering');
  rendering.open();
  // rendering.add(options, 'resolution', 1, 50, 1).onChange(render);

  return gui;
}
