import { beforeEach, describe, expect, it } from 'vitest';
import { CanvasCommandsFixture } from './CanvasCommandsFixture.js';
import { InitDocumentCommand } from '../../src/command/InitDocumentCommand.js';
import { MoveShapeCommand } from '../../src/command/MoveShapeCommand.js';
import { RedoCommand } from '../../src/command/RedoCommand.js';
import { ResizeCanvasCommand } from '../../src/command/ResizeCanvasCommand.js';
import { SaveDocumentCommand } from '../../src/command/SaveDocumentCommand.js';
import { ShowCanvasCommand } from '../../src/command/ShowCanvasCommand.js';
import { TreeCommand } from '../../src/command/TreeCommand.js';
import { UndoCommand } from '../../src/command/UndoCommand.js';
import { CommandHarness } from '../support/CommandHarness.js';

describe('undo / redo granularity (spec 4.3)', () => {
  let harness: CommandHarness;

  beforeEach(() => {
    harness = CanvasCommandsFixture.withCircle();
  });

  it('undo then redo replays the same message', () => {
    expect(harness.run(new MoveShapeCommand('c1', 30, 0))).toEqual(['circle#c1 moved to (130,100)']);
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (100,100)']);
    expect(harness.run(new RedoCommand())).toEqual(['circle#c1 moved to (130,100)']);
  });

  it('several edits undo in reverse order', () => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.run(new MoveShapeCommand('c1', 0, 2));
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (101,100)']);
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (100,100)']);
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 removed']);
    harness.expectFailure(new UndoCommand(), 'nothing to undo');
    harness.run(new RedoCommand());
    harness.run(new RedoCommand());
    expect(harness.run(new RedoCommand())).toEqual(['circle#c1 moved to (101,102)']);
    harness.expectFailure(new RedoCommand(), 'nothing to redo');
  });

  it('a new edit after undo clears the redo stack', () => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.run(new UndoCommand());
    harness.run(new MoveShapeCommand('c1', 5, 0));
    harness.expectFailure(new RedoCommand(), 'nothing to redo');
  });

  it('display commands do not enter the history', () => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.run(new TreeCommand());
    harness.run(new ShowCanvasCommand());
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (100,100)']);
  });

  it.each([
    ['save', () => new SaveDocumentCommand('demo.svg')],
    ['canvas resize', () => new ResizeCanvasCommand(1000, 800)],
    ['init', () => new InitDocumentCommand()],
  ])('%s forbids undo and redo until the next edit', (_name, makeCommand) => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.run(new UndoCommand());
    harness.run(makeCommand());
    harness.expectFailure(new UndoCommand(), 'undo not allowed after io command');
    harness.expectFailure(new RedoCommand(), 'redo not allowed after io command');
  });

  it('the next edit lifts the lock, but only back to the io barrier', () => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.run(new SaveDocumentCommand('demo.svg'));
    harness.run(new MoveShapeCommand('c1', 0, 1));
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (101,100)']);
    harness.expectFailure(new UndoCommand(), 'nothing to undo');
  });

  it('a failed io command does not set the barrier', () => {
    harness.run(new MoveShapeCommand('c1', 1, 0));
    harness.storage.unwritable.add('ro.svg');
    harness.expectFailure(new SaveDocumentCommand('ro.svg'), 'cannot write file: ro.svg');
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 moved back to (100,100)']);
  });

  it('undo / redo without a document', () => {
    const empty = new CommandHarness();
    empty.expectFailure(new UndoCommand(), "no document. use 'init' or 'read' first");
    empty.expectFailure(new RedoCommand(), "no document. use 'init' or 'read' first");
  });

  it('undo right after init is an io error', () => {
    const fresh = new CommandHarness();
    fresh.run(new InitDocumentCommand());
    fresh.expectFailure(new UndoCommand(), 'undo not allowed after io command');
  });
});
