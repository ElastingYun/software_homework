import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgEditorApp } from '../../src/app/SvgEditorApp.js';
import { CliProcess } from '../support/CliProcess.js';

/**
 * 端到端：把说明文档第 6 节的命令序列喂给真实进程，与说明文档中的 transcript 逐行比对，
 * 并检查保存出的 SVG 与手写的期望文件逐字节一致。
 */
function expected(name: string): string {
  return readFileSync(`examples/expected/${name}`, 'utf8').replace('{VERSION}', SvgEditorApp.VERSION);
}

describe('spec section 6 transcripts (real process)', () => {
  it('typical session: output equals the spec transcript line by line', () => {
    const cli = new CliProcess().provide('examples/other.svg', 'other.svg');
    const result = cli.run(readFileSync('examples/demo.txt', 'utf8'));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')).toEqual(expected('demo.transcript').split('\n'));
    expect(readFileSync(cli.path('demo.svg'), 'utf8')).toBe(expected('demo.svg'));
  }, 30_000);

  it('flowchart (6.1 version A): same transcript except tree column alignment', () => {
    const cli = new CliProcess();
    const result = cli.run(readFileSync('examples/flowchart.txt', 'utf8'));
    expect(result.stderr).toBe('');
    // 说明文档中这棵树是手工对齐的；对齐规则见 GUIDE D14，这里比较去掉对齐空格后的内容。
    const normalise = (text: string) => text.split('\n').map((line) => line.replace(/(\S) {2,}/g, '$1 '));
    expect(normalise(result.stdout)).toEqual(normalise(expected('flowchart.transcript')));
    expect(readFileSync(cli.path('flowchart.svg'), 'utf8')).toBe(expected('flowchart.svg'));
  }, 30_000);

  it('a saved file can be read back by a new session with identical tree', () => {
    const cli = new CliProcess();
    const first = cli.run(`${readFileSync('examples/flowchart.txt', 'utf8')}tree\n`);
    const second = cli.run('read flowchart.svg\ntree\n');
    const treeOf = (stdout: string) => stdout.split('svg> tree\n').at(-1);
    expect(second.stdout).toContain('read flowchart.svg (8 elements)');
    expect(treeOf(second.stdout)).toBe(treeOf(first.stdout));
  }, 30_000);
});
