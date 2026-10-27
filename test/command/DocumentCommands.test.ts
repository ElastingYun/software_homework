import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/command/Command.js';
import { AddToGroupCommand } from '../../src/command/AddToGroupCommand.js';
import { BringToFrontCommand } from '../../src/command/BringToFrontCommand.js';
import { CreateShapeCommand } from '../../src/command/CreateShapeCommand.js';
import { DeleteShapeCommand } from '../../src/command/DeleteShapeCommand.js';
import { ExitCommand } from '../../src/command/ExitCommand.js';
import { GroupShapesCommand } from '../../src/command/GroupShapesCommand.js';
import { HelpCommand } from '../../src/command/HelpCommand.js';
import { InitDocumentCommand } from '../../src/command/InitDocumentCommand.js';
import { MoveShapeCommand } from '../../src/command/MoveShapeCommand.js';
import { ReadDocumentCommand } from '../../src/command/ReadDocumentCommand.js';
import { ResizeCanvasCommand } from '../../src/command/ResizeCanvasCommand.js';
import { SaveDocumentCommand } from '../../src/command/SaveDocumentCommand.js';
import { ScaleShapeCommand } from '../../src/command/ScaleShapeCommand.js';
import { SendToBackCommand } from '../../src/command/SendToBackCommand.js';
import { SetAttributeCommand } from '../../src/command/SetAttributeCommand.js';
import { ShowCanvasCommand } from '../../src/command/ShowCanvasCommand.js';
import { ShowShapeCommand } from '../../src/command/ShowShapeCommand.js';
import { TreeCommand } from '../../src/command/TreeCommand.js';
import { UngroupCommand } from '../../src/command/UngroupCommand.js';
import { CommandHarness } from '../support/CommandHarness.js';
import { TestShapes } from '../support/TestShapes.js';
import { CanvasCommandsFixture } from './CanvasCommandsFixture.js';

describe('init', () => {
  it('creates 800x600 by default or the given size', () => {
    const harness = new CommandHarness();
    expect(harness.run(new InitDocumentCommand())).toEqual(['canvas 800x600 created']);
    expect(harness.run(new InitDocumentCommand(400, 200))).toEqual(['canvas 400x200 created']);
    expect(harness.document.shapeCount()).toBe(0);
  });

  it('replaces the current document and forgets its path', () => {
    const harness = new CommandHarness();
    harness.storage.files.set('other.svg', readFileSync('test/fixtures/other.svg', 'utf8'));
    harness.run(new ReadDocumentCommand('other.svg'));
    harness.run(new InitDocumentCommand());
    expect(harness.document.shapeCount()).toBe(0);
    expect(harness.context.documentPath).toBeNull();
  });

  it('rejects non-positive sizes without touching the current document', () => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.expectFailure(new InitDocumentCommand(0, 10), 'canvas size must be positive');
  });
});

describe('read', () => {
  it('reports warnings then the element count (spec transcript)', () => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.storage.files.set('other.svg', readFileSync('test/fixtures/other.svg', 'utf8'));
    expect(harness.run(new ReadDocumentCommand('other.svg'))).toEqual([
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (7 elements)',
    ]);
    expect(harness.context.documentPath).toBe('other.svg');
    expect(harness.run(new TreeCommand())[0]).toBe('svg (400x300)');
  });

  it('a missing file leaves the current document untouched', () => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.expectFailure(new ReadDocumentCommand('a.svg'), 'cannot read file: a.svg');
  });
});

describe('save', () => {
  it('writes the file and counts all elements (spec transcript: 5 elements)', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    expect(harness.run(new SaveDocumentCommand('demo.svg'))).toEqual(['saved to demo.svg (5 elements)']);
    expect(harness.storage.files.get('demo.svg')).toContain('<g id="markers">');
  });

  it('without a path saves to the read path, then to the last saved path', () => {
    const harness = new CommandHarness();
    harness.storage.files.set('other.svg', readFileSync('test/fixtures/other.svg', 'utf8'));
    harness.run(new ReadDocumentCommand('other.svg'));
    harness.run(new DeleteShapeCommand('rect1'));
    expect(harness.run(new SaveDocumentCommand())).toEqual(['saved to other.svg (6 elements)']);
    harness.run(new SaveDocumentCommand('copy.svg'));
    expect(harness.run(new SaveDocumentCommand())).toEqual(['saved to copy.svg (6 elements)']);
  });

  it('without a path after init is an error', () => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.expectFailure(new SaveDocumentCommand(), "no file path. use 'save <file.svg>'");
  });

  it('singular element count', () => {
    const harness = CanvasCommandsFixture.withCircle();
    expect(harness.run(new SaveDocumentCommand('one.svg'))).toEqual(['saved to one.svg (1 element)']);
  });
});

describe('canvas', () => {
  it('shows and resizes', () => {
    const harness = CanvasCommandsFixture.withCircle();
    expect(harness.run(new ShowCanvasCommand())).toEqual(['canvas 800x600']);
    expect(harness.run(new ResizeCanvasCommand(1024))).toEqual(['canvas resized to 1024x600']);
    expect(harness.run(new ResizeCanvasCommand(640, 480))).toEqual(['canvas resized to 640x480']);
    harness.expectFailure(new ResizeCanvasCommand(-1, 480), 'canvas size must be positive');
  });
});

describe('display commands', () => {
  it('tree, tree <id>, show <id>', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    expect(harness.run(new TreeCommand())).toHaveLength(6);
    expect(harness.run(new TreeCommand('markers'))[0]).toBe('g#markers');
    expect(harness.run(new ShowShapeCommand('c1'))).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
    harness.expectFailure(new TreeCommand('nope'), 'no such shape: nope');
    harness.expectFailure(new ShowShapeCommand('nope'), 'no such shape: nope');
  });

  it('help and exit work without a document', () => {
    const harness = new CommandHarness();
    expect(harness.run(new HelpCommand(['a', 'b']))).toEqual(['a', 'b']);
    expect(harness.context.shouldQuit).toBe(false);
    expect(harness.run(new ExitCommand())).toEqual([]);
    expect(harness.context.shouldQuit).toBe(true);
  });
});

describe('every other command needs a document (spec 4.2)', () => {
  const factory = TestShapes.factory();
  const commands: Array<[string, Command]> = [
    ['save', new SaveDocumentCommand('x.svg')],
    ['canvas', new ShowCanvasCommand()],
    ['canvas w h', new ResizeCanvasCommand(10, 10)],
    ['create', new CreateShapeCommand(factory.create('rect', 'r', ['0', '0', '1', '1']), null)],
    ['delete', new DeleteShapeCommand('r')],
    ['move', new MoveShapeCommand('r', 1, 1)],
    ['scale', new ScaleShapeCommand('r', 2)],
    ['set', new SetAttributeCommand('r', 'fill', 'red')],
    ['group', new GroupShapesCommand('g', ['r'])],
    ['ungroup', new UngroupCommand('g')],
    ['addto', new AddToGroupCommand('g', 'r')],
    ['front', new BringToFrontCommand('r')],
    ['back', new SendToBackCommand('r')],
    ['tree', new TreeCommand()],
    ['show', new ShowShapeCommand('r')],
  ];

  it.each(commands)('%s', (_name, command) => {
    new CommandHarness().expectFailure(command, "no document. use 'init' or 'read' first");
  });
});
