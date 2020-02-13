import * as PIXI from 'pixi.js';
import Stats from 'stats.js';

import { Options } from '../model/types';

type Boid = {
  dx: number,
  dy: number,
};

type Position = {
  x: number,
  y: number,
};

export class Renderer {
  private app: PIXI.Application;
  private container: PIXI.ParticleContainer;
  private boidTexture: PIXI.Texture;
  private stats: Stats;

  private boids: Array<Boid> = [];

  constructor(private options: Options) {
    this.app = new PIXI.Application({
      resizeTo: window,
      resolution: devicePixelRatio,
      autoDensity: true,
      backgroundColor: 0x333333,
    });

    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild( this.stats.dom );

    this.container = new PIXI.ParticleContainer();
    this.app.stage.addChild(this.container);

    // Prepare the boid texture for sprites
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xcccccc);
    graphics.lineStyle(0);
    graphics.drawCircle(options.size, options.size, options.size);
    graphics.endFill();
    const region = new PIXI.Rectangle(0, 0, options.size * 2, options.size * 2);
    this.boidTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

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
      this.boids[i] = {
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
      };
      this.container.addChild(boid);
    }

    // Listen for animate update
    this.app.ticker.add((delta) => {
      this.stats.begin();

      const children = this.container.children.length;
      for (let i = 0; i < children; i++) {
        const boid = this.container.children[i];
        const speed = this.boids[i];

        // Forces that determine flocking
        let f_cohesion;   // steer towards average position of neighbours (long range attraction)
        let f_separation; // avoid crowding neighbours (short range repulsion)
        let f_alignment;  // steer towards average heading of neighbours
        let f_predators;  // avoid predators
        let f_obstacles;  // avoid obstacles (same as predators but with less margin)

        // iterate over the rest of the boids
        for (let a = 0; a < children; a++) {
          if (a === i) {
            continue;
          }
          const neighbour = this.container.children[a];
          const neighbour_speed = this.boids[a];

          const d = this.distance(this.position(boid), this.position(neighbour));

          if (d < 40) {
            // turn away
            speed.dx -= neighbour_speed.dx * d / 300;
            speed.dy -= neighbour_speed.dy * d / 300;
          } else if (d < 100) {
            // turn towards them
            speed.dx -= neighbour_speed.dx / d;
            speed.dy -= neighbour_speed.dy / d;
          }
        }

        boid.x = boid.x + speed.dx;
        boid.y = boid.y + speed.dy;

        if (boid.x >= maxX || boid.x <= 0) {
          speed.dx *= -1;
        }
        if (boid.y >= maxY || boid.y <= 0) {
          speed.dy *= -1;
        }
      }

      this.stats.end();
    });
  }

  private position(sprite: PIXI.DisplayObject) {
    return {
      x: sprite.x,
      y: sprite.y,
    };
  }

  private distance(p1: Position, p2: Position) {
    // Approximation by using octagons approach
  	const dx = Math.abs(p2.x-p1.x);
  	const dy = Math.abs(p2.y-p1.y);
  	return 1.426776695*Math.min(0.7071067812 * (dx + dy), Math.max (dx, dy));	
  }
}
