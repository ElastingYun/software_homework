import type { ElementSource } from './ElementSource.js';
import type { Shape } from './Shape.js';
import type { ShapeParams } from './ShapeParams.js';

/**
 * 图形类的"静态侧"协议：每个具体图形类以静态成员实现它，再注册到 ShapeFactory。
 * 这是插件化阶段 ShapeProvider 插槽的前身（类型名 + create 参数 schema + 读回还原）。
 */
export interface ShapeClass {
  /** 类型名，同时是 SVG 元素名，如 "rect"。 */
  readonly typeName: string;
  /** create 的语法说明，用于 usage 错误与 help。 */
  readonly createSyntax: string;
  fromParams(id: string, params: ShapeParams): Shape;
  fromElement(source: ElementSource): Shape;
}
