import * as PIXI from 'pixi.js';
import Stats from 'stats.js';

import { Options } from '../model/types';

type Bird = {
  dx: number,
  dy: number,
};

export class Renderer {
  private app: PIXI.Application;
  private container: PIXI.ParticleContainer;
  private birdTexture: PIXI.Texture;
  private stats: Stats;

  private birds: Array<Bird> = [];

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

    // Prepare the bird texture for sprites
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xcccccc);
    graphics.lineStyle(0);
    graphics.drawCircle(options.size, options.size, options.size);
    graphics.endFill();
    const region = new PIXI.Rectangle(0, 0, options.size * 2, options.size * 2);
    this.birdTexture = this.app.renderer.generateTexture(graphics, 1, 1, region);

    // Render the app
    document.getElementById(this.options.containerId).appendChild(this.app.view);
  }

  public start() {
    const maxX = this.app.screen.width;
    const maxY = this.app.screen.height;
    for (let i = 0; i < this.options.number; i++) {
      const bird = new PIXI.Sprite(this.birdTexture);
      bird.x = Math.floor(Math.random() * maxX);
      bird.y = Math.floor(Math.random() * maxY);
      this.birds[i] = {
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
      };
      this.container.addChild(bird);
    }

    // Listen for animate update
    this.app.ticker.add((delta) => {
      this.stats.begin();

      const children = this.container.children.length;
      for (let i = 0; i < children; i++) {
        const sprite = this.container.children[i];
        const speed = this.birds[i];

        // Flocking rules
        // Separation - avoid crowding neighbours (short range repulsion)
        // Alignment - steer towards average heading of neighbours
        // Cohesion - steer towards average position of neighbours (long range attraction)

        sprite.x += speed.dx;
        sprite.y += speed.dy;

        if (sprite.x >= maxX || sprite.x <= 0) {
          speed.dx *= -1;
        }
        if (sprite.y >= maxY || sprite.y <= 0) {
          speed.dy *= -1;
        }
      }

      this.stats.end();
    });
  }
}
