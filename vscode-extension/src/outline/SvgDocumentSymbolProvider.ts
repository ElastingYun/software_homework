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
      return this.toSymbols(this.parser.parseOrEmpty(document.getText()));
    } catch (error) {
      this.log(`SVG outline failed for ${document.uri.toString()}: ${String(error)}`);
      return [];
    }
  }

  /** 逐层转换（显式栈，不递归）：嵌套再深也不会耗尽调用栈。 */
  private toSymbols(roots: readonly OutlineNode[]): vscode.DocumentSymbol[] {
    const result = roots.map((node) => this.toSymbol(node));
    const pending: Array<[OutlineNode, vscode.DocumentSymbol]> = roots.map((node, index) => [node, result[index] as vscode.DocumentSymbol]);
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      const [node, symbol] = next;
      symbol.children = node.children.map((child) => {
        const childSymbol = this.toSymbol(child);
        pending.push([child, childSymbol]);
        return childSymbol;
      });
    }
    return result;
  }

  /** 单个节点（不含子节点）→ DocumentSymbol。 */
  private toSymbol(node: OutlineNode): vscode.DocumentSymbol {
    const kind = node.children.length > 0 ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Field;
    return new vscode.DocumentSymbol(node.label, '', kind, this.toRange(node.span), this.toRange(node.nameSpan));
  }

  private toRange(span: SourceSpan): vscode.Range {
    return new vscode.Range(this.toPosition(span.start), this.toPosition(span.end));
  }

  private toPosition(position: SourcePosition): vscode.Position {
    return new vscode.Position(position.line, position.character);
  }
}
