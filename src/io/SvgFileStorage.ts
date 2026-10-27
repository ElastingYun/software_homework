import { readFileSync, writeFileSync } from 'node:fs';
import { EditorError } from '../model/EditorError.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import type { DocumentStorage } from './DocumentStorage.js';
import type { LoadedDocument } from './LoadedDocument.js';
import type { SvgReader } from './SvgReader.js';
import type { SvgWriter } from './SvgWriter.js';

/** DocumentStorage 的文件系统适配器（UTF-8 SVG 文件）。 */
export class SvgFileStorage implements DocumentStorage {
  constructor(
    private readonly reader: SvgReader,
    private readonly writer: SvgWriter,
  ) {}

  load(path: string): LoadedDocument {
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
    return this.reader.read(text, path);
  }

  save(document: SvgDocument, path: string): void {
    const text = this.writer.write(document);
    try {
      writeFileSync(path, text, 'utf8');
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
  }
}
