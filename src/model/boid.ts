import * as PIXI from "pixi.js";
import { Options } from "./types";
import { COLORS, textStyle, Util } from "../lib/util";

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

  /**
   * Angle from this boid's positive X axis to a neighbour
   * @param neighbour 
   */
  public getAngleToNeighbour(neighbour: Boid) {
    const coords = this.getNeighbourCoords(neighbour);
    return this.getAngleToPoint(coords.x, coords.y);
  }

  public getAngleToPoint(x: number, y: number) {
    const angle = Math.atan(y / x);
    if (x < 0) {
      return angle + Math.PI;
    }
    return angle;
  }

  public isNeighbourVisible(neighbour: Boid) {
    const visionAngle = (this.options.visionAngle * Math.PI) / 180;

    let neighbourAngleFromY = this.getAngleToNeighbour(neighbour) - Math.PI / 2;

    if (neighbourAngleFromY < 0) {
      neighbourAngleFromY += 2 * Math.PI;
    }

    return (
      neighbourAngleFromY < visionAngle ||
      neighbourAngleFromY > 2 * Math.PI - visionAngle
    );
  }

  public drawDebugLine(x: number, y:number, color: number, alpha: number = 1, thickness: number = 1) {
    if (!this.options.debug) {
      return;
    }
    this.debugNeighbours.lineStyle(thickness, color, alpha);
    this.debugNeighbours.moveTo(0, 0).lineTo(x, y);
  }

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
    this.drawDebugVector(this.desiredVector.rotation - this.rotation, this.desiredVector.magnitude * 50, COLORS.DESIRED);
    this.debugLog(`current: ${Util.printAngle(this.rotation)}`);
    this.debugLog(`desired: ${Util.printAngle(this.desiredVector.rotation)}`);

    this.addChild(this.debugNeighbours);
  }

  public debugLog(msg: string) {
    if (!this.options.debug) {
      return;
    }
    this.debugInfo.text += msg + '\n';
  }

  private drawFilledArc(color: number, alpha: number, angle: number, radius: number, graphics: PIXI.Graphics) {
    graphics.beginFill(color, 0.1);
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
      COLORS.SEPARATION,
      0.2,
      visionAngle,
      this.options.separationRadius,
      this.debugVision
    );

    this.drawFilledArc(
      COLORS.ALIGNMENT,
      0.15,
      visionAngle,
      this.options.alignmentRadius,
      this.debugVision
    );

    this.drawFilledArc(
      COLORS.COHESION,
      0.05,
      visionAngle,
      this.options.cohesionRadius,
      this.debugVision
    );

    // y+
    this.debugVision.lineStyle(1, COLORS.COHESION, 0.1);
    this.debugVision.moveTo(0, 0).lineTo(0, this.options.cohesionRadius);

    // y-
    this.debugVision.lineStyle(1, COLORS.COHESION, 0.3);
    this.debugVision.moveTo(0, -100).lineTo(0, 0);

    // x+ axis
    this.debugVision.lineStyle(1, COLORS.VISIBLE, 0.5);
    this.debugVision.moveTo(0, 0).lineTo(100, 0);
    // x- axis
    this.debugVision.lineStyle(1, COLORS.SEPARATION, 0.5);
    this.debugVision.moveTo(-100, 0).lineTo(0, 0);

    this.debugInfo = new PIXI.Text("", textStyle);
    this.debugInfo.name = "debugInfo";
    this.debugInfo.zIndex = 9;

    this.debugNeighbours = new PIXI.Graphics();
    this.debugNeighbours.name = "debugNeighbours";

    this.addChild(this.debugVision, this.debugNeighbours, this.debugInfo);
  }
}
