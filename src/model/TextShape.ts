import { HorizontalAxis } from './HorizontalAxis.js';
import { LeafShape } from './LeafShape.js';
import { VerticalAxis } from './VerticalAxis.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeParams } from './ShapeParams.js';

/** 文字：位置是几何量，内容是子文本（不是属性），经 `set <id> text "…"` 修改。 */
export class TextShape extends LeafShape {
  static readonly typeName = 'text';
  static readonly createSyntax = 'create text <id> <x> <y> "content"';
  private static readonly CONTENT = 'text';

  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.geometry.define('x', HorizontalAxis.INSTANCE, x).define('y', VerticalAxis.INSTANCE, y);
    this.content = content;
  }

  static fromParams(id: string, params: ShapeParams): TextShape {
    const shape = new TextShape(id, params.number(), params.number(), params.text());
    params.end();
    return shape;
  }

  static fromElement(source: ElementSource): TextShape {
    return new TextShape(source.id, source.number('x'), source.number('y'), source.text());
  }

  get tagName(): string {
    return TextShape.typeName;
  }

  summary(): string {
    return `(${this.show('x')},${this.show('y')}) "${this.content}"`;
  }

  override textContent(): string {
    return this.content;
  }

  protected anchor(): [number, number] {
    return [this.geometry.get('x'), this.geometry.get('y')];
  }

  protected override ownAttributeNames(): string[] {
    return [...super.ownAttributeNames(), TextShape.CONTENT];
  }

  protected override readOwnAttribute(name: string): string {
    return name === TextShape.CONTENT ? this.content : super.readOwnAttribute(name);
  }

  protected override writeOwnAttribute(name: string, value: string): void {
    if (name === TextShape.CONTENT) {
      this.content = value;
      return;
    }
    super.writeOwnAttribute(name, value);
  }

  protected override displayOwnAttribute(name: string): string {
    return name === TextShape.CONTENT ? `"${this.content}"` : super.displayOwnAttribute(name);
  }
}
