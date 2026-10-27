import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { EditorError } from '../model/EditorError.js';
import { NumericText } from '../model/NumericText.js';
import { SvgDocument } from '../model/SvgDocument.js';
import type { Container } from '../model/Container.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import { DomElementSource } from './DomElementSource.js';
import { IdAllocator } from './IdAllocator.js';
import { LoadedDocument } from './LoadedDocument.js';
import { SvgWriter } from './SvgWriter.js';

/**
 * SVG 文本 → 文档。元素按标签名交给 ShapeFactory 构造；
 * 缺 id / 重复 id 自动分配，不支持的元素跳过，均产生警告。
 */
export class SvgReader {
  private static readonly ELEMENT_NODE = 1;
  /** Windows 编辑器常在 UTF-8 文件开头写入 BOM；XML 规范允许它出现，解析前去掉。 */
  private static readonly BYTE_ORDER_MARK = '\uFEFF';
  private static readonly MANAGED_ROOT_ATTRIBUTES = new Set(['xmlns', 'width', 'height', 'viewBox']);

  constructor(private readonly factory: ShapeFactory) {}

  /** @param source 来源名（文件路径），用于错误信息。 */
  read(xml: string, source: string): LoadedDocument {
    const root = this.parse(xml, source);
    if (this.elementDepth(root) > SvgDocument.MAX_DEPTH) {
      throw new EditorError(
        `cannot read file: ${source} (nesting too deep (at most ${SvgDocument.MAX_DEPTH} levels))`,
      );
    }
    const warnings: string[] = [];
    const [width, height] = this.canvasSize(root, warnings);
    const document = new SvgDocument(width, height);
    this.preserveRootAttributes(root, document);
    const allocator = new IdAllocator(this.explicitIds(root));
    const rootId = root.getAttribute('id');
    if (rootId !== null && rootId !== '') {
      allocator.claim(rootId);
    }
    this.readChildren(root, document.root, document, allocator, warnings);
    return new LoadedDocument(document, warnings);
  }

  private parse(xml: string, source: string): Element {
    let root: Element | null;
    try {
      const text = xml.startsWith(SvgReader.BYTE_ORDER_MARK) ? xml.slice(1) : xml;
      root = new DOMParser({ onError: onErrorStopParsing }).parseFromString(text, 'image/svg+xml').documentElement;
    } catch (error) {
      const reason = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error);
      throw new EditorError(`cannot read file: ${source} (invalid XML: ${reason})`);
    }
    if (root === null || root.localName !== 'svg' || !this.inSvgNamespace(root)) {
      throw new EditorError(`cannot read file: ${source} (root element is not <svg>)`);
    }
    return root;
  }

  /** 根元素之下的最大嵌套层数（迭代计算）；超限的文件在任何递归处理之前被拒绝。 */
  private elementDepth(root: Element): number {
    let depth = 0;
    const pending: Array<[Element, number]> = this.childElements(root).map((child) => [child, 1]);
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      const [element, level] = next;
      depth = Math.max(depth, level);
      for (const child of this.childElements(element)) {
        pending.push([child, level + 1]);
      }
    }
    return depth;
  }

  private canvasSize(root: Element, warnings: string[]): [number, number] {
    const rawViewBox = root.getAttribute('viewBox');
    const viewBox = this.parseViewBox(rawViewBox);
    let width = this.parseLength(root.getAttribute('width')) ?? viewBox?.[2] ?? null;
    let height = this.parseLength(root.getAttribute('height')) ?? viewBox?.[3] ?? null;
    if (width === null || height === null) {
      width ??= SvgDocument.DEFAULT_WIDTH;
      height ??= SvgDocument.DEFAULT_HEIGHT;
      warnings.push(`canvas size not specified, using ${NumericText.format(width)}x${NumericText.format(height)}`);
    }
    if (viewBox !== null && (viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height)) {
      warnings.push(
        `viewBox "${rawViewBox}" ignored, using "0 0 ${NumericText.format(width)} ${NumericText.format(height)}"`,
      );
    }
    return [width, height];
  }

  /** 正数长度（允许 px 后缀）；缺失或无法解析返回 null。 */
  private parseLength(raw: string | null): number | null {
    if (raw === null || raw.trim() === '') {
      return null;
    }
    const value = NumericText.parse(raw.trim().replace(/px$/, ''));
    return value !== null && value > 0 ? value : null;
  }

  private parseViewBox(raw: string | null): number[] | null {
    if (raw === null) {
      return null;
    }
    const parts = raw.trim().split(/[\s,]+/).map((part) => NumericText.parse(part));
    if (parts.length !== 4 || parts.some((part) => part === null) || (parts[2] as number) <= 0 || (parts[3] as number) <= 0) {
      return null;
    }
    return parts as number[];
  }

  private preserveRootAttributes(root: Element, document: SvgDocument): void {
    for (let i = 0; i < root.attributes.length; i++) {
      const attribute = root.attributes.item(i);
      if (attribute !== null && !SvgReader.MANAGED_ROOT_ATTRIBUTES.has(attribute.name)) {
        document.root.preserveAttribute(attribute.name, attribute.value);
      }
    }
  }

  /** 第一遍：收集所有可导入元素的显式 id，自动分配时须避开它们。 */
  private explicitIds(element: Element, ids: string[] = []): string[] {
    for (const child of this.childElements(element)) {
      if (this.importableTag(child) !== null) {
        const id = child.getAttribute('id');
        if (id !== null && id !== '') {
          ids.push(id);
        }
        this.explicitIds(child, ids);
      }
    }
    return ids;
  }

  /** 第二遍：按文档序构造图形并挂入容器。 */
  private readChildren(
    element: Element,
    container: Container,
    document: SvgDocument,
    allocator: IdAllocator,
    warnings: string[],
  ): void {
    for (const child of this.childElements(element)) {
      const tag = this.importableTag(child);
      if (tag === null) {
        warnings.push(`skipped unsupported element <${child.tagName}>`);
        continue;
      }
      const id = this.resolveId(child, tag, allocator, warnings);
      this.hoistNamespaces(child, id, document, warnings);
      const source = new DomElementSource(child, id, warnings);
      let shape;
      try {
        shape = this.factory.fromElement(tag, source);
      } catch (error) {
        if (error instanceof EditorError) {
          warnings.push(`skipped <${tag} id=${id}>: ${error.message}`);
          continue;
        }
        throw error;
      }
      document.attach(shape, container);
      const nested = shape.asContainer();
      if (nested !== null) {
        this.readChildren(child, nested, document, allocator, warnings);
      } else {
        this.reportDroppedChildren(source, tag, id, warnings);
      }
    }
  }

  /**
   * 把元素上的 `xmlns:p` 声明提升到根元素：图形之后被 ungroup / addto 移到别处时，
   * 其带前缀的透传属性仍在声明作用域内，保存的文件始终是合法 XML。
   */
  private hoistNamespaces(element: Element, id: string, document: SvgDocument, warnings: string[]): void {
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i);
      if (attribute === null || !attribute.name.startsWith('xmlns:')) {
        continue;
      }
      const existing = document.root.preservedAttribute(attribute.name);
      if (existing === undefined) {
        document.root.preserveAttribute(attribute.name, attribute.value);
      } else if (existing !== attribute.value) {
        const prefix = attribute.name.slice('xmlns:'.length);
        warnings.push(
          `namespace prefix ${prefix} on <${element.localName} id=${id}> rebinds "${existing}" to "${attribute.value}"; keeping "${existing}"`,
        );
      }
    }
  }

  /** 叶子图形没有子节点：其中未被用作文本的子元素无法保留，如实警告（GUIDE D7）。 */
  private reportDroppedChildren(source: DomElementSource, tag: string, id: string, warnings: string[]): void {
    const dropped = source.unusedChildElements();
    if (dropped.length > 0) {
      warnings.push(`dropped child elements of <${tag} id=${id}>: ${dropped.map((name) => `<${name}>`).join(', ')}`);
    }
  }

  private resolveId(element: Element, tag: string, allocator: IdAllocator, warnings: string[]): string {
    const explicit = element.getAttribute('id');
    if (explicit !== null && explicit !== '') {
      if (allocator.claim(explicit)) {
        return explicit;
      }
      const assigned = allocator.next(tag);
      warnings.push(`duplicate id ${explicit} on <${tag}>, assigned ${assigned}`);
      return assigned;
    }
    const assigned = allocator.next(tag);
    warnings.push(`assigned id ${assigned} to unnamed <${tag}>`);
    return assigned;
  }

  /** SVG 命名空间中、且已注册类型的元素返回其标签名，否则 null。 */
  private importableTag(element: Element): string | null {
    const tag = element.localName;
    return tag !== null && this.inSvgNamespace(element) && this.factory.supports(tag) ? tag : null;
  }

  private inSvgNamespace(element: Element): boolean {
    return element.namespaceURI === SvgWriter.SVG_NAMESPACE || element.namespaceURI === null;
  }

  private childElements(element: Element): Element[] {
    const result: Element[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes.item(i);
      if (node !== null && node.nodeType === SvgReader.ELEMENT_NODE) {
        result.push(node as Element);
      }
    }
    return result;
  }
}
