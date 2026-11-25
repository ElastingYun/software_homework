import { describe, expect, it } from 'vitest';
import { SvgFileRule } from '../../src/decoration/SvgFileRule';

const rule = new SvgFileRule();

describe('SvgFileRule', () => {
  it.each(['/w/example.svg', '/w/ICON.SVG', '/w/a.b.Svg', '/w/中文.svg', '/w/sub dir/x y.svg'])('%s is an SVG path', (path) => {
    expect(rule.matches(path)).toBe(true);
  });

  it.each(['/w/notes.txt', '/w/svg', '/w/example.svg.bak', '/w/example.svgz', '/w/.svg', '/w/example.svg/', '/w/svg.ts'])(
    '%s is not an SVG path',
    (path) => {
      expect(rule.matches(path)).toBe(false);
    },
  );
});
