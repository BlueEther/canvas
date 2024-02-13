import { PanZoom } from "../PanZoom";

export class Panning {
  private instance: PanZoom;

  public enabled: boolean = false;
  public x: number = 0;
  public y: number = 0;

  constructor(instance: PanZoom) {
    this.instance = instance;
  }

  /**
   * trigger panning start
   * @param x clientX
   * @param y clientY
   */
  public start(x: number, y: number) {
    this.enabled = true;
    this.x = x;
    this.y = y;
  }

  /**
   * handle moving
   * @param x clientX
   * @param y clientY
   */
  public move(x: number, y: number) {
    const deltaX = (x - this.x) / this.instance.transform.scale;
    const deltaY = (y - this.y) / this.instance.transform.scale;
    const newX = this.instance.transform.x + deltaX;
    const newY = this.instance.transform.y + deltaY;

    this.instance.$move.style.setProperty(
      "transform",
      `translate(${newX}px, ${newY}px)`
    );
  }

  /**
   * save the final change
   * @param x clientX
   * @param y clientY
   */
  public end(x: number, y: number) {
    this.enabled = false;

    const deltaX = (x - this.x) / this.instance.transform.scale;
    const deltaY = (y - this.y) / this.instance.transform.scale;
    const newX = this.instance.transform.x + deltaX;
    const newY = this.instance.transform.y + deltaY;

    this.instance.transform.x = newX;
    this.instance.transform.y = newY;

    this.instance.update();
  }
}
