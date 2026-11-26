/**
 * `vscode` 模块的最小测试替身：只包含扩展用到的类型与注册函数，
 * 语义与 VSCode API 文档一致（构造参数、位标志取值）。
 */
export class Position {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position,
  ) {}
}

export enum SymbolKind {
  Namespace = 2,
  Field = 7,
}

export class DocumentSymbol {
  children: DocumentSymbol[] = [];

  constructor(
    readonly name: string,
    readonly detail: string,
    readonly kind: SymbolKind,
    readonly range: Range,
    readonly selectionRange: Range,
  ) {}
}

export class FileDecoration {
  constructor(
    readonly badge?: string,
    readonly tooltip?: string,
  ) {}
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

/** 记录注册调用，供激活测试断言。 */
export class Registrations {
  static readonly calls: Array<{ api: string; args: unknown[] }> = [];
}

class Disposable {
  constructor(readonly name: string) {}
  dispose(): void {}
}

export const window = {
  registerFileDecorationProvider: (...args: unknown[]) => {
    Registrations.calls.push({ api: 'registerFileDecorationProvider', args });
    return new Disposable('decoration');
  },
  createOutputChannel: (name: string) => ({ name, appendLine: () => undefined, dispose: () => undefined }),
};

export const languages = {
  registerDocumentSymbolProvider: (...args: unknown[]) => {
    Registrations.calls.push({ api: 'registerDocumentSymbolProvider', args });
    return new Disposable('symbols');
  },
};

export const workspace = {
  fs: { stat: async () => ({ type: FileType.File }) },
};
