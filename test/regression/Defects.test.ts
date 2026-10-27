import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SvgEditorApp } from '../../src/app/SvgEditorApp.js';
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

describe('BUG-2 (fixed in v0.8.1): very deep nesting overflowed the stack in the middle of a command', () => {
  const MAX = 500;

  function chain(depth: number): CliSession {
    const session = new CliSession();
    session.run('init', 'create g g1');
    for (let i = 2; i <= depth; i++) {
      session.run(`create g g${i} in g${i - 1}`);
    }
    return session;
  }

  it('nesting beyond the limit is rejected cleanly and changes nothing', () => {
    const session = chain(MAX);
    session.expectError(`create rect r 0 0 1 1 in g${MAX}`, `nesting too deep (at most ${MAX} levels)`);
    session.expectError(`create g extra in g${MAX}`, `nesting too deep (at most ${MAX} levels)`);
    session.run('create rect leaf 0 0 1 1');
    session.expectError(`addto g${MAX} leaf`, `nesting too deep (at most ${MAX} levels)`);
    session.expectError('group wrapper g1', `nesting too deep (at most ${MAX} levels)`);
  });

  it('every operation works at the maximum depth', () => {
    const session = chain(MAX - 1);
    expect(session.run(`create rect deep 1 2 3 4 in g${MAX - 1}`)).toEqual([`rect#deep created in g#g${MAX - 1}`]);
    expect(session.run('move g1 1 1')).toEqual(['g#g1 moved by (1,1)']);
    expect(session.run('scale g1 2')).toEqual(['g#g1 scaled by 2']);
    expect(session.run('tree').at(-1)).toMatch(/rect#deep +x=4 y=6 w=6 h=8$/);
    expect(session.run('show deep')[0]).toBe(`rect#deep  parent=g#g${MAX - 1}`);
    expect(session.run('delete g1')).toEqual(['g#g1 deleted']);
    expect(session.run('undo')).toEqual(['g#g1 restored']);
    expect(session.run('save deep.svg')).toEqual([`saved to deep.svg (${MAX} elements)`]);
    expect(session.run('read deep.svg')).toEqual([`read deep.svg (${MAX} elements)`]);
  });

  it('a file nested deeper than the limit is refused with the file name', () => {
    const body = '<g>'.repeat(MAX + 1) + '</g>'.repeat(MAX + 1);
    const session = new CliSession();
    session.storage.files.set('deep.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">${body}</svg>`);
    session.expectError('read deep.svg', `cannot read file: deep.svg (nesting too deep (at most ${MAX} levels))`);
  });

  it('even absurdly deep files fail cleanly instead of overflowing the stack', () => {
    const depth = 50_000;
    const session = new CliSession();
    session.storage.files.set('abyss.svg', `<svg xmlns="http://www.w3.org/2000/svg">${'<g>'.repeat(depth)}${'</g>'.repeat(depth)}</svg>`);
    expect(session.run('read abyss.svg')[0]).toMatch(/^error: cannot read file: abyss\.svg \(/);
  });
});

describe('BUG-3 (fixed in v0.8.2): namespace declarations on inner elements were lost when shapes moved', () => {
  const nested =
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><g id="layer">' +
    '<g id="sub" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"><rect id="r" inkscape:label="box"/></g>' +
    '</g></svg>';

  it.each([
    ['ungroup', ['ungroup sub'], 2],
    ['addto', ['create g top', 'addto top r'], 4],
  ])('after %s the saved file is still readable', (_name, edits, count) => {
    const session = new CliSession();
    session.storage.files.set('ns.svg', nested);
    session.run('read ns.svg', ...edits, 'save out.svg');
    expect(session.file('out.svg')).toContain('xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"');
    expect(session.run('read out.svg')).toEqual([`read out.svg (${count} elements)`]);
    expect(session.run('show r')).toContain('  preserved: inkscape:label="box"');
  });

  it('declarations are hoisted to the root, so ungroup has no attribute to drop', () => {
    const session = new CliSession();
    session.storage.files.set('ns.svg', nested);
    session.run('read ns.svg');
    expect(session.run('ungroup sub')).toEqual(['g#sub ungrouped, 1 child moved to g#layer']);
  });

  it('a prefix bound to two different URIs keeps the first and warns', () => {
    const session = new CliSession();
    session.storage.files.set(
      'two.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:p="urn:a" width="1" height="1"><g id="g" xmlns:p="urn:b"/></svg>',
    );
    expect(session.run('read two.svg')).toEqual([
      'warning: namespace prefix p on <g id=g> rebinds "urn:a" to "urn:b"; keeping "urn:a"',
      'read two.svg (1 element)',
    ]);
  });
});

describe('BUG-4 (fixed in v0.8.3): save rounded every number to 6 decimals', () => {
  it('read → save keeps small and precise values', () => {
    const session = new CliSession();
    session.storage.files.set(
      'p.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
        '<rect id="r" x="0.12345678" y="0.0000004" width="0.0000003" height="0.5"/></svg>',
    );
    session.run('read p.svg', 'save');
    expect(session.file('p.svg')).toContain('<rect id="r" x="0.12345678" y="4e-7" width="3e-7" height="0.5"/>');
  });

  it('values typed on the command line survive save and read', () => {
    const session = new CliSession();
    session.run('init', 'create rect p 0 0 2.5e-7 1', 'canvas 1e-7 1', 'save p.svg');
    expect(session.file('p.svg')).toContain('width="1e-7" height="1" viewBox="0 0 1e-7 1"');
    expect(session.file('p.svg')).toContain('<rect id="p" x="0" y="0" width="2.5e-7" height="1"/>');
    expect(session.run('read p.svg')).toEqual(['read p.svg (1 element)']);
  });

  it('floating-point noise is still removed from files', () => {
    const session = new CliSession();
    session.run('init', 'create rect r 0.1 0 1 1', 'move r 0.2 0', 'save n.svg');
    expect(session.file('n.svg')).toContain('<rect id="r" x="0.3" ');
  });

  it('display shows tiny non-zero values instead of a misleading 0', () => {
    const session = new CliSession();
    session.run('init', 'create rect p 0 0 2.5e-7 1');
    expect(session.run('tree p')).toEqual(['rect#p  x=0 y=0 w=2.5e-7 h=1']);
  });
});

describe('BUG-5 (fixed in v0.8.4): files starting with a UTF-8 byte order mark could not be read', () => {
  it('reads a file with a BOM', () => {
    const session = new CliSession();
    session.storage.files.set('bom.svg', '﻿<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle id="c" r="1"/></svg>');
    expect(session.run('read bom.svg')).toEqual(['read bom.svg (1 element)']);
  });

  it('reads a BOM file from disk through the real storage', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'bom-')), 'bom.svg');
    writeFileSync(path, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')]));
    expect(new SvgEditorApp().interpreter.interpret(`read "${path}"`)).toEqual([`read ${path} (0 elements)`]);
  });
});
