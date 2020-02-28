import * as dat from "dat.gui";
import { Options } from "../model/types";
import { Renderer } from "./render";

export function setupGui(options: Options, renderer: Renderer) {
  const gui = new dat.GUI({
    name: "Setings",
    closed: false,
  });

  const core = gui.addFolder("Core");
  core.open();
  core.add(options, "boidLength", 1, 50, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "boidHeight", 1, 50, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "number", 1, 1000, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "heatmapGridSize", 1, 50, 1).onFinishChange(() => { renderer.reset(); });

  const general = gui.addFolder("General");
  general.open();
  general.add(options, "speed", 0, 10, 0.1).onChange(() => { renderer.updateSettings(); });
  general.add(options, "turningSpeed", 0, 100, 1);
  general.add(options, "visionAngle", 0, 180, 1);

  const heatmap = gui.addFolder("Heatmap");
  heatmap.open();
  heatmap.add(options, "heatmapIncrease", 0, 500, 0.1);
  heatmap.add(options, "heatmapAttenuation", 0, 1000, 1);

  const distances = gui.addFolder("Distances");
  distances.open();
  distances.add(options, "cohesionRadius", 0, 500, 1);
  distances.add(options, "separationRadius", 0, 500, 1);
  distances.add(options, "alignmentRadius", 0, 500, 1);
  distances.add(options, "predatorRadius", 0, 500, 1);

  const forces = gui.addFolder("Forces");
  forces.open();
  forces.add(options, "cohesionForce", 0, 100, 1);
  forces.add(options, "separationForce", 0, 100, 1);
  forces.add(options, "alignmentForce", 0, 100, 1);
  forces.add(options, "predatorForce", 0, 100, 1);
  forces.add(options, "obstacleForce", 0, 100, 1);

  const methods = {
    togglePause: () => {
      renderer.togglePause();
    }
  };

  gui.add(methods, "togglePause");

  gui.hide();

  return gui;
}
