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
  private boidTexture: PIXI.Texture;
  private stats: Stats;

  private boids: PIXI.Sprite[] = [];

  constructor(private options: Options) {
    this.app = new PIXI.Application({
      resizeTo: window,
      resolution: devicePixelRatio,
      autoDensity: true,
      backgroundColor: 0x111111,
    });

    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild( this.stats.dom );

    this.container = new PIXI.ParticleContainer(this.options.number, {
      position: true,
      rotation: true,
      tint: true,
    });
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
    const region = new PIXI.Rectangle(0, 0, options.boidLength, options.boidHeight);
    this.boidTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);
    this.boidTexture.defaultAnchor.set(0.5, 0.5);

    // Render the app
    document.getElementById(this.options.containerId).appendChild(this.app.view);
  }

  public start() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    for (let i = 0; i < this.options.number; i++) {
      const boid = new PIXI.Sprite(this.boidTexture);
      boid.x = Math.floor(Math.random() * maxX);
      boid.y = Math.floor(Math.random() * maxY);
      boid.pivot.set(this.options.boidLength / 2, this.options.boidHeight)
      boid.anchor.set(0.5, 0.5)
      boid.rotation = Math.random() * Math.PI * 2;
      this.container.addChild(boid);
      this.boids.push(boid);
    }

    // Listen for animate update
    this.app.ticker.add((delta) => {
      this.stats.begin();

      this.updateBoids(delta);

      this.stats.end();
    });
  }

  private updateBoids(delta: number) {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    const children = this.boids.length;

    for (let i = 0; i < children; i++) {
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
      for (let a = 0; a < children; a++) {
        if (a === i) {
          continue;
        }
        const neighbour = this.boids[a];
        const d = this.distance(this.position(boid), this.position(neighbour));

        if (d < this.options.separationRadius) {
          separationNeighbours.push(neighbour);
        } else if (d < this.options.alignmentRadius) {
          alignmentNeighbours.push(neighbour);
        } else if (d < this.options.cohesionRadius) {
          cohesionNeighbours.push(neighbour);
        }  
      }

      boid.tint = 0xcccccc;

      // Calculate forces
      if (separationNeighbours.length > 0) {
        f_separation = this.getRotation(separationNeighbours, boid);
        f_separation += Math.PI; // cant turn instantly
      }

      if (alignmentNeighbours.length > 0) {
        boid.tint = 0x9dd60b;
      }

      if (cohesionNeighbours.length + separationNeighbours.length + alignmentNeighbours.length < 1) {
        boid.tint = 0xeb0000;
      }

      f_alignment = this.getRotation(alignmentNeighbours, boid);
      f_cohesion = this.getRotation(cohesionNeighbours, boid);

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

      // Wrap around
      if (boid.x < 0) {
        boid.x = maxX;
      } else if (boid.x >= maxX) {
        boid.x = 0;
      }

      if (boid.y < 0) {
        boid.y = maxY;
      } else if (boid.y >= maxY) {
        boid.y = 0;
      }
    }
  }

  private random(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private getRotation(neighbours: Array<PIXI.Sprite>, boid: PIXI.Sprite) {
    if (neighbours.length < 1) {
      return 0;
    }

    const meanX = this.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.x);
    const meanY = this.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.y);

    // Vector from boid to mean neighbours
    const mean_dx = meanX - boid.x;
    const mean_dy = meanY - boid.y;

    // Diff between angle of the vector from boid to the mean neighbours and current direction
    return Math.atan2(mean_dy, mean_dx) - boid.rotation;
  }

  private position(sprite: PIXI.Sprite) {
    return {
      x: sprite.x,
      y: sprite.y,
    };
  }

  private distance(p1: Position, p2: Position) {
    // Approximation by using octagons approach
  	const dx = Math.abs(p2.x - p1.x);
  	const dy = Math.abs(p2.y - p1.y);
  	return 1.426776695 * Math.min(0.7071067812 * (dx + dy), Math.max(dx, dy));	
  }

  private arrayMean(arr: Array<any>, getKey: Function) {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
        result += getKey(arr[i]);
    }
    result /= arr.length;
    return result;
  }
}
