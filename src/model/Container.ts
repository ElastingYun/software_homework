import type { Shape } from './Shape.js';

/**
 * 能容纳子图形的节点：画布根 `<svg>`（CanvasRoot）与 `<g>`（GroupShape）。
 * 子节点顺序即 z-order：越靠后越在上层。
 * 结构修改（insertChild / removeChild）只应由 SvgDocument 调用，以保持 id 索引一致。
 */
export interface Container {
  /** 消息中使用的名字："svg" 或 "g#<id>"。 */
  readonly containerLabel: string;
  readonly parent: Container | null;
  isRoot(): boolean;
  childShapes(): readonly Shape[];
  indexOfChild(shape: Shape): number;
  insertChild(shape: Shape, index: number): void;
  /** 返回被移除子节点原来的下标。 */
  removeChild(shape: Shape): number;
}
