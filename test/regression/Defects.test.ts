import { describe, expect, it } from 'vitest';
import { CliSession } from '../support/CliSession.js';

/**
 * 回归测试：系统测试阶段发现的每个缺陷一个 describe，标题注明缺陷编号与修正版本。
 * 现象 / 原因 / 修正记录在 CHANGELOG 与 doc/README.md 过程记录中。
 */

describe('BUG-1 (fixed in v0.7.1): move/scale could overflow geometry to Infinity', () => {
  it('scale that overflows is rejected and changes nothing', () => {
    const session = new CliSession();
    session.run('init', 'create circle c 1e300 0 1e300');
    session.expectError('scale c 1e10', 'cx out of range');
    expect(session.run('tree c')).toEqual(['circle#c  cx=1e+300 cy=0 r=1e+300']);
  });

  it('move that overflows is rejected and changes nothing', () => {
    const session = new CliSession();
    session.run('init', 'create rect r 1e308 0 1 1');
    session.expectError('move r 1e308 0', 'x out of range');
  });

  it('a container is never left half-scaled when a later descendant overflows', () => {
    const session = new CliSession();
    session.run('init', 'create g g', 'create rect small 1 1 1 1 in g', 'create rect huge 1e300 0 1 1 in g');
    session.expectError('scale g 1e10', 'x out of range');
    expect(session.run('show small')[1]).toBe('  x=1 y=1 width=1 height=1');
  });

  it('saved files never contain Infinity or NaN', () => {
    const session = new CliSession();
    session.run('init', 'create circle c 1e300 0 1e300', 'scale c 1e10', 'move c 1e308 1e308', 'save out.svg');
    expect(session.file('out.svg')).not.toMatch(/Infinity|NaN/);
  });
});
