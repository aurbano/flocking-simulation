import * as PIXI from "pixi.js";
import { Boid } from "../model/boid";
import { Neighbour, PointInfo, Vector } from "../model/types";

export type Position = {
  x: number;
  y: number;
};

export class Util {
  public static random(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  /**
   * Neighbour coordinates from this boid's reference
   * @param neighbour 
   */
  public static getNeighbourCoords(boid: Boid, neighbour: Boid, neighbourCoords: Position): void {
    const sin = Util.quickSin(boid.rotation);
    const cos = Util.quickCos(boid.rotation);

    const x = neighbour.x - boid.x;
    const y = neighbour.y - boid.y;

    neighbourCoords.x = x * cos + y * sin;
    neighbourCoords.y = -x * sin + y * cos;
  }

  public static getAngleToPoint(x: number, y: number) {
    const angle = Math.atan(y / x);
    if (x < 0) {
      return angle + Math.PI;
    }
    return angle;
  }

  public static getPointInfo(visionAngle: number, x: number, y: number, point: PointInfo): void {
    let angle = Util.getAngleToPoint(x, y) - Math.PI / 2;

    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    const isVisible = (
      angle < visionAngle ||
      angle > 2 * Math.PI - visionAngle
    );

    point.isVisible = isVisible;
    point.angle = angle + Math.PI / 2;
  }

  public static getNeighboursWeightedVector(
    neighbours: Array<Neighbour>,
    boid: Boid,
    vector: Vector
  ): void {
    // [meanX, meanY] is the weighted center of mass of the neighbours
    vector.x = Util.arrayMean(neighbours, (boid: Neighbour) => boid.x);
    vector.y = Util.arrayMean(neighbours, (boid: Neighbour) => boid.y);

    vector.rotation = Util.unwrap(Util.getAngleToPoint(vector.x - boid.x, vector.y - boid.y) - Math.PI / 2);
  }

  public static getRotation(meanX: number, meanY: number, boid: PIXI.Sprite) {
    // Vector from boid to mean neighbours
    const mean_dx = meanX - boid.x;
    const mean_dy = meanY - boid.y;

    // Diff between angle of the vector from boid to the mean neighbours and current direction
    return Math.atan2(mean_dy, mean_dx) - boid.rotation;
  }

  public static printAngle(rad: number) {
    return Math.round((rad * 180) / Math.PI);
  }

  /**
   * Returns null if distance is > max for sure
   * Otherwise it returns the abs, not the sqrt
   */
  public static distance(p1: Position, p2: Position, max?: number) {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    if (max) {
      if (dx >= max || dy >= max) {
        return null;
      }
    }
    return dx * dx + dy * dy;
  }

  public static arrayMean(arr: Array<any>, getKey: Function) {
    let result = 0;
    for (let i = 0; i < arr.length; i++) {
      result += getKey(arr[i]);
    }
    result /= arr.length;
    return result;
  }

  public static componentToHex(c: number) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  public static rgbToDecimal(r: number, g: number, b: number): number {
    return parseInt(
      Util.componentToHex(r) + Util.componentToHex(g) + Util.componentToHex(b),
      16
    );
  }

  public static heatmapColor(maxValue: number, currentValue: number) {
    const value = currentValue / maxValue;

    const r = Math.round(255 * Math.sqrt(value));
    const g = Math.round(255 * Math.pow(value, 3));
    const b = Math.round(
      255 *
        (Math.sin(2 * Math.PI * value) >= 0 ? Math.sin(2 * Math.PI * value) : 0)
    );

    return Util.rgbToDecimal(r, g, b);
  }

  public static fade(distance: number, maxDistance: number) {
    return distance > 0 ? 1 - distance / maxDistance : 0
  }

  public static unwrap(angle: number, mod: number = 2 * Math.PI) {
    if (angle > 0 && angle < mod) {
      return angle;
    }
    const wraps = Math.floor(angle / mod);
    return angle - wraps * mod;
 }

  public static expDecay(x: number, scale: number, rampCenter: number, steepness: number) {
    return scale / (1 + Math.exp(steepness * (x - rampCenter))) + 1
  }

  public static quickSin(x: number) {
    if (x < -3.14159265) x += 6.28318531;
    else if (x >  3.14159265) x -= 6.28318531;
    if (x < 0) return 1.27323954 * x + .405284735 * x * x;
    else return 1.27323954 * x - 0.405284735 * x * x;
  }
 
  public static quickCos(x: number) {
    x += 1.57079632;
    if (x >  3.14159265) x -= 6.28318531;
    if (x < 0) return 1.27323954 * x + 0.405284735 * x * x
    else return 1.27323954 * x - 0.405284735 * x * x;
  }
}
