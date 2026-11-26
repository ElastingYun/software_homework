import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // 测试中把 `vscode` 模块替换为替身（真实模块只存在于 VSCode 进程内）。
    alias: { vscode: fileURLToPath(new URL('./test/support/vscode.ts', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
