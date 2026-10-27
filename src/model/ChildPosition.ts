import type { Container } from './Container.js';

/** 不可变值对象：图形在某个容器中的位置（用于撤销时放回原处）。 */
export class ChildPosition {
  constructor(
    readonly container: Container,
    readonly index: number,
  ) {}
}
