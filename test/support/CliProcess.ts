import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 以子进程真实启动 CLI（node --import tsx src/main.ts），stdin 为脚本，工作目录为临时目录。 */
export class CliProcess {
  static readonly MAIN = resolve('src/main.ts');
  /** 绝对路径的 tsx 加载器：工作目录是临时目录，不能按包名解析。 */
  static readonly TSX_LOADER = pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href;

  readonly workDir = mkdtempSync(join(tmpdir(), 'svg-editor-e2e-'));

  /** 把文件复制进工作目录。 */
  provide(source: string, name: string): this {
    cpSync(source, join(this.workDir, name));
    return this;
  }

  run(script: string): { stdout: string; stderr: string; status: number | null } {
    const result = spawnSync(process.execPath, ['--import', CliProcess.TSX_LOADER, CliProcess.MAIN], {
      cwd: this.workDir,
      input: script,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    return { stdout: result.stdout, stderr: result.stderr, status: result.status };
  }

  path(name: string): string {
    return join(this.workDir, name);
  }
}
