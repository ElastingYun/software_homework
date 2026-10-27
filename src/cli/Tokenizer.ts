import { EditorError } from '../model/EditorError.js';
import { Token } from './Token.js';

/**
 * 把一行命令切分为单词：空白分隔；双引号包裹的部分是一个单词（可含空格，
 * 支持 `\"` 与 `\\` 转义，`""` 表示空串）。
 */
export class Tokenizer {
  tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index] as string)) {
        index += 1;
      } else if (line[index] === '"') {
        index = this.readQuoted(line, index + 1, tokens);
      } else {
        const start = index;
        while (index < line.length && !/\s/.test(line[index] as string)) {
          index += 1;
        }
        tokens.push(new Token(line.slice(start, index), false));
      }
    }
    return tokens;
  }

  /** 从开引号之后读到闭引号，返回闭引号之后的位置。 */
  private readQuoted(line: string, start: number, tokens: Token[]): number {
    let text = '';
    let index = start;
    while (index < line.length && line[index] !== '"') {
      const next = line[index + 1];
      if (line[index] === '\\' && (next === '"' || next === '\\')) {
        text += next;
        index += 2;
      } else {
        text += line[index];
        index += 1;
      }
    }
    if (index >= line.length) {
      throw new EditorError('unterminated quote');
    }
    tokens.push(new Token(text, true));
    return index + 1;
  }
}
