import type { EditorContext } from './EditorContext.js';

/**
 * 命令（Command 模式）：一次用户操作的对象化表示。
 * 只接收类型化参数，与输入通道（CLI、未来的 agent / 鼠标）无关。
 * 返回要显示的输出行；失败时抛出 EditorError，且不改变任何状态。
 */
export interface Command {
  execute(context: EditorContext): string[];
}
