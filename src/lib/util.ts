import * as PIXI from "pixi.js";

type Position = {
  x: number;
  y: number;
};

export class Util {
  public static random(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  public static getNeighboursRotation(
    neighbours: Array<PIXI.Sprite>,
    boid: PIXI.Sprite
  ) {
    if (neighbours.length < 1) {
      return 0;
    }

    // [meanX, meanY] is the center of mass of the neighbours
    const meanX = Util.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.x);
    const meanY = Util.arrayMean(neighbours, (boid: PIXI.Sprite) => boid.y);

    return Util.getRotation(meanX, meanY, boid);
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

  public static distance(p1: Position, p2: Position) {
    // Approximation by using octagons approach
    // const dx = Math.abs(p2.x - p1.x);
    // const dy = Math.abs(p2.y - p1.y);
    // return 1.426776695 * Math.min(0.7071067812 * (dx + dy), Math.max(dx, dy));
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
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
}

export const COLORS = {
  COHESION: 0xcccccc,
  ALIGNMENT: 0x9dd60b,
  SEPARATION: 0xeb0000,
  VISIBLE: 0x03b6fc,
  DESIRED: 0xf7b12f,
  NONE: 0x999999
};

export const textStyle = new PIXI.TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: "#cccccc",
  wordWrap: true,
  wordWrapWidth: 440
});
