/**
 * 几何量的"轴"策略（Strategy）：决定一个几何字段在平移时如何变化、取值是否合法。
 * 缩放对所有轴相同（同乘系数），因此不在策略中。
 */
export interface GeometryAxis {
  translate(value: number, dx: number, dy: number): number;
  /** 不合法时抛出 EditorError。 */
  validate(name: string, value: number): void;
}
