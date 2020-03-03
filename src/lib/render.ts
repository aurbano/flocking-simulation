import * as PIXI from "pixi.js";
import Stats from "stats.js";

import { Options, Neighbour, Force } from "../model/types";
import { Util } from "./util";
import { COLORS, UI_COLORS, TYPES, BUILD_ENV } from "./constants";
import { Boid } from "../model/boid";

export class Renderer {
  private app: PIXI.Application;
  private maxX: number;
  private maxY: number;
  private maxD: number; // the max of both axis

  private boids: Boid[] = [];
  private boidTexture: PIXI.Texture;
  private boidContainer: PIXI.Container;

  private heatmapTexture: PIXI.Texture;
  private heatmapContainer: PIXI.ParticleContainer;
  private heatmapCells: PIXI.Sprite[][] = [];
  private heatmapHistory: number[][] = [];
  private heatmapMax: number = 10;

  private stats: Stats;

  // store the radius^2 for speed
  private radius: {
    [key: string]: number;
  };

  constructor(private options: Options) {
    this.app = new PIXI.Application({
      resizeTo: window,
      resolution: devicePixelRatio,
      autoDensity: true,
      transparent: options.background === null,
      backgroundColor: options.background
    });

    this.maxX = this.app.screen.width;
    this.maxY = this.app.screen.height;
    this.maxD = Math.max(this.maxX, this.maxY);

    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    this.reset();
    this.updateSettings();

    // Render the app
    document
      .getElementById(this.options.containerId)
      .appendChild(this.app.view);

    // Pause on spacebar
    document.body.onkeyup = (e: KeyboardEvent) => {
      if (e.keyCode == 32) {
        this.togglePause();
      }
    };

    // Setup animation loop
    this.app.ticker.add(delta => {
      this.stats.begin();

      this.cooldownHeatmap();
      this.updateBoids(delta);

      this.stats.end();
    });
  }

  public reset = () => {
    this.stop();

    this.radius = {};
    Object.values(TYPES).forEach(type => {
      this.radius[type] = Math.pow(this.options.radius[type], 2);
    });

    this.app.stage.removeChildren();
    this.boids = [];

    if (!(BUILD_ENV === 'development')) {
      this.boidContainer = new PIXI.ParticleContainer(this.options.number, {
        position: true,
        rotation: true,
        tint: true
      });
    } else {
      this.boidContainer = new PIXI.Container();
    }

    this.boidContainer.zIndex = 2;
    this.app.stage.addChild(this.boidContainer);

    this.initBoidTexture();
    this.initHeatmap();

    // Initialize boids
    for (let i = 0; i < this.options.number; i++) {
      const boid = new Boid(this.options, this.maxX, this.maxY, this.boidTexture);

      this.boidContainer.addChild(boid);
      this.boids.push(boid);

      this.updateHeatmapCell(boid.x, boid.y);
    }

    // Make sure everything is ready to render again
    setTimeout(() => {
      this.start();
    }, 100);
  }

  public start() {
    this.app.ticker.start();
  }

  public stop() {
    this.app.ticker.stop();
  }

  public togglePause = () => {
    this.app.ticker.started ? this.stop() : this.start();
  };

  public updateSettings = () => {
    this.app.ticker.speed = this.options.speed;
  };

  private updateBoids(delta: number) {
    const totalBoids = this.boids.length;

    // Types for which we care about neighbours
    const neighbourTypes = [
      TYPES.SEPARATION,
      TYPES.ALIGNMENT,
      TYPES.COHESION,
    ];

    for (let i = 0; i < totalBoids; i++) {
      const boid = this.boids[i];
      (BUILD_ENV === 'development') && boid.debugLog(`[${i}]`);
      boid.tint = UI_COLORS.NONE;

      // Forces that determine flocking
      const forces: {
        [key: string]: Force,
      } = {};
      const neighbours: any = {};

      Object.values(TYPES).forEach(type => {
        forces[type] = {
          rotation: null,
          magnitude: boid.desiredVector.magnitude,
        };
        neighbours[type] = [];
      });

      (BUILD_ENV === 'development') && boid.resetDebug();

      // Iterate over the rest of the boids to find neighbours
      for (let a = 0; a < totalBoids; a++) {
        if (a === i) {
          continue;
        }
        const neighbourBoid = this.boids[a];

        const distance = Util.distance(boid, neighbourBoid, this.options.radius[TYPES.COHESION]);
        if (distance === null) {
          continue;
        }

        const neighbourCoords = boid.getNeighbourCoords(neighbourBoid);
        const neighbourInfo = boid.getPointInfo(neighbourCoords.x, neighbourCoords.y);

        if (!neighbourInfo.isVisible) {
          continue;
        }

        const neighbour: Neighbour = {
          x: neighbourBoid.x,
          y: neighbourBoid.y,
          rotation: neighbourBoid.rotation,
          magnitude: neighbourBoid.desiredVector.magnitude,
        };
        
        (BUILD_ENV === 'development') && boid.drawDebugVector(Math.PI / 2 - neighbourInfo.angle, Math.sqrt(distance), UI_COLORS.VISIBLE, Util.fade(distance, this.maxD) * 0.2);

        for (let type of neighbourTypes) {
          if (distance < this.radius[type]) {
            neighbours[type].push(neighbour);
            (BUILD_ENV === 'development') && boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS[type], Util.fade(distance, this.radius[type]) * 0.5, 2);
          }
        }
      }

      // cohesion makes it want to go towards neighbours
      if (neighbours[TYPES.COHESION].length > 0) {
        boid.tint = COLORS[TYPES.COHESION];
        const weightedVector = Util.getNeighboursWeightedVector(neighbours[TYPES.COHESION], boid);
        forces[TYPES.COHESION].rotation = weightedVector.rotation;

        // linear force for cohesion
        const cohesionDistance = Util.distance(weightedVector, boid, this.options.radius[TYPES.COHESION]);
        forces[TYPES.COHESION].magnitude = Math.max(
          forces[TYPES.COHESION].magnitude,
          0.5 + cohesionDistance / this.radius[TYPES.COHESION]
        );
      }

      // alignment makes it want to fly in the same rotation
      if (neighbours[TYPES.ALIGNMENT].length > 0) {
        boid.tint = COLORS[TYPES.ALIGNMENT];
        // calculate their average direction
        let rotations = 0;
        let magnitudes = 0;
        neighbours[TYPES.ALIGNMENT].forEach((each: Neighbour) => {
          rotations += each.rotation;
          magnitudes += each.magnitude;
        });
        const avgRotation = rotations / neighbours[TYPES.ALIGNMENT].length;
        const avgMagnitude = magnitudes / neighbours[TYPES.ALIGNMENT].length;
        forces[TYPES.ALIGNMENT].rotation = avgRotation;
        forces[TYPES.ALIGNMENT].magnitude = avgMagnitude;
      }

      // separation makes it want to fly away from neighbours
      if (neighbours[TYPES.SEPARATION].length > 0) {
        boid.tint = COLORS[TYPES.SEPARATION];
        const weightedVector = Util.getNeighboursWeightedVector(neighbours[TYPES.COHESION], boid);
        forces[TYPES.SEPARATION].rotation = weightedVector.rotation - 3 * Math.PI / 2;
        forces[TYPES.SEPARATION].magnitude = Math.max(1.5, forces[TYPES.SEPARATION].magnitude);
      }

      // Set the mouse as a predator
      if (this.options.mouseAsPredator) {
        const mouseCoords = this.app.renderer.plugins.interaction.mouse.global;
        const mouseDistance = Util.distance(mouseCoords, boid, this.options.radius[TYPES.PREDATORS]);
        if (mouseDistance !== null && mouseDistance < this.radius[TYPES.PREDATORS]) {
          boid.tint = COLORS[TYPES.PREDATORS];

          if (BUILD_ENV === 'development') {
            const localMouseCoords = this.app.renderer.plugins.interaction.mouse.getLocalPosition(boid);
            boid.drawDebugLine(localMouseCoords.x, localMouseCoords.y, COLORS[TYPES.PREDATORS], Util.fade(mouseDistance, this.radius[TYPES.PREDATORS]), 2);
          }
          
          forces[TYPES.PREDATORS].rotation = Util.unwrap(boid.getAngleToPoint(mouseCoords.x - boid.x, mouseCoords.y - boid.y) - 3 * Math.PI / 2);
          forces[TYPES.PREDATORS].magnitude = Math.max(
            forces[TYPES.PREDATORS].magnitude,
            Util.expDecay(mouseDistance, 1, this.radius[TYPES.PREDATORS] * 0.7, 5)
          );
        }
      }

      let totalRotation = 0;
      let totalWeight = 0;
      let totalMagnitude = 0;

      Object.values(TYPES).forEach(type => {
        if (forces[type].rotation === null) {
          return;
        }
        // add rotation
        const weight = this.options.weight[type];
        totalRotation += weight * forces[type].rotation;
        totalWeight += weight;

        // add magnitude
        totalMagnitude += weight * forces[type].magnitude;
      });

      let newRotation = totalWeight > 0 ? totalRotation / totalWeight : boid.desiredVector.rotation;
      let newMagnitude = totalWeight > 0 ? totalMagnitude / totalWeight : boid.desiredVector.magnitude;

      if (newRotation - boid.desiredVector.rotation < 0.01) {
        // no change, check if we're out of bounds to start heading back in
        if (boid.x <= -this.options.returnMargin || boid.y <= -this.options.returnMargin ||
            boid.x >= this.maxX + this.options.returnMargin || boid.y >= this.maxY + this.options.returnMargin) {

          // lets make them return to a random point inside the screen + margin
          const newX = Math.random() * (this.maxX - 2 * this.options.returnMargin) + this.options.returnMargin;
          const newY = Math.random() * (this.maxY - 2 * this.options.returnMargin) + this.options.returnMargin;
          newRotation = Util.unwrap(boid.getAngleToPoint(newX - boid.x, newY - boid.y) - Math.PI / 2);
        }

        // cool down the magnitude
        if (boid.desiredVector.magnitude > 1) {
          newMagnitude = Math.max(1, boid.desiredVector.magnitude - this.options.cooldown / 100);
        }
      }

      boid.desiredVector.rotation = newRotation;
      boid.desiredVector.magnitude = newMagnitude;

      // bit of random movement
      if (Math.random() * 100 < this.options.randomMoveChance) {
        boid.desiredVector.rotation += (Math.random() - 0.5) * Math.PI / 20;
      }
      boid.desiredVector.rotation = Util.unwrap(boid.desiredVector.rotation);

      // Calculate the difference between the angles
      let diff = boid.desiredVector.rotation - boid.rotation;
      diff = (diff + Math.PI) % (2 * Math.PI) - Math.PI;
      diff = diff < -Math.PI ? diff + 2 * Math.PI : diff;

      const absDiff = Math.abs(diff);
      if (absDiff > 0) {
        const direction = absDiff / diff;
        const turnAmount = Math.min(absDiff, 0.01 * this.options.turningSpeed * boid.desiredVector.magnitude);
        boid.rotation = Util.unwrap(boid.rotation + direction * turnAmount);
      }

      // Now use the angle and the speed to calculate dx and dy
      const dx = Math.sin(boid.rotation) * delta * boid.desiredVector.magnitude;
      const dy = Math.cos(boid.rotation) * delta * boid.desiredVector.magnitude;

      boid.x -= dx;
      boid.y += dy;

      if (this.options.heatmap) {
        boid.tint = 0xffffff;
      }

      this.updateHeatmapCell(boid.x, boid.y);
    }
  }

  private initBoidTexture() {
    // Prepare the boid texture for sprites
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xffffff);
    graphics.lineStyle(0);
    if (this.options.heatmap) {
      graphics.lineStyle(2, 0xffffff);
    }
    graphics.drawPolygon([
      new PIXI.Point(this.options.boidLength / 2, this.options.boidHeight),
      new PIXI.Point(0, 0),
      new PIXI.Point(this.options.boidLength, 0)
    ]);
    graphics.endFill();

    let region = new PIXI.Rectangle(0, 0, this.options.boidLength, this.options.boidHeight);
    this.boidTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);
    this.boidTexture.defaultAnchor.set(0.5, 0.5);
  }

  private initHeatmap() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const heatmapItems =
      (maxX / this.options.heatmapGridSize) *
      (maxY / this.options.heatmapGridSize);

    this.heatmapContainer = new PIXI.ParticleContainer(heatmapItems, {
      position: false,
      rotation: false,
      tint: true
    });
    this.heatmapContainer.zIndex = 1;

    // Prepare the heatmap texture
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xffffff);
    graphics.lineStyle(0);
    graphics.drawRect(0, 0, this.options.heatmapGridSize, this.options.heatmapGridSize);
    graphics.endFill();

    const region = new PIXI.Rectangle(0, 0, this.options.heatmapGridSize, this.options.heatmapGridSize);
    this.heatmapTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

    if (this.options.heatmap) {
      this.heatmapContainer.removeChildren();

      for (
        let gridX = 0;
        gridX < maxX / this.options.heatmapGridSize;
        gridX++
      ) {
        this.heatmapCells[gridX] = [];
        this.heatmapHistory[gridX] = [];

        for (
          let gridY = 0;
          gridY < maxY / this.options.heatmapGridSize;
          gridY++
        ) {
          const gridCell = new PIXI.Sprite(this.heatmapTexture);
          gridCell.x = gridX * this.options.heatmapGridSize;
          gridCell.y = gridY * this.options.heatmapGridSize;
          gridCell.tint = this.options.background;

          this.heatmapCells[gridX][gridY] = gridCell;
          this.heatmapHistory[gridX][gridY] = 0;

          this.heatmapContainer.addChild(gridCell);
        }
      }
    }

    this.app.stage.addChild(this.heatmapContainer);
  }

  private updateHeatmapCell(boidX: number, boidY: number) {
    if (!this.options.heatmap) {
      return;
    }

    // adjust x and y to the heatmapGridSize resolution
    const x = Math.floor(boidX / this.options.heatmapGridSize);
    const y = Math.floor(boidY / this.options.heatmapGridSize);

    if (
      x < 0 ||
      y < 0 ||
      x >= this.heatmapCells.length ||
      y >= this.heatmapCells[0].length
    ) {
      return;
    }

    this.heatmapHistory[x][y] += this.options.heatmapIncrease;
    this.heatmapMax = Math.max(this.heatmapMax, this.heatmapHistory[x][y]);

    const tint = Util.heatmapColor(this.heatmapMax, this.heatmapHistory[x][y]);
    this.heatmapCells[x][y].tint = tint;
  }

  private cooldownHeatmap() {
    if (!this.options.heatmap) {
      return;
    }

    for (let x = 0; x < this.heatmapHistory.length; x++) {
      for (let y = 0; y < this.heatmapHistory[x].length; y++) {
        this.heatmapHistory[x][y] = Math.max(
          0,
          this.heatmapHistory[x][y] -
            (this.heatmapMax * this.options.heatmapAttenuation) / 100000
        );
        this.heatmapMax = Math.max(this.heatmapMax, this.heatmapHistory[x][y]);

        const tint = Util.heatmapColor(
          this.heatmapMax,
          this.heatmapHistory[x][y]
        );

        this.heatmapCells[x][y].tint = tint;
      }
    }
  }
}
