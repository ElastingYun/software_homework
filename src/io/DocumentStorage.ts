import type { SvgDocument } from '../model/SvgDocument.js';
import type { LoadedDocument } from './LoadedDocument.js';

/**
 * 文档存储端口（Ports & Adapters）。命令只依赖这个接口；
 * 组装根注入文件实现 SvgFileStorage，测试注入内存实现。
 */
export interface DocumentStorage {
  /** 失败时抛出 EditorError：`cannot read file: <path>[ (原因)]`。 */
  load(path: string): LoadedDocument;
  /** 失败时抛出 EditorError：`cannot write file: <path>`。 */
  save(document: SvgDocument, path: string): void;
}
