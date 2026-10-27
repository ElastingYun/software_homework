import type { Element } from '@xmldom/xmldom';
import { NumericText } from '../model/NumericText.js';
import type { ElementSource } from '../model/ElementSource.js';

/** 以 DOM 元素实现 ElementSource：按需消费属性，宽松解析数值并记录警告。 */
export class DomElementSource implements ElementSource {
  private static readonly ELEMENT_NODE = 1;
  private readonly pending = new Map<string, string>();

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

  text(): string {
    if (this.hasElementChildren()) {
      this.warnings.push(`flattened nested elements in <${this.element.localName} id=${this.id}>`);
    }
    return (this.element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  remaining(): Array<[string, string]> {
    return [...this.pending.entries()];
  }

  private hasElementChildren(): boolean {
    for (let i = 0; i < this.element.childNodes.length; i++) {
      if (this.element.childNodes.item(i)?.nodeType === DomElementSource.ELEMENT_NODE) {
        return true;
      }
    }
    return false;
  }
}
