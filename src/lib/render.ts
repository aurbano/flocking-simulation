import * as SimplexNoise from 'simplex-noise';
import * as PIXI from 'pixi.js';

import { Options } from '../model/types';

export class Renderer {
  private app: PIXI.Application;
  private scene: PIXI.Graphics;

  constructor(private options: Options) {
    const container = document.getElementById(`${this.options.containerId}`);

    this.app = new PIXI.Application({
      resizeTo: container,
      resolution: devicePixelRatio,
      backgroundColor: 0x333333,
    });

    this.scene = new PIXI.Graphics();
    this.app.stage.addChild(this.scene);

    // Render the app
    document.getElementById(this.options.containerId).appendChild(this.app.view);
  }

  public start() {
    console.log('Init simulation');
  }
}
