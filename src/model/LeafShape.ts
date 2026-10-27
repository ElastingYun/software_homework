import { Geometry } from './Geometry.js';
import { NumericText } from './NumericText.js';
import { Shape } from './Shape.js';
import type { ShapeMemento } from './ShapeMemento.js';

/** 叶子图形：拥有一组几何量（Geometry），移动/缩放/撤销都作用于几何量。 */
export abstract class LeafShape extends Shape {
  protected readonly geometry = new Geometry();

  protected constructor(id: string) {
    super(id);
  }

  moveBy(dx: number, dy: number): void {
    this.geometry.translate(dx, dy);
  }

  scaleBy(factor: number): void {
    this.geometry.scale(factor);
  }

  createMemento(): ShapeMemento {
    return this.geometry.createMemento();
  }

  describeMove(verb: string): string {
    const [x, y] = this.anchor();
    return `${verb} to (${NumericText.format(x)},${NumericText.format(y)})`;
  }

  /** 回显"移动到哪里"所用的锚点，如 rect 的 (x,y)、circle 的 (cx,cy)。 */
  protected abstract anchor(): [number, number];

  /** 几何量的格式化值。 */
  protected show(name: string): string {
    return NumericText.format(this.geometry.get(name));
  }

  protected override ownAttributeNames(): string[] {
    return this.geometry.names();
  }

  protected override readOwnAttribute(name: string): string {
    if (this.geometry.has(name)) {
      return String(this.geometry.get(name));
    }
    return super.readOwnAttribute(name);
  }

  protected override writeOwnAttribute(name: string, value: string): void {
    if (this.geometry.has(name)) {
      this.geometry.set(name, NumericText.require(value));
      return;
    }
    super.writeOwnAttribute(name, value);
  }

  protected override displayOwnAttribute(name: string): string {
    if (this.geometry.has(name)) {
      return this.show(name);
    }
    return super.displayOwnAttribute(name);
  }

  protected override ownSvgAttributes(): Array<[string, string]> {
    return this.geometry.entries().map(([name, value]) => [name, NumericText.format(value)]);
  }
}
