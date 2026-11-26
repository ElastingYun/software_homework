import type { OutlineNode } from '../../src/outline/OutlineNode';

/** 把大纲树压平成缩进文本，便于整体断言层级与顺序。 */
export class OutlineText {
  static of(nodes: readonly OutlineNode[], depth = 0): string[] {
    return nodes.flatMap((node) => [`${'  '.repeat(depth)}${node.label}`, ...OutlineText.of(node.children, depth + 1)]);
  }
}
