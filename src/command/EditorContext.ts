import { EditorError } from '../model/EditorError.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import type { DocumentStorage } from '../io/DocumentStorage.js';
import { CommandHistory } from './CommandHistory.js';

/**
 * 编辑会话：当前文档及其路径、undo/redo 历史、存储端口。
 * 命令通过它访问接收者（SvgDocument），与具体输入通道无关。
 */
export class EditorContext {
  readonly history = new CommandHistory();
  private current: SvgDocument | null = null;
  private path: string | null = null;
  private quitRequested = false;

  constructor(readonly storage: DocumentStorage) {}

  get hasDocument(): boolean {
    return this.current !== null;
  }

  requireDocument(): SvgDocument {
    if (this.current === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.current;
  }

  /** init / read：替换当前文档。 */
  openDocument(document: SvgDocument, path: string | null): void {
    this.current = document;
    this.path = path;
  }

  /** 无参数 save 的目标：最近一次 read 或 save 的路径。 */
  get documentPath(): string | null {
    return this.path;
  }

  rememberPath(path: string): void {
    this.path = path;
  }

  requestQuit(): void {
    this.quitRequested = true;
  }

  get shouldQuit(): boolean {
    return this.quitRequested;
  }
}
