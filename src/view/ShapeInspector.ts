import type { Shape } from '../model/Shape.js';

/**
 * `show` 的文本渲染：标签与父容器、自身属性、表现属性、透传属性（只读）、子图形。
 */
export class ShapeInspector {
  private static readonly INDENT = '  ';

  render(shape: Shape): string[] {
    const lines = [`${shape.label}  parent=${shape.parent?.containerLabel ?? '(detached)'}`];
    this.addLine(lines, shape.describeOwnAttributes());
    this.addLine(lines, shape.describeStyle());
    this.addLine(
      lines,
      shape.preservedAttributes().map(([name, value]) => `${name}="${value}"`),
      'preserved: ',
    );
    if (shape.asContainer() !== null) {
      const children = shape.children().map((child) => child.label);
      lines.push(`${ShapeInspector.INDENT}children: ${children.length === 0 ? '(none)' : children.join(', ')}`);
    }
    return lines;
  }

  private addLine(lines: string[], parts: string[], prefix = ''): void {
    if (parts.length > 0) {
      lines.push(`${ShapeInspector.INDENT}${prefix}${parts.join(' ')}`);
    }
  }
}
