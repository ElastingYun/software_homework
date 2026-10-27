/**
 * 所有图形共有、可经 `set` 编辑的表现属性：fill / stroke / stroke-width。
 * 未设置的属性不写入 SVG（外观遵循渲染默认值）。
 */
export class PresentationStyle {
  static readonly ATTRIBUTES: readonly string[] = ['fill', 'stroke', 'stroke-width'];

  private readonly values = new Map<string, string>();

  static accepts(name: string): boolean {
    return PresentationStyle.ATTRIBUTES.includes(name);
  }

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  set(name: string, value: string): void {
    if (!PresentationStyle.accepts(name)) {
      throw new Error(`not a presentation attribute: ${name}`);
    }
    this.values.set(name, value);
  }

  remove(name: string): void {
    this.values.delete(name);
  }

  /** 按固定顺序（fill、stroke、stroke-width）列出已设置的属性。 */
  entries(): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    for (const name of PresentationStyle.ATTRIBUTES) {
      const value = this.values.get(name);
      if (value !== undefined) {
        result.push([name, value]);
      }
    }
    return result;
  }
}
