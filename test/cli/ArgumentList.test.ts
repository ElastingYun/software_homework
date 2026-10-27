import { describe, expect, it } from 'vitest';
import { ArgumentList } from '../../src/cli/ArgumentList.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

const args = (line: string): ArgumentList => new ArgumentList(new Tokenizer().tokenize(line), 'cmd <a> [b]');

describe('ArgumentList', () => {
  it('checks counts with a usage message', () => {
    expect(() => args('').expectCount(1, 2)).toThrow('usage: cmd <a> [b]');
    expect(() => args('a b c').expectCount(1, 2)).toThrow('usage: cmd <a> [b]');
    expect(() => args('a').expectCount(1, 2)).not.toThrow();
  });

  it('reads numbers strictly', () => {
    expect(args('1.5 -2').number(1)).toBe(-2);
    expect(() => args('1,5').number(0)).toThrow('invalid number: 1,5');
    expect(args('7').optionalNumber(1)).toBeNull();
    expect(() => args('').text(0)).toThrow('usage: cmd <a> [b]');
  });

  it('splits a trailing in-clause', () => {
    const [rest, container] = args('rect r 1 2 3 4 in node1').splitInClause();
    expect(rest.rest(0)).toEqual(['rect', 'r', '1', '2', '3', '4']);
    expect(container).toBe('node1');
    expect(args('rect r 1 2 3 4').splitInClause()[1]).toBeNull();
    expect(args('text t 1 2 "in" g1').splitInClause()[1]).toBeNull();
    expect(() => args('rect r 1 2 3 4 in').splitInClause()).toThrow('usage: cmd <a> [b]');
  });
});
