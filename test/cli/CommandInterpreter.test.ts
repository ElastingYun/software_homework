import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgEditorApp } from '../../src/app/SvgEditorApp.js';
import { CommandRegistry } from '../../src/cli/CommandRegistry.js';
import { InitParser } from '../../src/cli/parsers/InitParser.js';
import { InMemoryStorage } from '../support/InMemoryStorage.js';

function interpreterWith(storage = new InMemoryStorage()) {
  return new SvgEditorApp(storage).interpreter;
}

describe('CommandInterpreter', () => {
  it('ignores blank lines and comments', () => {
    const interpreter = interpreterWith();
    expect(interpreter.interpret('')).toEqual([]);
    expect(interpreter.interpret('   ')).toEqual([]);
    expect(interpreter.interpret('# a comment')).toEqual([]);
    expect(interpreter.interpret('   # indented comment')).toEqual([]);
  });

  it('prefixes every failure with "error:"', () => {
    const interpreter = interpreterWith();
    expect(interpreter.interpret('frobnicate')).toEqual(["error: unknown command: frobnicate (type 'help' for commands)"]);
    expect(interpreter.interpret('tree')).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(interpreter.interpret('init 0')).toEqual(['error: canvas size must be positive']);
    expect(interpreter.interpret('init 10 20 30')).toEqual(['error: usage: init [w] [h]']);
  });

  it('parses each command family', () => {
    const storage = new InMemoryStorage();
    storage.files.set('other.svg', readFileSync('test/fixtures/other.svg', 'utf8'));
    const interpreter = interpreterWith(storage);
    const run = (line: string) => interpreter.interpret(line);
    expect(run('read other.svg')).toEqual(['warning: assigned id rect1 to unnamed <rect>', 'read other.svg (7 elements)']);
    expect(run('canvas')).toEqual(['canvas 400x300']);
    expect(run('canvas 500')).toEqual(['canvas resized to 500x300']);
    expect(run('create g scene')).toEqual(['g#scene created']);
    expect(run('create line l1 0 0 10 10 black in scene')).toEqual(['line#l1 created in g#scene']);
    expect(run('create text t2 1 2 "in" in scene')).toEqual(['text#t2 created in g#scene']);
    expect(run('addto scene c1')).toEqual(['circle#c1 added to g#scene']);
    expect(run('front t1')).toEqual(['text#t1 brought to front']);
    expect(run('back t1')).toEqual(['text#t1 sent to back']);
    expect(run('scale scene 2')).toEqual(['g#scene scaled by 2']);
    expect(run('set c1 stroke-width 3')).toEqual(['circle#c1 updated: stroke-width=3']);
    expect(run('group pair r2 c2')).toEqual(['g#pair created with 2 children']);
    expect(run('ungroup pair')).toEqual(['g#pair ungrouped, 2 children moved to g#g1']);
    expect(run('delete e1')).toEqual(['ellipse#e1 deleted']);
    expect(run('tree scene')[0]).toBe('g#scene');
    expect(run('show t2')).toEqual(['text#t2  parent=g#scene', '  x=2 y=4 text="in"']); // scaled with scene
    expect(run('save')).toEqual(['saved to other.svg (9 elements)']); // 7 read + 3 created - 1 deleted
    expect(run('undo')).toEqual(['error: undo not allowed after io command']);
    expect(run('init')).toEqual(['canvas 800x600 created']);
    expect(run('undo')).toEqual(['error: undo not allowed after io command']);
    expect(run('redo')).toEqual(['error: redo not allowed after io command']);
  });

  it('reports usage errors per command', () => {
    const run = (line: string) => interpreterWith().interpret(line);
    expect(run('read')).toEqual(['error: usage: read <file.svg>']);
    expect(run('move a 1')).toEqual(['error: usage: move <id> <dx> <dy>']);
    expect(run('group g')).toEqual(['error: usage: group <newGid> <id1> <id2>…']);
    expect(run('create rect')).toEqual(['error: usage: create <type> <id> [params…] [in <containerId>]']);
    expect(run('undo now')).toEqual(['error: usage: undo']);
  });

  it('exit marks the interpreter finished', () => {
    const interpreter = interpreterWith();
    expect(interpreter.finished).toBe(false);
    expect(interpreter.interpret('exit')).toEqual([]);
    expect(interpreter.finished).toBe(true);
  });

  it('help lists every command and every shape type', () => {
    const help = interpreterWith().interpret('help');
    for (const name of ['init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group', 'ungroup',
      'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo']) {
      expect(help.some((line) => line.trimStart().startsWith(name)), name).toBe(true);
    }
    for (const type of ['rect', 'circle', 'ellipse', 'line', 'text', 'g']) {
      expect(help.some((line) => line.includes(`create ${type} <id>`)), type).toBe(true);
    }
  });

  it('turns unexpected exceptions into an internal error line', () => {
    const app = new SvgEditorApp(new InMemoryStorage());
    app.interpreter.interpret('init');
    const broken = {
      load: () => {
        throw new TypeError('disk on fire');
      },
      save: () => undefined,
    };
    const interpreter = new SvgEditorApp(broken).interpreter;
    expect(interpreter.interpret('read x.svg')).toEqual(['error: internal error: disk on fire']);
  });
});

describe('CommandRegistry', () => {
  it('refuses duplicate command names', () => {
    expect(() => new CommandRegistry().register(new InitParser()).register(new InitParser())).toThrow('already registered');
  });
});

describe('SvgEditorApp', () => {
  it('banner version follows package.json (major.minor)', () => {
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
    expect(SvgEditorApp.VERSION).toBe(version.split('.').slice(0, 2).join('.'));
  });
});
