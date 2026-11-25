import type * as vscode from 'vscode';
import { SvgExtension } from './SvgExtension';

/** VSCode 约定的入口：扩展激活时调用（导出函数是 VSCode 的契约，逻辑在 SvgExtension 中）。 */
export function activate(context: vscode.ExtensionContext): void {
  new SvgExtension().activate(context);
}

export function deactivate(): void {}
