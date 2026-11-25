import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { SvgFileDecorationProvider } from '../../src/decoration/SvgFileDecorationProvider';
import { SvgFileRule } from '../../src/decoration/SvgFileRule';
import { FileType } from '../support/vscode';

/** 用内存中的"文件系统"替代 vscode.workspace.fs。 */
function providerWith(types: Record<string, FileType>) {
  const stats: string[] = [];
  const fileSystem = {
    stat: async (uri: vscode.Uri) => {
      stats.push(uri.path);
      const type = types[uri.path];
      if (type === undefined) {
        throw new Error('FileNotFound');
      }
      return { type, ctime: 0, mtime: 0, size: 0 };
    },
  };
  return { provider: new SvgFileDecorationProvider(new SvgFileRule(), fileSystem), stats };
}

const uri = (path: string) => ({ path }) as vscode.Uri;

describe('SvgFileDecorationProvider', () => {
  it('marks an .svg file with [] and a tooltip', async () => {
    const { provider } = providerWith({ '/w/example.svg': FileType.File });
    const decoration = await provider.provideFileDecoration(uri('/w/example.svg'));
    expect(decoration?.badge).toBe('[]');
    expect(decoration?.tooltip).toBe('SVG file');
  });

  it('does not mark other files, and does not even stat them', async () => {
    const { provider, stats } = providerWith({ '/w/notes.txt': FileType.File });
    expect(await provider.provideFileDecoration(uri('/w/notes.txt'))).toBeUndefined();
    expect(stats).toEqual([]);
  });

  it('does not mark a directory whose name ends with .svg', async () => {
    const { provider } = providerWith({ '/w/icons.svg': FileType.Directory });
    expect(await provider.provideFileDecoration(uri('/w/icons.svg'))).toBeUndefined();
  });

  it('marks a symbolic link to an SVG file, not a link to a directory', async () => {
    const { provider } = providerWith({
      '/w/link.svg': FileType.File | FileType.SymbolicLink,
      '/w/dirlink.svg': FileType.Directory | FileType.SymbolicLink,
    });
    expect((await provider.provideFileDecoration(uri('/w/link.svg')))?.badge).toBe('[]');
    expect(await provider.provideFileDecoration(uri('/w/dirlink.svg'))).toBeUndefined();
  });

  it('does not throw when the file cannot be inspected (e.g. deleted meanwhile)', async () => {
    const { provider } = providerWith({});
    expect(await provider.provideFileDecoration(uri('/w/gone.svg'))).toBeUndefined();
  });

  it('the badge fits the 2-character limit VSCode imposes on badges', () => {
    expect(SvgFileDecorationProvider.BADGE).toHaveLength(2);
  });
});
