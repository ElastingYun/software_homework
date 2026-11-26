import { SourcePosition } from './SourcePosition';

/** 文本偏移量 → 行列位置。换行符认 `\n`、`\r\n`、`\r` 三种，与 VSCode 一致。 */
export class LineIndex {
  private readonly lineStarts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
        this.lineStarts.push(i + 1);
      } else if (char === '\n' || char === '\r') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  positionAt(offset: number): SourcePosition {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if ((this.lineStarts[middle] as number) <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return new SourcePosition(low, offset - (this.lineStarts[low] as number));
  }
}
