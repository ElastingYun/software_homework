/** 带单复数的数量短语，如 "1 child" / "2 children"。 */
export class Quantity {
  private constructor() {}

  static of(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  static elements(count: number): string {
    return Quantity.of(count, 'element', 'elements');
  }

  static children(count: number): string {
    return Quantity.of(count, 'child', 'children');
  }
}
