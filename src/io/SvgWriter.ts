import { NumericText } from '../model/NumericText.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';

/**
 * 文档 → SVG 文本。只通过 Shape 的通用接口（tagName / svgAttributes / textContent / children）
 * 输出，不区分具体图形类型。
 */
export class SvgWriter {
  static readonly SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  private static readonly INDENT = '  ';

  write(document: SvgDocument): string {
    const width = NumericText.serialize(document.width);
    const height = NumericText.serialize(document.height);
    const rootAttributes: Array<[string, string]> = [
      ['xmlns', SvgWriter.SVG_NAMESPACE],
      ['width', width],
      ['height', height],
      ['viewBox', `0 0 ${width} ${height}`],
      ...document.root.preservedAttributes(),
    ];
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', `<svg${this.attributes(rootAttributes)}>`];
    for (const shape of document.root.childShapes()) {
      this.writeShape(shape, 1, lines);
    }
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  private writeShape(shape: Shape, depth: number, lines: string[]): void {
    const indent = SvgWriter.INDENT.repeat(depth);
    const open = `${indent}<${shape.tagName}${this.attributes(shape.svgAttributes())}`;
    const text = shape.textContent();
    const children = shape.children();
    if (text !== null) {
      lines.push(`${open}>${this.escapeText(text)}</${shape.tagName}>`);
    } else if (children.length === 0) {
      lines.push(`${open}/>`);
    } else {
      lines.push(`${open}>`);
      for (const child of children) {
        this.writeShape(child, depth + 1, lines);
      }
      lines.push(`${indent}</${shape.tagName}>`);
    }
  }

  private attributes(entries: ReadonlyArray<[string, string]>): string {
    return entries.map(([name, value]) => ` ${name}="${this.escapeAttribute(value)}"`).join('');
  }

  private escapeText(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeText(value)
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
      .replace(/\t/g, '&#9;');
  }
}
