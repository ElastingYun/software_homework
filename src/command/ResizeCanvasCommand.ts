import { DocumentCommand } from './DocumentCommand.js';
import type { EditorContext } from './EditorContext.js';

/** canvas <w> [h]：修改画布尺寸（只给宽度时高度不变）。属于文档类命令。 */
export class ResizeCanvasCommand extends DocumentCommand {
  constructor(
    private readonly width: number,
    private readonly height: number | null = null,
  ) {
    super();
  }

  protected run(context: EditorContext): string[] {
    const document = context.requireDocument();
    document.resize(this.width, this.height ?? document.height);
    return [`canvas resized to ${document.sizeLabel}`];
  }
}
