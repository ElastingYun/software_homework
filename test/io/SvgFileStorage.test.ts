import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SvgFileStorage } from '../../src/io/SvgFileStorage.js';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { SvgDocument } from '../../src/model/SvgDocument.js';
import { TestShapes } from '../support/TestShapes.js';

const storage = new SvgFileStorage(new SvgReader(TestShapes.factory()), new SvgWriter());

describe('SvgFileStorage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));

  it('saves and loads a document', () => {
    const document = new SvgDocument(400, 300);
    document.attach(TestShapes.factory().create('circle', 'c1', ['1', '2', '3', 'red']), document.root);
    const path = join(dir, 'out.svg');
    storage.save(document, path);
    expect(readFileSync(path, 'utf8')).toContain('<circle id="c1" cx="1" cy="2" r="3" fill="red"/>');
    const loaded = storage.load(path);
    expect(loaded.document.sizeLabel).toBe('400x300');
    expect(loaded.document.requireShape('c1').summary()).toBe('cx=1 cy=2 r=3 fill=red');
  });

  it('reports missing / unreadable files', () => {
    expect(() => storage.load(join(dir, 'missing.svg'))).toThrow(`cannot read file: ${join(dir, 'missing.svg')}`);
    expect(() => storage.load(dir)).toThrow(`cannot read file: ${dir}`);
  });

  it('reports unwritable paths', () => {
    const path = join(dir, 'no-such-dir', 'a.svg');
    expect(() => storage.save(new SvgDocument(), path)).toThrow(`cannot write file: ${path}`);
  });

  it('reports invalid content with the file name', () => {
    const path = join(dir, 'bad.svg');
    writeFileSync(path, 'not xml at all');
    expect(() => storage.load(path)).toThrow(`cannot read file: ${path} (`);
  });
});
