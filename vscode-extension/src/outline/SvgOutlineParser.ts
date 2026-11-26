import { IncompleteXmlError } from './IncompleteXmlError';
import type { OutlineNode } from './OutlineNode';
import { OutlineScan } from './OutlineScan';

/**
 * SVG 文本 → 大纲节点树。不依赖 VSCode，可在任何环境中测试。
 * 根元素、容器与叶子一律作为节点；注释、处理指令、CDATA 与文本不进入大纲。
 */
export class SvgOutlineParser {
  /** 不完整或不合法的 XML 抛出 IncompleteXmlError。 */
  parse(text: string): OutlineNode[] {
    return new OutlineScan(text).run();
  }

  /** 编辑过程中使用：XML 不完整时返回空大纲，而不是抛错。 */
  parseOrEmpty(text: string): OutlineNode[] {
    try {
      return this.parse(text);
    } catch (error) {
      if (error instanceof IncompleteXmlError) {
        return [];
      }
      throw error;
    }
  }
}
