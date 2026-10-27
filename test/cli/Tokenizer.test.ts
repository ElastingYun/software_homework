import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

const tokenizer = new Tokenizer();
const texts = (line: string): string[] => tokenizer.tokenize(line).map((token) => token.text);

describe('Tokenizer', () => {
  it('splits on any whitespace', () => {
    expect(texts('  move\tc1   30 0 ')).toEqual(['move', 'c1', '30', '0']);
  });

  it('keeps double-quoted text as one token, including CJK and spaces', () => {
    expect(texts('create text title 20 40 "My Diagram"')).toEqual(['create', 'text', 'title', '20', '40', 'My Diagram']);
    expect(texts('set process-label text "处理数据 v2"')).toEqual(['set', 'process-label', 'text', '处理数据 v2']);
  });

  it('supports escapes and empty strings', () => {
    expect(texts('set t text "say \\"hi\\" \\\\ ok"')).toEqual(['set', 't', 'text', 'say "hi" \\ ok']);
    expect(texts('set t text ""')).toEqual(['set', 't', 'text', '']);
  });

  it('marks quoted tokens so that "in" is not a keyword', () => {
    const tokens = tokenizer.tokenize('create text t 1 2 "in"');
    expect(tokens.at(-1)?.quoted).toBe(true);
    expect(tokens.at(-1)?.is('in')).toBe(false);
    expect(tokenizer.tokenize('in').at(0)?.is('in')).toBe(true);
  });

  it('rejects an unterminated quote', () => {
    expect(() => tokenizer.tokenize('create text t 1 2 "oops')).toThrow('unterminated quote');
  });

  it('a backslash before other characters is literal', () => {
    expect(texts('read "C:\\dir\\a.svg"')).toEqual(['read', 'C:\\dir\\a.svg']);
  });
});
