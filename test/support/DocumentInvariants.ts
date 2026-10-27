import { expect } from 'vitest';
import type { Container } from '../../src/model/Container.js';
import type { SvgDocument } from '../../src/model/SvgDocument.js';

/** 文档结构不变量：id 唯一、索引与树一致、父指针正确。 */
export class DocumentInvariants {
  static check(document: SvgDocument): void {
    const ids: string[] = [];
    DocumentInvariants.walk(document.root, ids);
    expect(new Set(ids).size, 'ids in tree must be unique').toBe(ids.length);
    expect(document.shapeCount(), 'index size must equal tree size').toBe(ids.length);
    for (const id of ids) {
      expect(document.findShape(id)?.id, `index must contain ${id}`).toBe(id);
    }
  }

  private static walk(container: Container, ids: string[]): void {
    for (const child of container.childShapes()) {
      expect(child.parent, `parent pointer of ${child.label}`).toBe(container);
      ids.push(child.id);
      const nested = child.asContainer();
      if (nested !== null) {
        DocumentInvariants.walk(nested, ids);
      }
    }
  }
}
