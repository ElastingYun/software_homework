/**
 * 用户可见的命令失败。消息不含 "error: " 前缀，由输出层统一添加。
 * 抛出该异常的操作必须保证尚未修改任何状态（"命令失败不改变任何状态"）。
 */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditorError';
  }
}
