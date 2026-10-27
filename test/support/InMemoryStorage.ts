import type { DocumentStorage } from '../../src/io/DocumentStorage.js';
import type { LoadedDocument } from '../../src/io/LoadedDocument.js';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { EditorError } from '../../src/model/EditorError.js';
import type { SvgDocument } from '../../src/model/SvgDocument.js';
import { TestShapes } from './TestShapes.js';

/** 内存文件系统版 DocumentStorage（测试替身）：真实的读写格式，不碰磁盘。 */
export class InMemoryStorage implements DocumentStorage {
  readonly files = new Map<string, string>();
  readonly unwritable = new Set<string>();
  private readonly reader = new SvgReader(TestShapes.factory());
  private readonly writer = new SvgWriter();

  load(path: string): LoadedDocument {
    const text = this.files.get(path);
    if (text === undefined) {
      throw new EditorError(`cannot read file: ${path}`);
    }
    return this.reader.read(text, path);
  }

  save(document: SvgDocument, path: string): void {
    if (this.unwritable.has(path)) {
      throw new EditorError(`cannot write file: ${path}`);
    }
    this.files.set(path, this.writer.write(document));
  }
}
