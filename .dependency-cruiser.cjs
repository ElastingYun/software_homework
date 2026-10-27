/**
 * 依赖方向规则（doc/README.md 架构方案 §3 R1–R8）的可执行版本。
 * 运行：npm run lint:deps
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'R1-model-is-core',
      comment: 'model 不依赖任何其他模块、Node 内置模块或第三方库',
      severity: 'error',
      from: { path: '^src/model/' },
      to: { pathNot: '^src/model/' },
    },
    {
      name: 'R2-io-depends-only-on-model',
      severity: 'error',
      from: { path: '^src/io/' },
      to: { path: '^src/(view|command|cli|app)/' },
    },
    {
      name: 'R3-view-depends-only-on-model',
      severity: 'error',
      from: { path: '^src/view/' },
      to: { path: '^src/(io|command|cli|app)/' },
    },
    {
      name: 'R4a-command-not-on-cli-or-app',
      severity: 'error',
      from: { path: '^src/command/' },
      to: { path: '^src/(cli|app)/' },
    },
    {
      name: 'R4b-command-uses-only-io-ports',
      comment: 'command 只能依赖 io 的接口文件，不能依赖具体实现',
      severity: 'error',
      from: { path: '^src/command/' },
      to: { path: '^src/io/', pathNot: '^src/io/(DocumentStorage|LoadedDocument)\\.ts$' },
    },
    {
      name: 'R5-cli-not-on-io-view-app',
      severity: 'error',
      from: { path: '^src/cli/' },
      to: { path: '^src/(io|view|app)/' },
    },
    {
      name: 'R6-nobody-depends-on-app',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(app/|main\\.ts$)' },
      to: { path: '^src/(app/|main\\.ts$)' },
    },
    {
      name: 'R7a-fs-and-xml-only-in-io',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/io/' },
      to: { path: ['^(node:)?fs(/promises)?$', '@xmldom'] },
    },
    {
      name: 'R7b-terminal-only-in-cli-or-app',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(cli/|app/|main\\.ts$)' },
      to: { path: '^(node:)?(readline|tty)$' },
    },
    {
      name: 'R8a-no-runtime-circular',
      comment: '禁止运行时循环依赖（环上每条边都是值导入）',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
    {
      name: 'R8b-no-cross-module-circular',
      comment: '任何循环（含仅类型的）都不得跨越模块边界',
      severity: 'error',
      from: { path: '^src/([^/]+)/' },
      to: { circular: true, via: { pathNot: '^src/$1/' } },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js'],
    },
  },
};
