import { beforeEach, describe, expect, it } from 'vitest';
import { GroupShape } from '../../src/model/GroupShape.js';
import { RectShape } from '../../src/model/RectShape.js';
import { SvgDocument } from '../../src/model/SvgDocument.js';
import { DocumentInvariants } from '../support/DocumentInvariants.js';

describe('SvgDocument', () => {
  let document: SvgDocument;
  let group: GroupShape;
  let a: RectShape;
  let b: RectShape;

  beforeEach(() => {
    document = new SvgDocument();
    group = new GroupShape('g1');
    a = new RectShape('a', 0, 0, 1, 1);
    b = new RectShape('b', 0, 0, 1, 1);
    document.attach(group, document.root);
    document.attach(a, group);
    document.attach(b, document.root);
  });

  it('defaults to 800x600 and validates resize', () => {
    expect(new SvgDocument().sizeLabel).toBe('800x600');
    expect(() => document.resize(0, 10)).toThrow('canvas size must be positive');
    expect(() => document.resize(10, -1)).toThrow('canvas size must be positive');
    document.resize(1024.5, 768);
    expect(document.sizeLabel).toBe('1024.5x768');
  });

  it('indexes attached subtrees and keeps invariants', () => {
    expect(document.shapeCount()).toBe(3);
    expect(document.allShapes().map((shape) => shape.id)).toEqual(['g1', 'a', 'b']);
    DocumentInvariants.check(document);
  });

  it('requireShape / requireContainer produce the spec error messages', () => {
    expect(() => document.requireShape('r9')).toThrow('no such shape: r9');
    expect(() => document.requireContainer('node9')).toThrow('no such container: node9');
    expect(() => document.requireContainer('a')).toThrow('not a container: a');
    expect(document.requireContainer('g1')).toBe(group);
  });

  it('rejects an id clash anywhere in the attached subtree, atomically', () => {
    const subtree = new GroupShape('fresh');
    subtree.insertChild(new RectShape('a', 0, 0, 1, 1), 0);
    expect(() => document.attach(subtree, document.root)).toThrow('id already exists: a');
    expect(document.hasId('fresh')).toBe(false);
    expect(subtree.parent).toBeNull();
    DocumentInvariants.check(document);
  });

  it('detach removes a whole subtree from the index and reports its position', () => {
    const position = document.detach(group);
    expect(position.container).toBe(document.root);
    expect(position.index).toBe(0);
    expect(document.hasId('a')).toBe(false);
    expect(document.shapeCount()).toBe(1);
    document.attach(group, position.container, position.index);
    expect(document.allShapes().map((shape) => shape.id)).toEqual(['g1', 'a', 'b']);
    DocumentInvariants.check(document);
  });

  it('relocate keeps ids and returns the old position', () => {
    const old = document.relocate(b, group, 0);
    expect(group.childShapes().map((shape) => shape.id)).toEqual(['b', 'a']);
    expect(old.container).toBe(document.root);
    expect(old.index).toBe(1);
    DocumentInvariants.check(document);
    document.relocate(b, old.container, old.index);
    expect(document.allShapes().map((shape) => shape.id)).toEqual(['g1', 'a', 'b']);
  });

  it('relocate refuses to create cycles', () => {
    const inner = new GroupShape('inner');
    document.attach(inner, group);
    expect(() => document.relocate(group, inner)).toThrow('own subtree');
    expect(() => document.relocate(group, group)).toThrow('own subtree');
    DocumentInvariants.check(document);
  });

  it('depth counts container levels below the root; height counts shape levels', () => {
    const inner = new GroupShape('inner');
    document.attach(inner, group);
    expect(document.depthOf(document.root)).toBe(0);
    expect(document.depthOf(group)).toBe(1);
    expect(document.depthOf(inner)).toBe(2);
    expect(document.heightOf(a)).toBe(1);
    expect(document.heightOf(inner)).toBe(1);
    expect(document.heightOf(group)).toBe(2);
    expect(() => document.ensureRoom(inner, SvgDocument.MAX_DEPTH - 1)).toThrow('nesting too deep');
    expect(() => document.ensureRoom(inner, SvgDocument.MAX_DEPTH - 2)).not.toThrow();
  });

  it('documentOrder follows pre-order traversal', () => {
    expect(document.documentOrder(b)).toBeGreaterThan(document.documentOrder(a));
    expect(document.positionOf(a).container).toBe(group);
  });
});
