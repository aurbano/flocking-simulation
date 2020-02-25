import * as PIXI from "pixi.js";
import Stats from "stats.js";

import { Options } from "../model/types";
import { Util, COLORS } from "./util";
import { Boid } from "../model/boid";

export class Renderer {
  private app: PIXI.Application;

  private boids: Boid[] = [];
  private boidTexture: PIXI.Texture;
  private boidContainer: PIXI.Container;

  private heatmapTexture: PIXI.Texture;
  private heatmapContainer: PIXI.ParticleContainer;
  private heatmapCells: PIXI.Sprite[][] = [];
  private heatmapHistory: number[][] = [];
  private heatmapMax: number = 10;

  private stats: Stats;

  private paused: boolean = false;

  constructor(private options: Options) {
    this.app = new PIXI.Application({
      resizeTo: window,
      resolution: devicePixelRatio,
      autoDensity: true,
      backgroundColor: options.background
    });

    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    if (!this.options.debug) {
      this.boidContainer = new PIXI.ParticleContainer(this.options.number, {
        position: true,
        rotation: true,
        tint: true
      });
    } else {
      this.boidContainer = new PIXI.Container();
    }

    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const gridItems =
      (maxX / this.options.heatmapGridSize) *
      (maxY / this.options.heatmapGridSize);

    this.heatmapContainer = new PIXI.ParticleContainer(gridItems, {
      position: false,
      rotation: false,
      tint: true
    });
    this.app.stage.addChild(this.heatmapContainer);
    this.app.stage.addChild(this.boidContainer);

    // Prepare the boid texture for sprites
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xcccccc);
    graphics.lineStyle(0);
    graphics.drawPolygon([
      new PIXI.Point(this.options.boidLength / 2, this.options.boidHeight),
      new PIXI.Point(0, 0),
      new PIXI.Point(this.options.boidLength, 0)
    ]);
    graphics.endFill();

    let region = new PIXI.Rectangle(0, 0, options.boidLength, options.boidHeight);
    this.boidTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);
    this.boidTexture.defaultAnchor.set(0.5, 0.5);

    // Prepare the grid texture
    graphics.beginFill(0xffffff);
    graphics.lineStyle(0);
    graphics.drawRect(0, 0, this.options.heatmapGridSize, this.options.heatmapGridSize);
    graphics.endFill();
    region = new PIXI.Rectangle(0, 0, options.heatmapGridSize, options.heatmapGridSize);
    this.heatmapTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

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
  }

  public start() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;

    // Initialize heatmap grid
    if (this.options.heatmap) {
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

    // Initialize boids
    for (let i = 0; i < this.options.number; i++) {
      const boid = new Boid(this.options, maxX, maxY, this.boidTexture);

      this.boidContainer.addChild(boid);
      this.boids.push(boid);

      this.updateHeatmapCell(boid.x, boid.y);
    }

    // Listen for animate update
    this.app.ticker.add(delta => {
      this.stats.begin();

      if (!this.paused) {
        this.cooldownHeatmap();
        this.updateBoids(delta);
      }

      this.stats.end();
    });
  }

  public togglePause = () => {
    this.paused = !this.paused;
  };

  private updateBoids(delta: number) {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const totalBoids = this.boids.length;

    for (let i = 0; i < totalBoids; i++) {
      const boid = this.boids[i];

      // Forces that determine flocking
      let f_cohesion: number = 0; // steer towards average position of neighbours (long range attraction)
      let f_separation: number = 0; // avoid crowding neighbours (short range repulsion)
      let f_alignment: number = 0; // steer towards average heading of neighbours
      let f_predators: number = 0; // avoid predators
      let f_obstacles: number = 0; // avoid obstacles (same as predators but with less margin)

      // Find important neighbours
      const cohesionNeighbours: Boid[] = [];
      const separationNeighbours: Boid[] = [];
      const alignmentNeighbours: Boid[] = [];
      // const enemiesNear = [];

      boid.resetDebug();
      boid.debugLog(`[${i}]`);

      // Iterate over the rest of the boids to find neighbours
      for (let a = 0; a < totalBoids; a++) {
        if (a === i) {
          continue;
        }
        const neighbour = this.boids[a];
        const neighbourCoords = boid.getNeighbourCoords(neighbour);
        const neighbourAngle = boid.getAngleToNeighbour(neighbour);

        const d = Util.distance(boid, neighbour);
        let visible = boid.isNeighbourVisible(neighbour);

        const endLength = Math.max(20, d);
        const endX = Math.sin(Math.PI / 2 - neighbourAngle) * endLength;
        const endY = Math.cos(Math.PI / 2 - neighbourAngle) * endLength;

        if (!visible) {
          boid.drawDebugLine(endX, endY, COLORS.ALIGNMENT, 0.1);
        } else {
          boid.drawDebugLine(endX, endY, COLORS.ALIGNMENT, 0.7);
        }

        if (visible) {
          if (d < this.options.separationRadius) {
            separationNeighbours.push(neighbour);

            boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.SEPARATION, 0.3);
          }

          if (d < this.options.alignmentRadius) {
            alignmentNeighbours.push(neighbour);

            boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.ALIGNMENT, 0.3);
          }

          if (d < this.options.cohesionRadius) {
            cohesionNeighbours.push(neighbour);

            boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.COHESION, 0.7, 2);
          }
        }
      }

      boid.tint = 0xcccccc;

      // Calculate forces
      if (separationNeighbours.length > 0) {
        boid.tint = COLORS.SEPARATION;
        // separation makes it want to fly away from neighbours
        f_separation =
          Util.getNeighboursRotation(separationNeighbours, boid) + Math.PI;
      }

      if (alignmentNeighbours.length > 0) {
        boid.tint = COLORS.ALIGNMENT;
        // alignment makes it want to fly in the same rotation
        f_alignment = Util.getNeighboursRotation(alignmentNeighbours, boid);
      }

      if (cohesionNeighbours.length > 0) {
        boid.tint = COLORS.COHESION;
        // cohesion makes it want to go towards neighbours
        f_cohesion = Util.getNeighboursRotation(cohesionNeighbours, boid);
      }

      if (
        cohesionNeighbours.length +
          separationNeighbours.length +
          alignmentNeighbours.length <
        1
      ) {
        boid.tint = COLORS.NONE;
      }

      // set the mouse as an enemy
      const mouseCoords = this.app.renderer.plugins.interaction.mouse.global;
      const mouseDistance = Util.distance(mouseCoords, boid);
      if (mouseDistance < this.options.predatorRadius) {
        boid.tint = COLORS.SEPARATION;
        f_predators =
          Util.getRotation(mouseCoords.x, mouseCoords.y, boid) + Math.PI;
      }

      // Calculate the new direction of flight
      boid.rotation =
        boid.rotation +
        (this.options.cohesionForce * f_cohesion) / 100 +
        (this.options.separationForce * f_separation) / 100 +
        (this.options.alignmentForce * f_alignment) / 100 +
        (this.options.predatorForce * f_predators) / 100 +
        (this.options.obstacleForce * f_obstacles) / 100;

      // Now use the angle and the speed to calculate dx and dy
      const dx = Math.sin(boid.rotation) * this.options.speed;
      const dy = Math.cos(boid.rotation) * this.options.speed;

      boid.x -= dx * delta;
      boid.y += dy * delta;

      this.updateHeatmapCell(boid.x, boid.y);

      // Wrap around
      if (boid.x <= 0) {
        boid.x = maxX - 1;
      } else if (boid.x >= maxX) {
        boid.x = 1;
      }

      if (boid.y <= 0) {
        boid.y = maxY - 1;
      } else if (boid.y >= maxY) {
        boid.y = 1;
      }
    }
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
