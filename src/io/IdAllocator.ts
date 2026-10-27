/**
 * 读入时的 id 分配：显式 id 先到先得；缺 id 或重复的元素分配 `标签名+序号`
 * （rect1、rect2…），并跳过文件中出现过的全部显式 id。
 */
export class IdAllocator {
  private readonly reserved: ReadonlySet<string>;
  private readonly claimed = new Set<string>();
  private readonly counters = new Map<string, number>();

  constructor(reserved: Iterable<string>) {
    this.reserved = new Set(reserved);
  }

  /** 首次出现的 id 被占用并返回 true；重复出现返回 false。 */
  claim(id: string): boolean {
    if (this.claimed.has(id)) {
      return false;
    }
    this.claimed.add(id);
    return true;
  }

  next(tagName: string): string {
    let counter = this.counters.get(tagName) ?? 0;
    let candidate: string;
    do {
      counter += 1;
      candidate = `${tagName}${counter}`;
    } while (this.reserved.has(candidate) || this.claimed.has(candidate));
    this.counters.set(tagName, counter);
    this.claimed.add(candidate);
    return candidate;
  }
}
