import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { SvgDocumentSymbolProvider } from '../../src/outline/SvgDocumentSymbolProvider';
import { SvgOutlineParser } from '../../src/outline/SvgOutlineParser';
import { SvgExtension } from '../../src/SvgExtension';
import { OutlineText } from '../support/OutlineText';

/**
 * 独立审查（不改动项目文件的黑盒 + 差分模糊测试）发现的缺陷，每个一组，标题注明编号与修正版本。
 * 现象 / 原因 / 修正见 CHANGELOG.md 与 GUIDE.md 第 8 节。
 */
const parser = new SvgOutlineParser();
const outline = (text: string) => OutlineText.of(parser.parseOrEmpty(text));

describe('BUG-V2 (fixed in 0.1.2): a comment starting with ">" or "->" ended too early', () => {
  it.each(['<svg><!--><rect id="ghost"/>--></svg>', '<svg><!---><rect id="ghost"/>--></svg>'])('%s', (text) => {
    expect(outline(text)).toEqual(['svg']);
  });

  it('an empty comment is still fine', () => {
    expect(outline('<svg><!----><rect id="r"/></svg>')).toEqual(['svg', '  rect#r']);
  });
});

describe('BUG-V3 (fixed in 0.1.2): comments / processing instructions inside a DTD internal subset', () => {
  it.each([
    "<!DOCTYPE svg [<!-- don't -->]><svg><rect/></svg>",
    "<!DOCTYPE svg [<?pi it's?>]><svg><rect/></svg>",
    '<!DOCTYPE svg [<!-- [ -->]><svg><rect/></svg>',
    '<!DOCTYPE svg [<!ENTITY e "]>">]><svg><rect/></svg>',
  ])('%s', (text) => {
    expect(outline(text)).toEqual(['svg', '  rect']);
  });

  it('an unterminated DOCTYPE is still incomplete', () => {
    expect(outline('<!DOCTYPE svg [<!-- x -->')).toEqual([]);
  });
});

describe('BUG-V4 (fixed in 0.1.2): very deep valid nesting overflowed the stack while building symbols', () => {
  it('20 000 nested groups produce a complete outline', () => {
    const depth = 20_000;
    const logs: string[] = [];
    const provider = new SvgDocumentSymbolProvider(parser, (message) => logs.push(message));
    const text = `<svg>${'<g>'.repeat(depth)}<rect id="leaf"/>${'</g>'.repeat(depth)}</svg>`;
    const symbols = provider.provideDocumentSymbols({ getText: () => text, uri: { toString: () => 'deep.svg' } } as unknown as vscode.TextDocument);
    expect(logs).toEqual([]);
    let node = symbols[0];
    let levels = 0;
    while (node !== undefined && node.children.length > 0) {
      node = node.children[0];
      levels += 1;
    }
    expect(levels).toBe(depth + 1);
    expect(node?.name).toBe('rect#leaf');
  });
});

describe('BUG-V5 (fixed in 0.1.2): line breaks and tabs in id were not normalised', () => {
  it.each([
    ['<svg><rect id="a\nb"/></svg>', 'rect#a b'],
    ['<svg><rect id="a\tb"/></svg>', 'rect#a b'],
    ['<svg><rect id="a\r\nb"/></svg>', 'rect#a b'],
    ['<svg><rect id="a&#10;b"/></svg>', 'rect#a\nb'],
  ])('%j → %j', (text, label) => {
    expect(outline(text)[1]).toBe(`  ${label}`);
  });
});

describe('BUG-V6 (fixed in 0.1.2): upper-case .SVG files got the badge but no outline', () => {
  it('the outline selector matches the extension case-insensitively, like the badge rule', () => {
    expect(SvgExtension.SVG_DOCUMENTS).toEqual({ pattern: '**/*.[sS][vV][gG]' });
  });
});
