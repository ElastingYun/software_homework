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

describe('BUG-6 (fixed in v0.8.5): child elements of leaf shapes were dropped silently', () => {
  function read(body: string): CliSession {
    const session = new CliSession();
    session.storage.files.set('leaf.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${body}</svg>`);
    session.run('read leaf.svg');
    return session;
  }

  it('warns about every dropped child of a leaf', () => {
    const session = new CliSession();
    session.storage.files.set(
      'leaf.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
        '<rect id="r"><title>tip</title><animate attributeName="x"/></rect><circle id="c" r="1"><rect id="inner"/></circle></svg>',
    );
    expect(session.run('read leaf.svg')).toEqual([
      'warning: dropped child elements of <rect id=r>: <title>, <animate>',
      'warning: dropped child elements of <circle id=c>: <rect>',
      'read leaf.svg (2 elements)',
    ]);
    expect(session.app.context.requireDocument().hasId('inner')).toBe(false);
  });

  it('a <title> inside <text> is not part of the visible text', () => {
    const session = read('<text id="t">a<title>tooltip</title>b</text>');
    expect(session.run('tree t')).toEqual(['text#t  (0,0) "ab"']);
  });

  it('tspan / textPath content is still flattened into the text, with a warning', () => {
    const session = new CliSession();
    session.storage.files.set(
      't.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><text id="t">Hello <tspan>big</tspan> world</text></svg>',
    );
    expect(session.run('read t.svg')).toEqual(['warning: flattened nested elements in <text id=t>', 'read t.svg (1 element)']);
    expect(session.run('tree t')).toEqual(['text#t  (0,0) "Hello big world"']);
  });
});

describe('BUG-7 (fixed in v0.8.6): text whitespace changed on a save/read round trip', () => {
  it('significant spaces typed on the command line survive save and read', () => {
    const session = new CliSession();
    session.run('init', 'create text t 0 0 "a   b  "', 'save ws.svg');
    expect(session.file('ws.svg')).toContain('<text id="t" x="0" y="0" xml:space="preserve">a   b  </text>');
    session.run('read ws.svg');
    expect(session.run('tree t')).toEqual(['text#t  (0,0) "a   b  "']);
  });

  it('external xml:space="preserve" text is kept verbatim (also when inherited)', () => {
    const session = new CliSession();
    const xml =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><text id="t" xml:space="preserve">  a   b  </text>' +
      '<g xml:space="preserve" id="g"><text id="u"> x  y </text></g></svg>';
    session.storage.files.set('p.svg', xml);
    session.run('read p.svg', 'save');
    expect(session.run('tree t')).toEqual(['text#t  (0,0) "  a   b  "']);
    expect(session.run('tree u')).toEqual(['text#u  (0,0) " x  y "']);
    expect(session.file('p.svg')).toContain('<text id="t" x="0" y="0" xml:space="preserve">  a   b  </text>');
  });

  it('ordinary text gets no xml:space attribute', () => {
    const session = new CliSession();
    session.run('init', 'create text t 0 0 "hello world"', 'save n.svg');
    expect(session.file('n.svg')).not.toContain('xml:space');
  });
});

describe('BUG-8 (fixed in v0.8.7): characters that XML cannot represent were accepted', () => {
  it.each([
    ['create text t 0 0 "a\u0001b"', 'invalid character U+0001 in text'],
    ['create rect "r\u0000" 0 0 1 1', 'invalid character U+0000 in id'],
    ['set c fill "re\u001Fd"', 'invalid character U+001F in fill'],
    ['set label text "x\uFFFE"', 'invalid character U+FFFE in text'],
    ['set label text "\uD800"', 'invalid character U+D800 in text'],
  ])('%j is rejected', (line, message) => {
    const session = new CliSession();
    session.run('init', 'create circle c 0 0 1', 'create text label 0 0 "ok"');
    session.expectError(line, message);
  });

  it('tabs, newlines, CJK and emoji are fine', () => {
    const session = new CliSession();
    session.run('init');
    expect(session.run('create text t 0 0 "tab\there 中文 😀"')).toEqual(['text#t created']);
  });
});

describe('BUG-9 (fixed in v0.8.8): the root <svg id> could be duplicated by a shape id', () => {
  function withRootId(body = ''): CliSession {
    const session = new CliSession();
    session.storage.files.set('r.svg', `<svg xmlns="http://www.w3.org/2000/svg" id="root" width="1" height="1">${body}</svg>`);
    return session;
  }

  it('create / group cannot reuse the root id', () => {
    const session = withRootId('<rect id="a"/>');
    session.run('read r.svg');
    session.expectError('create rect root 0 0 1 1', 'id already exists: root');
    session.expectError('group root a', 'id already exists: root');
  });

  it('an element that clashes with the root id is renamed on read', () => {
    const session = withRootId('<rect id="root"/>');
    expect(session.run('read r.svg')).toEqual([
      'warning: duplicate id root on <rect>, assigned rect1',
      'read r.svg (1 element)',
    ]);
    session.run('save');
    expect(session.file('r.svg').match(/id="root"/g)).toHaveLength(1);
  });
});

describe('BUG-10 (fixed in v0.8.9): set accepted meaningless style values', () => {
  it.each([
    ['set r stroke-width abc', 'invalid stroke-width: abc'],
    ['set r stroke-width -3', 'invalid stroke-width: -3'],
    ['set r stroke-width 2px3', 'invalid stroke-width: 2px3'],
    ['set r fill ""', 'fill must not be empty'],
    ['set r stroke "  "', 'stroke must not be empty'],
  ])('%s is rejected', (line, message) => {
    const session = new CliSession();
    session.run('init', 'create rect r 0 0 1 1');
    session.expectError(line, message);
  });

  it.each(['2', '0.5', '1e1', '2px', '0.1em', '50%', '3mm'])('stroke-width %s is accepted', (value) => {
    const session = new CliSession();
    session.run('init', 'create rect r 0 0 1 1');
    expect(session.run(`set r stroke-width ${value}`)).toEqual([`rect#r updated: stroke-width=${value}`]);
  });

  it('unusual values from files are kept as-is, and undo can always restore them', () => {
    const session = new CliSession();
    session.storage.files.set(
      'u.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect id="r" stroke-width="calc(1px + 1px)" fill=""/></svg>',
    );
    expect(session.run('read u.svg')).toEqual(['read u.svg (1 element)']);
    session.run('set r stroke-width 2', 'set r fill red');
    expect(session.run('undo', 'undo')).toEqual(['rect#r updated: fill=', 'rect#r updated: stroke-width=calc(1px + 1px)']);
    session.run('save');
    expect(session.file('u.svg')).toContain('<rect id="r" x="0" y="0" width="0" height="0" fill="" stroke-width="calc(1px + 1px)"/>');
  });
});

describe('BUG-11 (fixed in v0.8.10): "in" could not be used as an id', () => {
  it('in is a keyword only as the second-to-last of at least four arguments', () => {
    const session = new CliSession();
    session.run('init');
    expect(session.run('create g in')).toEqual(['g#in created']);
    expect(session.run('create rect r 0 0 1 1 in in')).toEqual(['rect#r created in g#in']);
    expect(session.run('create rect in2 0 0 1 1 red in in')).toEqual(['rect#in2 created in g#in']);
    session.expectError('create g g1 in', 'usage: create <type> <id> [params…] [in <containerId>]');
  });
});

describe('BUG-12 (fixed in v0.8.11): cosmetic — parser internals in error text, CJK misalignment', () => {
  it.each([
    ['junk<svg xmlns="http://www.w3.org/2000/svg"/>', "invalid XML: Unexpected content outside root element: 'junk'"],
    ['<svg xmlns="http://www.w3.org/2000/svg">&nbsp;</svg>', 'invalid XML: entity not found:&nbsp;'],
    ['<svg xmlns="http://www.w3.org/2000/svg"><x:rect/></svg>', 'invalid XML: namespace error: prefix is non-null and namespace is null'],
  ])('read error for %j is readable', (xml, reason) => {
    const session = new CliSession();
    session.storage.files.set('x.svg', xml);
    expect(session.run('read x.svg')).toEqual([`error: cannot read file: x.svg (${reason})`]);
  });

  it('tree aligns summaries by display width (CJK characters are two columns wide)', () => {
    const session = new CliSession();
    session.run('init 10 10', 'create rect 节点一 0 0 1 1', 'create rect abc 0 0 1 1');
    expect(session.run('tree')).toEqual([
      'svg (10x10)',
      '├── rect#节点一  x=0 y=0 w=1 h=1',
      '└── rect#abc     x=0 y=0 w=1 h=1',
    ]);
  });
});

describe('BUG-13 (fixed in v0.8.12): files with characters XML forbids were read and written back', () => {
  it('such a file is not well-formed XML and is refused with the line number', () => {
    const session = new CliSession();
    session.storage.files.set(
      'ctl.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">\n<rect id="r" fill="re\u0001d"/>\n</svg>',
    );
    session.expectError('read ctl.svg', 'cannot read file: ctl.svg (invalid XML: invalid character U+0001 at line 2)');
  });

  it('tabs, newlines and carriage returns are allowed', () => {
    const session = new CliSession();
    session.storage.files.set('ok.svg', '<svg xmlns="http://www.w3.org/2000/svg"\r\n\twidth="1" height="1"/>');
    expect(session.run('read ok.svg')).toEqual(['read ok.svg (0 elements)']);
  });
});

describe('v0.9.0 (decision D9 revised): a custom viewBox is kept instead of being rewritten', () => {
  const icon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><circle id="c" cx="12" cy="12" r="10"/></svg>';

  it('read → save does not change how the drawing renders', () => {
    const session = new CliSession();
    session.storage.files.set('icon.svg', icon);
    expect(session.run('read icon.svg')).toEqual([
      'warning: viewBox "0 0 24 24" kept: coordinates are in viewBox units, not canvas pixels',
      'read icon.svg (1 element)',
    ]);
    session.run('save');
    expect(session.file('icon.svg')).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">');
  });

  it('tree shows the viewBox; canvas resize keeps it (the drawing scales with the canvas)', () => {
    const session = new CliSession();
    session.storage.files.set('icon.svg', icon);
    session.run('read icon.svg');
    expect(session.run('tree')[0]).toBe('svg (48x48, viewBox 0 0 24 24)');
    session.run('canvas 96 96', 'save');
    expect(session.file('icon.svg')).toContain('width="96" height="96" viewBox="0 0 24 24"');
  });

  it('a viewBox equal to 0 0 w h stays managed: it follows canvas resizes and is not reported', () => {
    const session = new CliSession();
    session.storage.files.set('plain.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30"/>');
    expect(session.run('read plain.svg')).toEqual(['read plain.svg (0 elements)']);
    session.run('canvas 80 60', 'save');
    expect(session.file('plain.svg')).toContain('width="80" height="60" viewBox="0 0 80 60"');
    expect(session.run('tree')).toEqual(['svg (80x60)']);
  });
});
