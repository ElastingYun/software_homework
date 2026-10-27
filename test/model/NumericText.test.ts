import { describe, expect, it } from 'vitest';
import { NumericText } from '../../src/model/NumericText.js';

describe('NumericText', () => {
  it.each([
    ['10', 10],
    ['-3.5', -3.5],
    ['+2', 2],
    ['.5', 0.5],
    ['1.', 1],
    ['1e3', 1000],
    ['2.5E-1', 0.25],
  ])('parses %s', (text, value) => {
    expect(NumericText.parse(text)).toBe(value);
  });

  it.each(['', 'abc', '10px', '0x10', 'Infinity', 'NaN', '1,5', ' 1', '--1'])('rejects %j', (text) => {
    expect(NumericText.parse(text)).toBeNull();
  });

  it('require throws invalid number', () => {
    expect(() => NumericText.require('abc')).toThrow('invalid number: abc');
  });

  it.each([
    [130, '130'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333'],
    [-0, '0'],
    [-0.0000001, '-1e-7'],
    [2.5e-7, '2.5e-7'],
    [12.5, '12.5'],
    [-7, '-7'],
  ])('formats %s as %s', (value, text) => {
    expect(NumericText.format(value)).toBe(text);
  });

  it.each([
    [0.1 + 0.2, '0.3'],
    [0.12345678, '0.12345678'],
    [4e-7, '4e-7'],
    [1 / 3, '0.333333333333333'],
    [123456789.125, '123456789.125'],
    [-0, '0'],
  ])('serialises %s losslessly as %s', (value, text) => {
    expect(NumericText.serialize(value)).toBe(text);
  });
});
