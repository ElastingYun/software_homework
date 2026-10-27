import type { Element, Node } from '@xmldom/xmldom';
import { NumericText } from '../model/NumericText.js';
import type { ElementSource } from '../model/ElementSource.js';

/** 以 DOM 元素实现 ElementSource：按需消费属性与子元素，宽松解析数值并记录警告。 */
export class DomElementSource implements ElementSource {
  private static readonly ELEMENT_NODE = 1;
  private static readonly TEXT_NODE = 3;
  private static readonly CDATA_SECTION_NODE = 4;
  /** SVG 中其字符数据属于外层 <text> 可见文本的元素。 */
  private static readonly TEXT_CONTENT_ELEMENTS = new Set(['tspan', 'textPath', 'a']);
  private readonly pending = new Map<string, string>();
  private readonly consumedChildren = new Set<Node>();

  constructor(
    private readonly element: Element,
    readonly id: string,
    private readonly warnings: string[],
  ) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i);
      if (attribute !== null && attribute.name !== 'id' && !DomElementSource.isNamespaceDeclaration(attribute.name)) {
        this.pending.set(attribute.name, attribute.value);
      }
    }
  }

  /** `xmlns` / `xmlns:p` 由读入方统一提升到根元素，不作为图形的透传属性。 */
  static isNamespaceDeclaration(name: string): boolean {
    return name === 'xmlns' || name.startsWith('xmlns:');
  }

  number(name: string): number {
    const raw = this.take(name);
    if (raw === undefined) {
      return 0;
    }
    const value = NumericText.parse(raw.trim().replace(/px$/, ''));
    if (value === null) {
      this.warnings.push(`invalid number ${name}="${raw}" on <${this.element.localName} id=${this.id}>, using 0`);
      return 0;
    }
    return value;
  }

  take(name: string): string | undefined {
    const value = this.pending.get(name);
    this.pending.delete(name);
    return value;
  }

  /**
   * 可见文本：直接的文本/CDATA 节点，加上 tspan / textPath / a 中的文本（展平并警告）；
   * title、desc、animate 等其他子元素不属于可见文本，留给 unusedChildElements 报告。
   */
  text(): string {
    const parts: string[] = [];
    for (const child of this.childNodes(this.element)) {
      if (this.isCharacterData(child)) {
        parts.push(child.nodeValue ?? '');
      } else if (this.isTextContentElement(child)) {
        this.consumedChildren.add(child);
        parts.push(child.textContent ?? '');
      }
    }
    if (this.consumedChildren.size > 0) {
      this.warnings.push(`flattened nested elements in <${this.element.localName} id=${this.id}>`);
    }
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  remaining(): Array<[string, string]> {
    return [...this.pending.entries()];
  }

  /** 构造叶子图形后仍未被使用的子元素（标签名），读入方据此警告。 */
  unusedChildElements(): string[] {
    return this.childNodes(this.element)
      .filter((child) => child.nodeType === DomElementSource.ELEMENT_NODE && !this.consumedChildren.has(child))
      .map((child) => (child as Element).tagName);
  }

  private childNodes(node: Node): Node[] {
    const result: Node[] = [];
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes.item(i);
      if (child !== null) {
        result.push(child);
      }
    }
    return result;
  }

  private isCharacterData(node: Node): boolean {
    return node.nodeType === DomElementSource.TEXT_NODE || node.nodeType === DomElementSource.CDATA_SECTION_NODE;
  }

  private isTextContentElement(node: Node): boolean {
    return (
      node.nodeType === DomElementSource.ELEMENT_NODE &&
      DomElementSource.TEXT_CONTENT_ELEMENTS.has((node as Element).localName ?? '')
    );
  }
}
