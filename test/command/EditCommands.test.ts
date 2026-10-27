import { describe, expect, it } from 'vitest';
import { AddToGroupCommand } from '../../src/command/AddToGroupCommand.js';
import { BringToFrontCommand } from '../../src/command/BringToFrontCommand.js';
import { DeleteShapeCommand } from '../../src/command/DeleteShapeCommand.js';
import { GroupShapesCommand } from '../../src/command/GroupShapesCommand.js';
import { MoveShapeCommand } from '../../src/command/MoveShapeCommand.js';
import { RedoCommand } from '../../src/command/RedoCommand.js';
import { ScaleShapeCommand } from '../../src/command/ScaleShapeCommand.js';
import { SendToBackCommand } from '../../src/command/SendToBackCommand.js';
import { SetAttributeCommand } from '../../src/command/SetAttributeCommand.js';
import { UndoCommand } from '../../src/command/UndoCommand.js';
import { UngroupCommand } from '../../src/command/UngroupCommand.js';
import { CommandHarness } from '../support/CommandHarness.js';
import { CanvasCommandsFixture } from './CanvasCommandsFixture.js';

/** 执行 → undo → redo，并断言 undo 后状态与执行前完全相同、redo 后与执行后完全相同。 */
function roundTrip(harness: CommandHarness, command: Parameters<CommandHarness['run']>[0]): string[][] {
  const before = harness.snapshot();
  const done = harness.run(command);
  const after = harness.snapshot();
  const undone = harness.run(new UndoCommand());
  expect(harness.snapshot().replace(/undo=\d+ redo=\d+/, '')).toBe(before.replace(/undo=\d+ redo=\d+/, ''));
  const redone = harness.run(new RedoCommand());
  expect(harness.snapshot()).toBe(after);
  return [done, undone, redone];
}

describe('create', () => {
  it('at the root and inside a container (in clause)', () => {
    const harness = CanvasCommandsFixture.withCircle();
    expect(harness.create('g', 'node1', [])).toEqual(['g#node1 created']);
    expect(harness.create('rect', 'start', ['120', '100', '160', '60', '#4a90d9'], 'node1')).toEqual([
      'rect#start created in g#node1',
    ]);
    expect(harness.create('g', 'inner', [], 'node1')).toEqual(['g#inner created in g#node1']);
    expect(harness.ids()).toEqual(['c1', 'node1', 'start', 'inner']);
  });

  it('undo removes, redo re-creates the same object', () => {
    const harness = CanvasCommandsFixture.withCircle();
    const created = harness.document.requireShape('c1');
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 removed']);
    expect(harness.document.hasId('c1')).toBe(false);
    expect(harness.run(new RedoCommand())).toEqual(['circle#c1 created']);
    expect(harness.document.requireShape('c1')).toBe(created);
  });
});

describe('delete', () => {
  it('removes a container with all descendants as one undo unit', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    const [done, undone, redone] = roundTrip(harness, new DeleteShapeCommand('markers'));
    expect(done).toEqual(['g#markers deleted']);
    expect(undone).toEqual(['g#markers restored']);
    expect(redone).toEqual(['g#markers deleted']);
    expect(harness.ids()).toEqual(['bg', 'title']);
  });

  it('restores a nested shape into its container at the same index (spec transcript)', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    expect(harness.run(new DeleteShapeCommand('box'))).toEqual(['rect#box deleted']);
    expect(harness.run(new UndoCommand())).toEqual(['rect#box restored into g#markers']);
    expect(harness.ids()).toEqual(['bg', 'title', 'markers', 'c1', 'box']);
  });
});

describe('move', () => {
  it('container moves as a whole and reports the delta (spec 6.1)', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    const [done, undone] = roundTrip(harness, new MoveShapeCommand('markers', 0, 100));
    expect(done).toEqual(['g#markers moved by (0,100)']);
    expect(undone).toEqual(['g#markers moved back by (0,-100)']);
    expect(harness.document.requireShape('box').summary()).toBe('x=200 y=180 w=60 h=60 fill=#3366ff');
  });

  it('undo is exact for fractional moves', () => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.run(new MoveShapeCommand('c1', 0.1, 0));
    harness.run(new MoveShapeCommand('c1', 0.2, 0));
    harness.run(new UndoCommand());
    harness.run(new UndoCommand());
    expect(harness.document.requireShape('c1').getAttribute('cx')).toBe('100');
  });

  it.each([
    ['rect', ['10', '20', '1', '1'], 'rect#s moved to (15,25)'],
    ['ellipse', ['10', '20', '1', '1'], 'ellipse#s moved to (15,25)'],
    ['line', ['10', '20', '30', '40'], 'line#s moved to (15,25)'],
    ['text', ['10', '20', 'hi'], 'text#s moved to (15,25)'],
  ])('%s reports its anchor', (type, params, message) => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.create(type, 's', params);
    expect(harness.run(new MoveShapeCommand('s', 5, 5))).toEqual([message]);
  });
});

describe('scale', () => {
  it('multiplies every geometric attribute, recursively for containers', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    const [done, undone] = roundTrip(harness, new ScaleShapeCommand('markers', 0.5));
    expect(done).toEqual(['g#markers scaled by 0.5']);
    expect(undone).toEqual(['g#markers scale by 0.5 undone']);
    expect(harness.document.requireShape('c1').summary()).toBe('cx=50 cy=50 r=10 fill=red');
    expect(harness.document.requireShape('box').summary()).toBe('x=100 y=40 w=30 h=30 fill=#3366ff');
  });

  it.each([0, -2])('rejects factor %s', (factor) => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.expectFailure(new ScaleShapeCommand('c1', factor), 'scale factor must be positive');
  });
});

describe('set', () => {
  it('text content (spec transcript)', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    const [done, undone] = roundTrip(harness, new SetAttributeCommand('title', 'text', 'My Diagram v2'));
    expect(done).toEqual(['text#title updated: text="My Diagram v2"']);
    expect(undone).toEqual(['text#title updated: text="My Diagram"']);
  });

  it('style attribute that was unset is removed again on undo', () => {
    const harness = CanvasCommandsFixture.withCircle();
    const [done, undone] = roundTrip(harness, new SetAttributeCommand('c1', 'stroke', 'black'));
    expect(done).toEqual(['circle#c1 updated: stroke=black']);
    expect(harness.run(new UndoCommand())).toEqual(['circle#c1 updated: stroke unset']);
    expect(undone).toEqual(['circle#c1 updated: stroke unset']);
  });

  it('geometry and style on containers', () => {
    const harness = CanvasCommandsFixture.withCircle();
    expect(harness.run(new SetAttributeCommand('c1', 'r', '25'))).toEqual(['circle#c1 updated: r=25']);
    harness.create('g', 'g1', []);
    expect(harness.run(new SetAttributeCommand('g1', 'fill', 'blue'))).toEqual(['g#g1 updated: fill=blue']);
  });

  it.each([
    ['c1', 'opacity', '1', 'unknown attribute: opacity'],
    ['c1', 'width', '1', 'unknown attribute: width'],
    ['c1', 'r', 'big', 'invalid number: big'],
    ['c1', 'r', '-1', 'r must be non-negative'],
    ['zz', 'fill', 'red', 'no such shape: zz'],
  ])('set %s %s %s fails: %s', (id, attribute, value, message) => {
    const harness = CanvasCommandsFixture.withCircle();
    harness.expectFailure(new SetAttributeCommand(id, attribute, value), message);
  });
});

describe('group', () => {
  it('takes the place of the first member and keeps document order (spec transcript)', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    const [done, undone, redone] = roundTrip(harness, new GroupShapesCommand('markers', ['box', 'c1']));
    expect(done).toEqual(['g#markers created with 2 children']);
    expect(undone).toEqual(['g#markers dissolved, 2 children restored']);
    expect(redone).toEqual(done);
    expect(harness.ids()).toEqual(['bg', 'title', 'markers', 'c1', 'box']);
  });

  it('collects shapes from different parents; one undo restores all of them', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    const before = harness.ids();
    roundTrip(harness, new GroupShapesCommand('mixed', ['title', 'box']));
    expect(harness.ids()).toEqual(['bg', 'mixed', 'title', 'box', 'markers', 'c1']);
    harness.run(new UndoCommand());
    expect(harness.ids()).toEqual(before);
  });

  it('can create nested groups and group containers', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    expect(harness.run(new GroupShapesCommand('all', ['bg', 'markers']))).toEqual(['g#all created with 2 children']);
    expect(harness.run(new GroupShapesCommand('solo', ['c1']))).toEqual(['g#solo created with 1 child']);
    expect(harness.document.requireShape('solo').parent).toBe(harness.document.requireShape('markers'));
  });

  it.each([
    [['c1', 'markers'], 'cannot group a container into its own descendant: markers'],
    [['box', 'nope'], 'no such shape: nope'],
    [['c1', 'c1'], 'duplicate id in group list: c1'],
    [[], 'group requires at least one shape'],
  ])('group bad %j fails: %s', (members, message) => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    harness.expectFailure(new GroupShapesCommand('bad', members), message);
  });

  it('new id must be unused', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.expectFailure(new GroupShapesCommand('c1', ['box']), 'id already exists: c1');
  });
});

describe('ungroup', () => {
  function nested(): CommandHarness {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    harness.run(new GroupShapesCommand('scene', ['title', 'markers']));
    return harness;
  }

  it('promotes children into the parent at the container position', () => {
    const harness = nested();
    const [done, undone] = roundTrip(harness, new UngroupCommand('markers'));
    expect(done).toEqual(['g#markers ungrouped, 2 children moved to g#scene']);
    expect(undone).toEqual(['g#markers regrouped with 2 children']);
    expect(harness.ids()).toEqual(['bg', 'scene', 'title', 'c1', 'box']);
  });

  it('warns about container attributes that cannot be kept', () => {
    const harness = nested();
    harness.run(new SetAttributeCommand('markers', 'fill', 'red'));
    expect(harness.run(new UngroupCommand('markers'))).toEqual([
      'warning: attributes of g#markers are not kept: fill',
      'g#markers ungrouped, 2 children moved to g#scene',
    ]);
  });

  it.each([
    ['scene', 'cannot ungroup top-level container: scene'],
    ['c1', 'not a container: c1'],
    ['nope', 'no such shape: nope'],
  ])('ungroup %s fails: %s', (id, message) => {
    nested().expectFailure(new UngroupCommand(id), message);
  });
});

describe('addto', () => {
  it('moves an existing shape to the end of a container', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.create('g', 'scene', []);
    const [done, undone] = roundTrip(harness, new AddToGroupCommand('scene', 'title'));
    expect(done).toEqual(['text#title added to g#scene']);
    expect(undone).toEqual(['text#title moved back into svg']);
    expect(harness.ids()).toEqual(['bg', 'c1', 'box', 'scene', 'title']);
  });

  it.each([
    ['nope', 'c1', 'no such container: nope'],
    ['c1', 'box', 'not a container: c1'],
    ['scene', 'nope', 'no such shape: nope'],
    ['scene', 'scene', 'cannot move a container into its own descendant: scene'],
    ['inner', 'scene', 'cannot move a container into its own descendant: scene'],
  ])('addto %s %s fails: %s', (group, id, message) => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.create('g', 'scene', []);
    harness.create('g', 'inner', [], 'scene');
    harness.expectFailure(new AddToGroupCommand(group, id), message);
  });
});

describe('front / back', () => {
  it('reorders among siblings and restores on undo', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    const [front, frontUndone] = roundTrip(harness, new BringToFrontCommand('bg'));
    expect(front).toEqual(['rect#bg brought to front']);
    expect(frontUndone).toEqual(['rect#bg z-order restored']);
    expect(harness.ids()).toEqual(['title', 'c1', 'box', 'bg']);
    const [back] = roundTrip(harness, new SendToBackCommand('box'));
    expect(back).toEqual(['rect#box sent to back']);
    expect(harness.ids()).toEqual(['box', 'title', 'c1', 'bg']);
  });

  it('works inside containers and on already-extreme positions', () => {
    const harness = CanvasCommandsFixture.transcriptScene();
    harness.run(new GroupShapesCommand('markers', ['c1', 'box']));
    harness.run(new SendToBackCommand('box'));
    expect(harness.ids()).toEqual(['bg', 'title', 'markers', 'box', 'c1']);
    harness.run(new SendToBackCommand('box'));
    expect(harness.ids()).toEqual(['bg', 'title', 'markers', 'box', 'c1']);
    harness.expectFailure(new BringToFrontCommand('nope'), 'no such shape: nope');
  });
});
