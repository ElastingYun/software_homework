import type { ShapeMemento } from './ShapeMemento.js';

/** 容器的备忘录：由全部子图形的备忘录组合而成（与 Composite 结构同构）。 */
export class CompositeMemento implements ShapeMemento {
  constructor(private readonly parts: readonly ShapeMemento[]) {}

  restore(): void {
    for (const part of this.parts) {
      part.restore();
    }
  }
}
