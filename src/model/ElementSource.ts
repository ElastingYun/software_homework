/**
 * 从外部 SVG 元素构造图形时的数据来源（由 io 模块实现）。
 * 每读取一个属性即"消费"它；未消费的属性作为透传属性原样保留。
 */
export interface ElementSource {
  /** 已确定的 id（缺失或重复时由读入方分配）。 */
  readonly id: string;
  /** 读取数值属性：缺失按 SVG 默认值 0；无法解析时记录警告并取 0。 */
  number(name: string): number;
  /** 读取字符串属性，缺失返回 undefined。 */
  take(name: string): string | undefined;
  /** 元素的文本内容（空白已规范化）。 */
  text(): string;
  /** 尚未消费的属性。 */
  remaining(): Array<[string, string]>;
}
