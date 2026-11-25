import * as vscode from 'vscode';
import { SvgFileDecorationProvider } from './decoration/SvgFileDecorationProvider';
import { SvgFileRule } from './decoration/SvgFileRule';
import { SvgDocumentSymbolProvider } from './outline/SvgDocumentSymbolProvider';
import { SvgOutlineParser } from './outline/SvgOutlineParser';

/**
 * 扩展的组装处：创建两个提供者并注册到 VSCode。之后何时调用它们由 VSCode 决定。
 * 注册返回的 Disposable 交给 context.subscriptions，扩展停用时由 VSCode 统一释放。
 */
export class SvgExtension {
  /** 大纲只对 .svg 文件生效（VSCode 把 .svg 识别为 XML，按语言注册会影响所有 XML 文件）。 */
  static readonly SVG_DOCUMENTS: vscode.DocumentSelector = { pattern: '**/*.svg' };

  activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('SVG Badge & Outline');
    context.subscriptions.push(
      output,
      vscode.window.registerFileDecorationProvider(
        new SvgFileDecorationProvider(new SvgFileRule(), vscode.workspace.fs),
      ),
      vscode.languages.registerDocumentSymbolProvider(
        SvgExtension.SVG_DOCUMENTS,
        new SvgDocumentSymbolProvider(new SvgOutlineParser(), (message) => output.appendLine(message)),
        { label: 'SVG' },
      ),
    );
  }
}
