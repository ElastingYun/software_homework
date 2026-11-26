import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { SvgDocumentSymbolProvider } from '../../src/outline/SvgDocumentSymbolProvider';
import { SvgOutlineParser } from '../../src/outline/SvgOutlineParser';
import { SymbolKind } from '../support/vscode';

/** 文本可变的文档替身：模拟用户编辑后 VSCode 再次请求符号。 */
class EditableDocument {
  constructor(public text: string) {}
  readonly uri = { toString: () => 'file:///w/test.svg' };
  getText(): string {
    return this.text;
  }
}

function setup() {
  const logs: string[] = [];
  const provider = new SvgDocumentSymbolProvider(new SvgOutlineParser(), (message) => logs.push(message));
  const symbols = (document: EditableDocument) => provider.provideDocumentSymbols(document as unknown as vscode.TextDocument);
  return { provider, symbols, logs };
}

const names = (symbols: vscode.DocumentSymbol[], depth = 0): string[] =>
  symbols.flatMap((symbol) => [`${'  '.repeat(depth)}${symbol.name}`, ...names(symbol.children, depth + 1)]);

describe('SvgDocumentSymbolProvider', () => {
  it('adapts the outline tree into nested DocumentSymbols with ranges for navigation', () => {
    const { symbols } = setup();
    const result = symbols(new EditableDocument('<svg>\n  <g id="flow">\n    <rect id="start"/>\n  </g>\n</svg>'));
    expect(names(result)).toEqual(['svg', '  g#flow', '    rect#start']);
    const start = result[0]!.children[0]!.children[0]!;
    expect(start.selectionRange.start).toEqual({ line: 2, character: 5 });
    expect(start.range.start).toEqual({ line: 2, character: 4 });
    expect(start.range.end).toEqual({ line: 2, character: 22 });
    expect(result[0]!.range.end).toEqual({ line: 4, character: 6 });
  });

  it('uses a container icon for elements with children and a field icon for leaves', () => {
    const { symbols } = setup();
    const [svg] = symbols(new EditableDocument('<svg><g><rect/></g><g/></svg>'));
    expect(svg!.kind).toBe(SymbolKind.Namespace);
    expect(svg!.children.map((child) => child.kind)).toEqual([SymbolKind.Namespace, SymbolKind.Field]);
  });

  it('reflects edits: every request parses the current text', () => {
    const { symbols } = setup();
    const document = new EditableDocument('<svg><rect id="a"/></svg>');
    expect(names(symbols(document))).toEqual(['svg', '  rect#a']);
    document.text = '<svg><g id="g"><rect id="a"/><text>t</text></g></svg>';
    expect(names(symbols(document))).toEqual(['svg', '  g#g', '    rect#a', '    text']);
  });

  it('returns an empty outline for incomplete XML without logging an error', () => {
    const { symbols, logs } = setup();
    expect(symbols(new EditableDocument('<svg><g id="half"'))).toEqual([]);
    expect(logs).toEqual([]);
  });

  it('never lets an unexpected error escape to VSCode', () => {
    const logs: string[] = [];
    const provider = new SvgDocumentSymbolProvider(
      { parseOrEmpty: () => { throw new TypeError('boom'); } } as unknown as SvgOutlineParser,
      (message) => logs.push(message),
    );
    expect(provider.provideDocumentSymbols(new EditableDocument('<svg/>') as unknown as vscode.TextDocument)).toEqual([]);
    expect(logs).toEqual(['SVG outline failed for file:///w/test.svg: TypeError: boom']);
  });
});
