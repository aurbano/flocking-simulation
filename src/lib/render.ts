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

    this.reset();

    this.boidContainer.zIndex = 2;
    this.app.stage.addChild(this.boidContainer);

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

    this.boidContainer.removeChildren();
    this.boids = [];

    this.initBoidTexture();
    this.initHeatmap();

    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;

    // Initialize boids
    for (let i = 0; i < this.options.number; i++) {
      const boid = new Boid(this.options, maxX, maxY, this.boidTexture);

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
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const maxD = Math.max(maxX, maxY);
    const totalBoids = this.boids.length;

    for (let i = 0; i < totalBoids; i++) {
      const boid = this.boids[i];

      // Forces that determine flocking
      let f_cohesion: number = boid.desiredVector.rotation; // steer towards average position of neighbours (long range attraction)
      let f_separation: number = boid.desiredVector.rotation; // avoid crowding neighbours (short range repulsion)
      let f_alignment: number = boid.desiredVector.rotation; // steer towards average heading of neighbours
      let f_predators: number = boid.desiredVector.rotation; // avoid predators
      let f_obstacles: number = boid.desiredVector.rotation; // avoid obstacles (same as predators but with less margin)

      // Find important neighbours
      const cohesionNeighbours: Boid[] = [];
      const separationNeighbours: Boid[] = [];
      const alignmentNeighbours: Boid[] = [];
      // const enemiesNear = [];

      boid.resetDebug();

      // Iterate over the rest of the boids to find neighbours
      for (let a = 0; a < totalBoids; a++) {
        if (a === i) {
          continue;
        }
        const neighbour = this.boids[a];
        const neighbourCoords = boid.getNeighbourCoords(neighbour);
        const neighbourInfo = boid.getPointInfo(neighbourCoords.x, neighbourCoords.y);

        if (!neighbourInfo.isVisible) {
          continue;
        }

        const distance = Util.distance(boid, neighbour);
        boid.drawDebugVector(Math.PI / 2 - neighbourInfo.angle, distance, COLORS.VISIBLE, Util.fade(distance, maxD) * 0.2);

        // TODO Store contributions with distance and deviation from center
        if (distance < this.options.separationRadius) {
          separationNeighbours.push(neighbour);
          boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.SEPARATION, Util.fade(distance, this.options.separationRadius) * 0.5);
        } else if (distance < this.options.alignmentRadius) {
          alignmentNeighbours.push(neighbour);
          boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.ALIGNMENT, Util.fade(distance, this.options.alignmentRadius) * 0.5);
        } else if (distance < this.options.cohesionRadius) {
          cohesionNeighbours.push(neighbour);
          boid.drawDebugLine(neighbourCoords.x, neighbourCoords.y, COLORS.COHESION, Util.fade(distance, this.options.cohesionRadius) * 0.7, 2);
        }
      }

      boid.tint = 0xcccccc;

      if (cohesionNeighbours.length > 0) {
        boid.tint = COLORS.COHESION;
        // cohesion makes it want to go towards neighbours
        f_cohesion = Util.getNeighboursRotation(cohesionNeighbours, boid);
      }

      if (alignmentNeighbours.length > 0) {
        boid.tint = COLORS.ALIGNMENT;
        // alignment makes it want to fly in the same rotation
        // calculate their average direction
        const rotations = alignmentNeighbours.map(each => each.rotation).reduce((a, b) => a + b, 0);
        const avg = rotations / alignmentNeighbours.length;
        f_alignment = avg;
      }

      // Calculate forces
      if (separationNeighbours.length > 0) {
        boid.tint = COLORS.SEPARATION;
        // separation makes it want to fly away from neighbours
        f_separation = Util.getNeighboursRotation(separationNeighbours, boid) - 3 * Math.PI / 2;
      }

      if (cohesionNeighbours.length + separationNeighbours.length + alignmentNeighbours.length < 1) {
        boid.tint = COLORS.NONE;
      }

      // Set the mouse as a predator
      const mouseCoords = this.app.renderer.plugins.interaction.mouse.global;
      const mouseDistance = Util.distance(mouseCoords, boid);
      if (mouseDistance < this.options.predatorRadius) {
        boid.tint = COLORS.SEPARATION;
        const localMouseCoords = this.app.renderer.plugins.interaction.mouse.getLocalPosition(boid);
        boid.drawDebugLine(localMouseCoords.x, localMouseCoords.y, COLORS.SEPARATION, Util.fade(mouseDistance, this.options.predatorRadius), 2);

        f_predators = Util.unwrap(boid.getAngleToPoint(mouseCoords.x - boid.x, mouseCoords.y - boid.y) - 3 * Math.PI / 2);
      }

      boid.desiredVector.rotation = (
        f_cohesion * this.options.cohesionForce + 
        f_separation * this.options.separationForce + 
        f_alignment * this.options.alignmentForce + 
        f_predators * this.options.predatorForce + 
        f_obstacles * this.options.obstacleForce) / (
          this.options.cohesionForce + 
          this.options.separationForce + 
          this.options.alignmentForce + 
          this.options.predatorForce + 
          this.options.obstacleForce
        );
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
        const turnAmount = Math.min(absDiff, 0.01 * this.options.turningSpeed);
        boid.rotation = Util.unwrap(boid.rotation + direction * turnAmount);
      }

      // Now use the angle and the speed to calculate dx and dy
      const dx = Math.sin(boid.rotation) * delta;
      const dy = Math.cos(boid.rotation) * delta;

      boid.x -= dx;
      boid.y += dy;

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

  private initBoidTexture() {
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
    this.heatmapContainer.visible = false;

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
