import type { SvgDocument } from '../model/SvgDocument.js';
import { QueryCommand } from './QueryCommand.js';

/** canvas（无参数）：显示画布尺寸。 */
export class ShowCanvasCommand extends QueryCommand {
  protected query(document: SvgDocument): string[] {
    return [`canvas ${document.sizeLabel}`];
  }
}
