/** 文本不是完整、格式良好的 XML（常见于编辑到一半）。大纲据此显示为空，而不是报错。 */
export class IncompleteXmlError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(`${message} (at offset ${offset})`);
    this.name = 'IncompleteXmlError';
  }
}
