import type { SvgDocument } from '../model/SvgDocument.js';

/** 读入结果：文档 + 读入过程中产生的警告（不含 "warning: " 前缀）。 */
export class LoadedDocument {
  constructor(
    readonly document: SvgDocument,
    readonly warnings: readonly string[],
  ) {}
}
