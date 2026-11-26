import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { SvgFileDecorationProvider } from '../../src/decoration/SvgFileDecorationProvider';
import { activate } from '../../src/extension';
import { SvgDocumentSymbolProvider } from '../../src/outline/SvgDocumentSymbolProvider';
import { Registrations } from '../support/vscode';

describe('activation', () => {
  it('registers both providers with VSCode and hands their disposables to the context', () => {
    Registrations.calls.length = 0;
    const context = { subscriptions: [] as unknown[] };
    activate(context as unknown as vscode.ExtensionContext);

    const [decoration, symbols] = Registrations.calls;
    expect(Registrations.calls.map((call) => call.api)).toEqual(['registerFileDecorationProvider', 'registerDocumentSymbolProvider']);
    expect(decoration!.args[0]).toBeInstanceOf(SvgFileDecorationProvider);
    expect(symbols!.args[0]).toEqual({ pattern: '**/*.[sS][vV][gG]' });
    expect(symbols!.args[1]).toBeInstanceOf(SvgDocumentSymbolProvider);
    expect(context.subscriptions).toHaveLength(3);
  });
});
