import * as PIXI from "pixi.js";
import { Options } from "./types";
import { COLORS, textStyle, UI_COLORS, TYPES } from "../lib/constants";

type Vector = {
  rotation: number; // radians
  magnitude: number; // normalized strength [0-1]
};

/**
 * Boids fly towards their Y positive axis, with positive X to their left
 */
export class Boid extends PIXI.Sprite {
  /**
   * desiredVector contains the rotation (measured from the absolute +y axis, same as the boids rotation) that
   * the boid _wants_ to travel in.
   * Instant variation is allowed, as the boids will then adjust their direction to match the desired direction.
   */
  public desiredVector: Vector;

  // Debug graphics
  private debugInfo: PIXI.Text;
  private debugVision: PIXI.Graphics;
  private debugNeighbours: PIXI.Graphics;

  constructor(private options: Options, maxX: number, maxY: number, texture?: PIXI.Texture) {
    super(texture);

    this.x = Math.floor(Math.random() * maxX);
    this.y = Math.floor(Math.random() * maxY);

    this.pivot.set(this.options.boidLength / 2, this.options.boidHeight);
    this.anchor.set(0.5, 0.5);
    this.rotation = Math.random() * Math.PI * 2;

    this.desiredVector = {
      rotation: Math.random() * 2 * Math.PI, //this.rotation,
      magnitude: 1
    };

    this.initDebug();
  }

  /**
   * Neighbour coordinates from this boid's reference
   * @param neighbour 
   */
  public getNeighbourCoords(neighbour: Boid) {
    return this.toLocal(new PIXI.Point(0, 0), neighbour);
  }

  public getAngleToPoint(x: number, y: number) {
    const angle = Math.atan(y / x);
    if (x < 0) {
      return angle + Math.PI;
    }
    return angle;
  }

  public getPointInfo(x: number, y: number) {
    const visionAngle = (this.options.visionAngle * Math.PI) / 180;
    const angle = this.getAngleToPoint(x, y);

    let neighbourAngleFromY = angle - Math.PI / 2;

    if (neighbourAngleFromY < 0) {
      neighbourAngleFromY += 2 * Math.PI;
    }

    const isVisible = (
      neighbourAngleFromY < visionAngle ||
      neighbourAngleFromY > 2 * Math.PI - visionAngle
    );

    return {
      isVisible,
      angle,
    };
  }

  public drawDebugLine(x: number, y:number, color: number, alpha: number = 1, thickness: number = 1) {
    if (!this.options.debug) {
      return;
    }
    this.debugNeighbours.lineStyle(thickness, color, alpha);
    this.debugNeighbours.moveTo(0, 0).lineTo(x, y);
  }

  /**
   * Draws a line at the given rotation from the boid's y+ axis
   */
  public drawDebugVector(rotation: number, magnitude: number, color: number, alpha: number = 1, thickness: number = 1) {
    if (!this.options.debug) {
      return;
    }
    const vecX = Math.sin(rotation) * magnitude;
    const vecY = Math.cos(rotation) * magnitude;

    this.drawDebugLine(vecX, vecY, color, alpha, thickness);
  }

  public resetDebug() {
    if (!this.options.debug) {
      return;
    }
    this.debugInfo.text = '';
    this.debugInfo.rotation = -this.rotation;

    this.removeChild(this.debugNeighbours);
    this.debugNeighbours = new PIXI.Graphics();
    this.debugNeighbours.name = "debugNeighbours";

    // draw desired direction vector
    this.drawDebugVector(this.rotation - this.desiredVector.rotation, this.desiredVector.magnitude * 50, UI_COLORS.DESIRED);

    this.addChild(this.debugNeighbours);
  }

  public debugLog(msg: string) {
    if (!this.options.debug) {
      return;
    }
    this.debugInfo.text += msg + '\n';
  }

  private drawFilledArc(color: number, alpha: number, angle: number, radius: number, graphics: PIXI.Graphics) {
    graphics.beginFill(color, alpha);
    graphics
      .moveTo(0, 0)
      .arc(
        0,
        0,
        radius,
        Math.PI / 2,
        angle + Math.PI / 2
      )
      .moveTo(0, 0)
      .arc(
        0,
        0,
        radius,
        Math.PI / 2 - angle,
        Math.PI / 2
      );
    graphics.endFill();
  }

  private initDebug() {
    if (!this.options.debug) {
      return;
    }
    const visionAngle = (this.options.visionAngle * Math.PI) / 180;

    this.debugVision = new PIXI.Graphics();
    this.debugVision.name = "debugVision";

    // boids vision
    this.debugVision.lineStyle(0);
    this.drawFilledArc(
      COLORS[TYPES.SEPARATION],
      0.2,
      visionAngle,
      this.options.radius[TYPES.SEPARATION],
      this.debugVision
    );

    this.drawFilledArc(
      COLORS[TYPES.ALIGNMENT],
      0.15,
      visionAngle,
      this.options.radius[TYPES.ALIGNMENT],
      this.debugVision
    );

    this.drawFilledArc(
      COLORS[TYPES.COHESION],
      0.1,
      visionAngle,
      this.options.radius[TYPES.COHESION],
      this.debugVision
    );

    // y+
    this.debugVision.lineStyle(1, COLORS[TYPES.COHESION], 0.2);
    this.debugVision.moveTo(0, 0).lineTo(0, this.options.radius[TYPES.COHESION]);

    // y-
    // this.debugVision.lineStyle(1, COLORS[TYPES.COHESION], 0.3);
    // this.debugVision.moveTo(0, -100).lineTo(0, 0);

    // // x+ axis
    // this.debugVision.lineStyle(1, UI_COLORS[TYPES.VISIBLE], 0.5);
    // this.debugVision.moveTo(0, 0).lineTo(100, 0);
    // // x- axis
    // this.debugVision.lineStyle(1, COLORS.[TYPES.SEPARATION], 0.5);
    // this.debugVision.moveTo(-100, 0).lineTo(0, 0);

    this.debugInfo = new PIXI.Text("", textStyle);
    this.debugInfo.name = "debugInfo";
    this.debugInfo.zIndex = 9;

    this.debugNeighbours = new PIXI.Graphics();
    this.debugNeighbours.name = "debugNeighbours";

    this.addChild(this.debugVision, this.debugNeighbours, this.debugInfo);
  }
}
