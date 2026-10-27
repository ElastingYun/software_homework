import { EditorError } from './EditorError.js';
import { PresentationStyle } from './PresentationStyle.js';
import { XmlCharacters } from './XmlCharacters.js';
import type { Container } from './Container.js';
import type { GroupShape } from './GroupShape.js';
import type { ShapeMemento } from './ShapeMemento.js';

/**
 * 图形（Composite 中的组件）。叶子与容器共享同一套操作：
 * 移动、缩放、属性读写、序列化所需的属性表、树形摘要。
 *
 * 属性分三类：
 * - 自身属性（几何量、text 的文本内容）：由子类声明，可 `set`；
 * - 表现属性（fill / stroke / stroke-width）：所有图形共有，可 `set`；
 * - 透传属性：读入外部 SVG 时遇到的其他属性，原样保存与写回，不可 `set`。
 */
export abstract class Shape {
  private readonly shapeId: string;
  private parentContainer: Container | null = null;
  private readonly style = new PresentationStyle();
  private readonly passthrough = new Map<string, string>();

  protected constructor(id: string) {
    if (id.length === 0) {
      throw new EditorError('id must not be empty');
    }
    this.shapeId = XmlCharacters.require(id, 'id');
  }

  get id(): string {
    return this.shapeId;
  }

  get parent(): Container | null {
    return this.parentContainer;
  }

  /** 仅供 ChildList 维护父指针。 */
  setParent(container: Container | null): void {
    this.parentContainer = container;
  }

  /** SVG 元素名，如 "rect"。 */
  abstract get tagName(): string;

  /** 消息中使用的名字，如 "rect#r1"。 */
  get label(): string {
    return `${this.tagName}#${this.id}`;
  }

  // ---------- Composite ----------

  children(): readonly Shape[] {
    return [];
  }

  /** 容器返回自身，叶子返回 null（代替 instanceof 判断）。 */
  asContainer(): GroupShape | null {
    return null;
  }

  /** 内部结构由插件所有的复合图形（如未来的 box）返回 true，禁止 ungroup。 */
  isComposite(): boolean {
    return false;
  }

  isAncestorOf(_other: Shape): boolean {
    return false;
  }

  /** 自身及全部子孙，先序（文档序）。 */
  selfAndDescendants(): Shape[] {
    return [this, ...this.children().flatMap((child) => child.selfAndDescendants())];
  }

  abstract moveBy(dx: number, dy: number): void;

  /** 等比缩放：系数同乘到全部几何属性（容器递归到每个子孙）。 */
  abstract scaleBy(factor: number): void;

  abstract createMemento(): ShapeMemento;

  /** move 回显的动词短语，如 "moved to (130,100)"（叶子）或 "moved by (0,100)"（容器）。 */
  abstract describeMove(verb: string, dx: number, dy: number): string;

  /** tree 中内联显示的关键属性摘要。 */
  abstract summary(): string;

  // ---------- 可编辑属性（set 白名单） ----------

  settableAttributes(): string[] {
    return [...this.ownAttributeNames(), ...PresentationStyle.ATTRIBUTES];
  }

  /** 原始值（数值为完整精度），未设置返回 undefined；不在白名单抛 unknown attribute。 */
  getAttribute(name: string): string | undefined {
    if (PresentationStyle.accepts(name)) {
      return this.style.get(name);
    }
    return this.readOwnAttribute(name);
  }

  /** 校验后写入；校验失败抛出 EditorError 且不改变状态。 */
  setAttribute(name: string, value: string): void {
    if (PresentationStyle.accepts(name)) {
      this.style.set(name, XmlCharacters.require(value, name));
      return;
    }
    this.writeOwnAttribute(name, value);
  }

  /** 移除可选属性（仅表现属性可移除；用于撤销"从无到有"的 set）。 */
  removeAttribute(name: string): void {
    if (!PresentationStyle.accepts(name)) {
      throw new EditorError(`cannot remove attribute: ${name}`);
    }
    this.style.remove(name);
  }

  /** 回显用的"名=值"，如 `fill=red`、`x=10`、`text="Hi"`；未设置时为 `fill unset`。 */
  describeAttribute(name: string): string {
    if (PresentationStyle.accepts(name)) {
      const value = this.style.get(name);
      return value === undefined ? `${name} unset` : `${name}=${value}`;
    }
    return `${name}=${this.displayOwnAttribute(name)}`;
  }

  protected ownAttributeNames(): string[] {
    return [];
  }

  protected readOwnAttribute(name: string): string {
    throw Shape.unknownAttribute(name);
  }

  protected writeOwnAttribute(name: string, _value: string): void {
    throw Shape.unknownAttribute(name);
  }

  protected displayOwnAttribute(name: string): string {
    throw Shape.unknownAttribute(name);
  }

  protected static unknownAttribute(name: string): EditorError {
    return new EditorError(`unknown attribute: ${name}`);
  }

  /** 摘要中附加 fill（若已设置），供闭合图形使用。 */
  protected withFill(text: string): string {
    const fill = this.style.get('fill');
    return fill === undefined ? text : `${text} fill=${fill}`;
  }

  /** 自身属性（几何量、文本）的"名=值"列表，如 ["cx=100", "cy=100", "r=20"]。 */
  describeOwnAttributes(): string[] {
    return this.ownAttributeNames().map((name) => this.describeAttribute(name));
  }

  /** 已设置的表现属性的"名=值"列表，如 ["fill=red"]。 */
  describeStyle(): string[] {
    return this.style.entries().map(([name, value]) => `${name}=${value}`);
  }

  // ---------- 序列化 ----------

  /** 透传属性：读入时保留、保存时写回。 */
  preserveAttribute(name: string, value: string): void {
    this.passthrough.set(name, value);
  }

  preservedAttributes(): Array<[string, string]> {
    return [...this.passthrough.entries()];
  }

  /** 已设置的表现属性（固定顺序）。 */
  styleAttributes(): Array<[string, string]> {
    return this.style.entries();
  }

  /** 写入 SVG 的属性表（有序）：id、自身属性、表现属性、透传属性。 */
  svgAttributes(): Array<[string, string]> {
    return [['id', this.id], ...this.ownSvgAttributes(), ...this.style.entries(), ...this.preservedAttributes()];
  }

  /** 元素的文本内容（仅 text 有），其他图形为 null。 */
  textContent(): string | null {
    return null;
  }

  protected ownSvgAttributes(): Array<[string, string]> {
    return [];
  }
}
