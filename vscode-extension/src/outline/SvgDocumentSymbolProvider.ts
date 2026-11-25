import * as vscode from 'vscode';
import type { OutlineNode } from './OutlineNode';
import type { SourcePosition } from './SourcePosition';
import type { SourceSpan } from './SourceSpan';
import type { SvgOutlineParser } from './SvgOutlineParser';

/**
 * 文档符号提供者：VSCode 需要大纲时（打开文档、文档变化后）调用 provideDocumentSymbols。
 * 每次从当前文本重新解析，再把与 VSCode 无关的 OutlineNode 树适配成 vscode.DocumentSymbol 树。
 * XML 不完整时返回空数组（大纲暂时清空）；任何意外错误也不向 VSCode 抛出。
 */
export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(
    private readonly parser: SvgOutlineParser,
    private readonly log: (message: string) => void,
  ) {}

  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    try {
      return this.parser.parseOrEmpty(document.getText()).map((node) => this.toSymbol(node));
    } catch (error) {
      this.log(`SVG outline failed for ${document.uri.toString()}: ${String(error)}`);
      return [];
    }
  }

  private toSymbol(node: OutlineNode): vscode.DocumentSymbol {
    const kind = node.children.length > 0 ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Field;
    const symbol = new vscode.DocumentSymbol(node.label, '', kind, this.toRange(node.span), this.toRange(node.nameSpan));
    symbol.children = node.children.map((child) => this.toSymbol(child));
    return symbol;
  }

  private toRange(span: SourceSpan): vscode.Range {
    return new vscode.Range(this.toPosition(span.start), this.toPosition(span.end));
  }

  private toPosition(position: SourcePosition): vscode.Position {
    return new vscode.Position(position.line, position.character);
  }
}
