/** 一个命令行单词；quoted 表示它来自双引号（因而永远不是关键字，如 `in`）。 */
export class Token {
  constructor(
    readonly text: string,
    readonly quoted: boolean,
  ) {}

  is(keyword: string): boolean {
    return !this.quoted && this.text === keyword;
  }
}
