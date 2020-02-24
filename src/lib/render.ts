import * as PIXI from 'pixi.js';
import Stats from 'stats.js';

import { Options } from '../model/types';
import { Util } from './util';

export class Renderer {
  private app: PIXI.Application;
  private container: PIXI.ParticleContainer;
  private gridContainer: PIXI.ParticleContainer;
  private boidTexture: PIXI.Texture;
  private gridTexture: PIXI.Texture;
  private stats: Stats;

  private boids: PIXI.Sprite[] = [];
  private grid: PIXI.Sprite[][] = [];
  private gridHistory: number[][] = [];
  private gridMax: number = 10;

  constructor(private options: Options) {
    this.app = new PIXI.Application({
      resizeTo: window,
      resolution: devicePixelRatio,
      autoDensity: true,
      backgroundColor: options.background,
    });

    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild( this.stats.dom );

    this.container = new PIXI.ParticleContainer(this.options.number, {
      position: true,
      rotation: true,
      tint: true,
    });

    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const gridItems = (maxX / this.options.heatmapGridSize) * (maxY / this.options.heatmapGridSize);

    this.gridContainer = new PIXI.ParticleContainer(gridItems, {
      position: false,
      rotation: false,
      tint: true,
    });
    this.app.stage.addChild(this.gridContainer);
    this.app.stage.addChild(this.container);

    // Prepare the boid texture for sprites
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xcccccc);
    graphics.lineStyle(0);
    graphics.drawPolygon([
      new PIXI.Point(this.options.boidLength / 2, this.options.boidHeight),
      new PIXI.Point(0, 0),
      new PIXI.Point(this.options.boidLength, 0),
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
    this.gridTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

    // Render the app
    document.getElementById(this.options.containerId).appendChild(this.app.view);
  }

  public start() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;

    // Initialize heatmap grid
    if (this.options.heatmap) {
      for (let gridX = 0; gridX < maxX / this.options.heatmapGridSize; gridX++) {
        this.grid[gridX] = [];
        this.gridHistory[gridX] = [];
  
        for (let gridY = 0; gridY < maxY / this.options.heatmapGridSize; gridY++) {
          const gridCell = new PIXI.Sprite(this.gridTexture);
          gridCell.x = gridX * this.options.heatmapGridSize;
          gridCell.y = gridY * this.options.heatmapGridSize;
          gridCell.tint = this.options.background;
  
          this.grid[gridX][gridY] = gridCell;
          this.gridHistory[gridX][gridY] = 0;
  
          this.gridContainer.addChild(gridCell);
        }
      }
    }

    // Initialize boids
    for (let i = 0; i < this.options.number; i++) {
      const boid = new PIXI.Sprite(this.boidTexture);

      boid.x = Math.floor(Math.random() * maxX);
      boid.y = Math.floor(Math.random() * maxY);
      
      boid.pivot.set(this.options.boidLength / 2, this.options.boidHeight)
      boid.anchor.set(0.5, 0.5)
      boid.rotation = Math.random() * Math.PI * 2;

      this.container.addChild(boid);
      this.boids.push(boid);

      this.updateGridElement(boid.x, boid.y);
    }

    // Listen for animate update
    this.app.ticker.add((delta) => {
      this.stats.begin();

      this.cooldownGrid();
      this.updateBoids(delta);

      this.stats.end();
    });
  }

  private updateBoids(delta: number) {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const totalBoids = this.boids.length;

    for (let i = 0; i < totalBoids; i++) {
      const boid = this.boids[i];

      // Forces that determine flocking
      let f_cohesion: number = 0;   // steer towards average position of neighbours (long range attraction)
      let f_separation: number = 0; // avoid crowding neighbours (short range repulsion)
      let f_alignment: number = 0;  // steer towards average heading of neighbours
      let f_predators: number = 0;  // avoid predators
      let f_obstacles: number = 0;  // avoid obstacles (same as predators but with less margin)

      // Find important neighbours
      const cohesionNeighbours: PIXI.Sprite[] = [];
      const separationNeighbours: PIXI.Sprite[] = [];
      const alignmentNeighbours: PIXI.Sprite[] = [];
      // const enemiesNear = [];

      // Iterate over the rest of the boids
      for (let a = 0; a < totalBoids; a++) {
        if (a === i) {
          continue;
        }
        const neighbour = this.boids[a];
        const d = Util.distance(boid, neighbour);

        if (d < this.options.separationRadius) {
          separationNeighbours.push(neighbour);
        }
        if (d < this.options.alignmentRadius) {
          alignmentNeighbours.push(neighbour);
        }
        if (d < this.options.cohesionRadius) {
          cohesionNeighbours.push(neighbour);
        }  
      }

      boid.tint = 0xcccccc;

      // Calculate forces
      if (separationNeighbours.length > 0) {
        f_separation = Util.getNeighboursRotation(separationNeighbours, boid) + Math.PI;
      }

      if (alignmentNeighbours.length > 0) {
        boid.tint = 0x9dd60b;
      }

      if (cohesionNeighbours.length + separationNeighbours.length + alignmentNeighbours.length < 1) {
        boid.tint = 0xaaaaaa;
      }

      if (alignmentNeighbours.length > 0) {
        f_alignment = Util.getNeighboursRotation(alignmentNeighbours, boid);
      }

      if (cohesionNeighbours.length > 0) {
        f_cohesion = Util.getNeighboursRotation(cohesionNeighbours, boid);
      }

      // set the mouse as an enemy
      const mouseCoords = this.app.renderer.plugins.interaction.mouse.global;
      const mouseDistance = Util.distance(mouseCoords, boid);
      if (mouseDistance < this.options.predatorRadius) {
        boid.tint = 0xeb0000;
        f_predators = Util.getRotation(mouseCoords.x, mouseCoords.y, boid) + Math.PI;
      }

      // Calculate the new direction of flight
      boid.rotation = boid.rotation + 
                      this.options.cohesionForce * f_cohesion / 100 + 
                      this.options.separationForce * f_separation / 100 + 
                      this.options.alignmentForce * f_alignment / 100 +
                      this.options.predatorForce * f_predators / 100 +
                      this.options.obstacleForce * f_obstacles / 100;

      // Now use the angle and the speed to calculate dx and dy
      const dx = Math.sin(boid.rotation) * this.options.speed;
      const dy = Math.cos(boid.rotation) * this.options.speed;

      boid.x -= dx * delta;
      boid.y += dy * delta;

      this.updateGridElement(boid.x, boid.y);

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

  private updateGridElement(boidX: number, boidY: number) {
    if (!this.options.heatmap) {
      return;
    }

    // adjust x and y to the heatmapGridSize resolution
    const x = Math.floor(boidX / this.options.heatmapGridSize);
    const y = Math.floor(boidY / this.options.heatmapGridSize);

    if (x < 0 || y < 0 || x >= this.grid.length || y >= this.grid[0].length) {
      return;
    }

    this.gridHistory[x][y] += this.options.heatmapIncrease;
    this.gridMax = Math.max(this.gridMax, this.gridHistory[x][y]);

    const tint = Util.heatmapColor(this.gridMax, this.gridHistory[x][y]);

    this.grid[x][y].tint = tint;
  }

  private cooldownGrid() {
    if (!this.options.heatmap) {
      return;
    }
    
    for(let x = 0; x < this.gridHistory.length; x++ ) {
      for(let y = 0; y < this.gridHistory[x].length; y++ ) {
        this.gridHistory[x][y] = Math.max(0, this.gridHistory[x][y] - this.gridMax * this.options.heatmapAttenuation / 100000);
        this.gridMax = Math.max(this.gridMax, this.gridHistory[x][y]);
        
        const tint = Util.heatmapColor(this.gridMax, this.gridHistory[x][y]);

        this.grid[x][y].tint = tint;
      }
    }
  }
}
