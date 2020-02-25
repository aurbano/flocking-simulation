import * as dat from "dat.gui";
import { Options } from "../model/types";

export function setupGui(options: Options, togglePause: Function) {
  const gui = new dat.GUI({
    name: "Setings",
    closed: true
  });

  const general = gui.addFolder("General");
  general.open();
  general.add(options, "speed", 0, 25, 1);
  general.add(options, "turningSpeed", 1, 500, 1);
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
      togglePause();
    }
  };

  gui.add(methods, "togglePause");

  return gui;
}
