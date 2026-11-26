import { execFileSync } from 'node:child_process';

function git(...args) {
  return execFileSync('git', args, {
    cwd: new URL('../../', import.meta.url),
    encoding: 'utf8',
  });
}

const revision = process.argv[2] ?? 'HEAD';
const commit = git('rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`).trim();
const paths = git('ls-tree', '-rz', '--name-only', commit, '--', 'vscode-extension/src', 'vscode-extension/test')
  .split('\0')
  .filter(path => path.endsWith('.ts'));

const groups = [
  { name: '扩展源码', paths: paths.filter(path => path.startsWith('vscode-extension/src/')) },
  { name: '测试用例', paths: paths.filter(path => path.startsWith('vscode-extension/test/') && !path.startsWith('vscode-extension/test/support/')) },
  { name: '测试支持与替身', paths: paths.filter(path => path.startsWith('vscode-extension/test/support/')) },
];

console.log(`VS Code 扩展规模 · ${commit}`);
for (const group of groups) {
  console.log(`\n${group.name}\n行数\t文件`);
  let total = 0;
  for (const path of group.paths) {
    const blob = git('cat-file', 'blob', `${commit}:${path}`);
    const lines = blob.split('\n').length - Number(blob === '' || blob.endsWith('\n'));
    console.log(`${lines}\t${path}`);
    total += lines;
  }
  console.log(`小计 ${group.paths.length} 个文件，${total} 行`);
}
