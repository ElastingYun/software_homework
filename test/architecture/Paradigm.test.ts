import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 说明文档 2.1"实现范式"的自动守卫：一类一文件（文件名 = 类名）、无自由函数、
 * 无 switch 分派、不用 instanceof 判断图形类型；按名字分派只出现在两个注册表里。
 */
class SourceTree {
  static files(dir = 'src'): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? SourceTree.files(path) : path.endsWith('.ts') ? [path] : [];
    });
  }
}

const sources = SourceTree.files().filter((path) => !path.endsWith('main.ts'));
const read = (path: string) => readFileSync(path, 'utf8');

describe('implementation paradigm (spec 2.1)', () => {
  it.each(sources)('%s declares exactly one exported class/interface named after the file', (path) => {
    const declarations = [...read(path).matchAll(/^export (?:abstract )?(?:class|interface) (\w+)/gm)].map((m) => m[1]);
    expect(declarations).toEqual([basename(path, '.ts')]);
  });

  it('has no top-level (free) functions and no exported constants/variables', () => {
    for (const path of sources) {
      expect(read(path), path).not.toMatch(/^(export )?(async )?function /m);
      expect(read(path), path).not.toMatch(/^export (const|let|var) /m);
    }
  });

  it('never dispatches with switch', () => {
    for (const path of sources) {
      expect(read(path), path).not.toMatch(/\bswitch\s*\(/);
    }
  });

  it('uses instanceof only for error types, never for shapes', () => {
    for (const path of sources) {
      for (const match of read(path).matchAll(/instanceof\s+(\w+)/g)) {
        expect(['Error', 'EditorError'], `${path}: instanceof ${match[1]}`).toContain(match[1]);
      }
    }
  });

  it('name-based registries exist only in CommandRegistry and ShapeFactory, both marked for refactoring', () => {
    // 名字 → 行为提供者（图形类 / 命令解析器）的映射才是"按名字分派"；SvgDocument 的 id 索引是寻址，不算。
    const registries = sources.filter((path) => /new Map<string, (ShapeClass|CommandParser)>/.test(read(path)));
    expect(registries.map((path) => basename(path))).toEqual(['CommandRegistry.ts', 'ShapeFactory.ts']);
    for (const path of registries) {
      expect(read(path), path).toContain('待重构');
    }
  });

  it('only the composition root mentions concrete shape and parser classes together', () => {
    const wiring = sources.filter((path) => read(path).includes('.register(new ') || read(path).includes('.register(RectShape)'));
    expect(wiring.map((path) => basename(path))).toEqual(['SvgEditorApp.ts']);
  });
});
