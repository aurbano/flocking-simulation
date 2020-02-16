import * as PIXI from 'pixi.js';
import Stats from 'stats.js';

import { Options } from '../model/types';

type Position = {
  x: number,
  y: number,
};

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
    const gridItems = (maxX / this.options.gridSize) * (maxY / this.options.gridSize);

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
    graphics.lineStyle(1);
    graphics.drawRect(0, 0, this.options.gridSize, this.options.gridSize);
    graphics.endFill();
    region = new PIXI.Rectangle(0, 0, options.gridSize, options.gridSize);
    this.gridTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

    // Render the app
    document.getElementById(this.options.containerId).appendChild(this.app.view);
  }

  public start() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;

    // initialize grid
    for (let gridX = 0; gridX < maxX / this.options.gridSize; gridX++) {
      this.grid[gridX] = [];
      this.gridHistory[gridX] = [];

      for (let gridY = 0; gridY < maxY / this.options.gridSize; gridY++) {
        const gridCell = new PIXI.Sprite(this.gridTexture);
        gridCell.x = gridX * this.options.gridSize;
        gridCell.y = gridY * this.options.gridSize;
        gridCell.tint = this.options.background;

        this.grid[gridX][gridY] = gridCell;
        this.gridHistory[gridX][gridY] = 0;

        this.gridContainer.addChild(gridCell);
      }
    }

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

  private getGridColor(gridValue: number) {
    const value = gridValue / this.gridMax;

    const r = Math.round(255 * Math.sqrt(value)); 
    const g = Math.round(255 * Math.pow(value,3)); 
    const b = Math.round(255 * (Math.sin(2 * Math.PI * value) >= 0 ?
                   Math.sin(2 * Math.PI * value) : 0 ));

    return Renderer.rgbToDecimal(r, g, b);
  }

  private updateGridElement(boidX: number, boidY: number) {
    // adjust x and y to the gridSize resolution
    const x = Math.floor(boidX / this.options.gridSize);
    const y = Math.floor(boidY / this.options.gridSize);

    if (x < 0 || y < 0 || x >= this.grid.length || y >= this.grid[0].length) {
      return;
    }

    this.gridHistory[x][y] += this.options.gridIncrease;
    this.gridMax = Math.max(this.gridMax, this.gridHistory[x][y]);

    const tint = this.getGridColor(this.gridHistory[x][y]);

    this.grid[x][y].tint = tint;
  }

  private cooldownGrid() {
    for(let x = 0; x < this.gridHistory.length; x++ ) {
      for(let y = 0; y < this.gridHistory[x].length; y++ ) {
        this.gridHistory[x][y] = Math.max(0, this.gridHistory[x][y] - this.gridMax * this.options.gridAttenuation / 100000);
        this.gridMax = Math.max(this.gridMax, this.gridHistory[x][y]);
        
        const tint = this.getGridColor(this.gridHistory[x][y]);

        this.grid[x][y].tint = tint;
      }
    }
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
        const d = Renderer.distance(boid, neighbour);

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
        f_separation = Renderer.getNeighboursRotation(separationNeighbours, boid) + Math.PI;
      }

      if (alignmentNeighbours.length > 0) {
        boid.tint = 0x9dd60b;
      }

      if (cohesionNeighbours.length + separationNeighbours.length + alignmentNeighbours.length < 1) {
        boid.tint = 0xaaaaaa;
      }

      if (alignmentNeighbours.length > 0) {
        f_alignment = Renderer.getNeighboursRotation(alignmentNeighbours, boid);
      }

      if (cohesionNeighbours.length > 0) {
        f_cohesion = Renderer.getNeighboursRotation(cohesionNeighbours, boid);
      }

      // set the mouse as an enemy
      const mouseCoords = this.app.renderer.plugins.interaction.mouse.global;
      const mouseDistance = Renderer.distance(mouseCoords, boid);
      if (mouseDistance < this.options.predatorRadius) {
        boid.tint = 0xeb0000;
        f_predators = Renderer.getRotation(mouseCoords.x, mouseCoords.y, boid) + Math.PI;
      }

      // REF:
      // https://github.com/rafinskipg/birds/blob/master/app/scripts/models/birdsGenerator.js

      // REF2
      // Reynolds, Craig (1987). "Flocks, herds and schools: A distributed behavioral model.". SIGGRAPH '87: Proceedings of the 14th annual conference on Computer graphics and interactive techniques. Association for Computing Machinery

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

  private static random(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private static getNeighboursRotation(neighbours: Array<PIXI.Sprite>, boid: PIXI.Sprite) {
    if (neighbours.length < 1) {
      return 0;
    }

    // [meanX, meanY] is the center of mass of the neighbours
    const meanX = Renderer.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.x);
    const meanY = Renderer.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.y);

    return Renderer.getRotation(meanX, meanY, boid);
  }

  private static getRotation(meanX: number, meanY: number, boid: PIXI.Sprite) {
    // Vector from boid to mean neighbours
    const mean_dx = meanX - boid.x;
    const mean_dy = meanY - boid.y;

    // Diff between angle of the vector from boid to the mean neighbours and current direction
    return Math.atan2(mean_dy, mean_dx) - boid.rotation;
  }

  private static distance(p1: Position, p2: Position) {
    // Approximation by using octagons approach
  	const dx = Math.abs(p2.x - p1.x);
  	const dy = Math.abs(p2.y - p1.y);
  	return 1.426776695 * Math.min(0.7071067812 * (dx + dy), Math.max(dx, dy));	
  }

  private static arrayMean(arr: Array<any>, getKey: Function) {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += getKey(arr[i]);
    }
    result /= arr.length;
    return result;
  }

  private static componentToHex(c: number) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  private static rgbToDecimal(r: number, g: number, b: number): number {
    return parseInt(Renderer.componentToHex(r) + Renderer.componentToHex(g) + Renderer.componentToHex(b), 16);
  }
}
