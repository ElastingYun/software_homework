import { EditorError } from './EditorError.js';
import { PresentationStyle } from './PresentationStyle.js';
import { ShapeParams } from './ShapeParams.js';
import type { ElementSource } from './ElementSource.js';
import type { Shape } from './Shape.js';
import type { ShapeClass } from './ShapeClass.js';

/**
 * 图形工厂：类型名 → 图形类。
 * 【按名字分派之一，待重构】本阶段由组装根注册内置的 6 种类型；
 * 插件化阶段演进为 ShapeProvider 插槽（插件自行注册类型）。
 */
export class ShapeFactory {
  private readonly classes = new Map<string, ShapeClass>();

  register(shapeClass: ShapeClass): this {
    if (this.classes.has(shapeClass.typeName)) {
      throw new Error(`shape type already registered: ${shapeClass.typeName}`);
    }
    this.classes.set(shapeClass.typeName, shapeClass);
    return this;
  }

  supports(typeName: string): boolean {
    return this.classes.has(typeName);
  }

  /** 已注册类型的 create 语法（help 使用）。 */
  syntaxes(): string[] {
    return [...this.classes.values()].map((shapeClass) => shapeClass.createSyntax);
  }

  /** CLI：`create <type> <id> <params…>`。 */
  create(typeName: string, id: string, params: readonly string[]): Shape {
    const shapeClass = this.require(typeName);
    return shapeClass.fromParams(id, new ShapeParams(params, shapeClass.createSyntax));
  }

  /** 读入：由 SVG 元素构造图形；表现属性与透传属性对所有类型统一处理。 */
  fromElement(typeName: string, source: ElementSource): Shape {
    const shape = this.require(typeName).fromElement(source);
    for (const name of PresentationStyle.ATTRIBUTES) {
      const value = source.take(name);
      if (value !== undefined) {
        shape.setAttribute(name, value);
      }
    }
    for (const [name, value] of source.remaining()) {
      shape.preserveAttribute(name, value);
    }
    return shape;
  }

  private require(typeName: string): ShapeClass {
    const shapeClass = this.classes.get(typeName);
    if (shapeClass === undefined) {
      throw new EditorError(`unknown shape type: ${typeName} (is the plugin loaded?)`);
    }
    return shapeClass;
  }
}
