import * as vscode from 'vscode';
import { SvgFileRule } from './SvgFileRule';

/**
 * 文件装饰提供者：VSCode 渲染 Explorer 中的每一项时调用 provideFileDecoration，
 * 对 `.svg` 普通文件返回 `[]` 标记；其他文件与目录返回 undefined（不装饰）。
 * 只附加界面信息，不读取也不修改文件内容。
 */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  static readonly BADGE = '[]';
  static readonly TOOLTIP = 'SVG file';

  constructor(
    private readonly rule: SvgFileRule,
    private readonly fileSystem: Pick<vscode.FileSystem, 'stat'>,
  ) {}

  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    if (!this.rule.matches(uri.path)) {
      return undefined;
    }
    try {
      const stat = await this.fileSystem.stat(uri);
      // FileType 是位标志：指向文件的符号链接为 File | SymbolicLink，同样标记。
      if ((stat.type & vscode.FileType.File) === 0) {
        return undefined;
      }
    } catch {
      return undefined;
    }
    return new vscode.FileDecoration(SvgFileDecorationProvider.BADGE, SvgFileDecorationProvider.TOOLTIP);
  }
}
