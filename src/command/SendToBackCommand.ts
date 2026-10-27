import { ReorderCommand } from './ReorderCommand.js';

/** back：移到同级最后（最先绘制，位于最下层）。 */
export class SendToBackCommand extends ReorderCommand {
  protected destination(): number {
    return 0;
  }

  protected outcome(): string {
    return 'sent to back';
  }
}
