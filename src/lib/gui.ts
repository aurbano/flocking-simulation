import * as dat from "dat.gui";
import { Options } from "../model/types";
import { Renderer } from "./render";
import { TYPES } from "./constants";

export function setupGui(options: Options, renderer: Renderer) {
  const gui = new dat.GUI({
    name: "Setings",
    closed: false,
  });

  const core = gui.addFolder("Core (resets the simulation)");
  core.open();
  core.add(options, "boidLength", 1, 50, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "boidHeight", 1, 50, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "number", 1, 1000, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "heatmapGridSize", 1, 50, 1).onFinishChange(() => { renderer.reset(); });
  core.add(options, "debug").onFinishChange(() => { renderer.reset(); });
  core.add(options, "heatmap").onFinishChange(() => { renderer.reset(); });

  const general = gui.addFolder("General");
  general.open();
  general.add(options, "speed", 0, 10, 0.1).onChange(() => { renderer.updateSettings(); });
  general.add(options, "turningSpeed", 0, 100, 1);
  general.add(options, "visionAngle", 0, 180, 1);
  general.add(options, "randomMoveChance", 0, 100, 1);
  general.add(options, "returnMargin", 0, 1000, 1);
  general.add(options, "cooldown", 0, 1, 0.1);

  const heatmap = gui.addFolder("Heatmap");
  heatmap.open();
  heatmap.add(options, "heatmapIncrease", 0, 500, 0.1);
  heatmap.add(options, "heatmapAttenuation", 0, 1000, 1);

  const distances = gui.addFolder("Distances");
  distances.open();
  distances.add(options.radius, TYPES.COHESION, 0, 500, 1);
  distances.add(options.radius, TYPES.SEPARATION, 0, 500, 1);
  distances.add(options.radius, TYPES.ALIGNMENT, 0, 500, 1);
  distances.add(options.radius, TYPES.PREDATORS, 0, 500, 1);
  distances.add(options.radius, TYPES.OBSTACLES, 0, 500, 1);

  const forces = gui.addFolder("Forces");
  forces.open();
  forces.add(options.weight, TYPES.COHESION, 0, 100, 1);
  forces.add(options.weight, TYPES.SEPARATION, 0, 100, 1);
  forces.add(options.weight, TYPES.ALIGNMENT, 0, 100, 1);
  forces.add(options.weight, TYPES.PREDATORS, 0, 100, 1);
  forces.add(options.weight, TYPES.OBSTACLES, 0, 100, 1);

  const methods = {
    togglePause: () => {
      renderer.togglePause();
    }
  };

  gui.add(methods, "togglePause");

  gui.hide();

  return gui;
}
