import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UngroupCommand } from '../../src/command/UngroupCommand.js';
import { GroupShape } from '../../src/model/GroupShape.js';
import { CliSession } from '../support/CliSession.js';

/** 以说明文档章节为纲的验收测试：每个断言都对应说明文档中的一句规则或一个样例。 */

function flowchart(): CliSession {
  const session = new CliSession();
  session.run(
    'init 800 600',
    'create g flowchart',
    'create g node1 in flowchart',
    'create rect start 120 100 160 60 #4a90d9 in node1',
    'create text start-label 155 135 "开始" in node1',
  );
  return session;
}

describe('§2 通用约定', () => {
  it('ids are unique and case sensitive', () => {
    const session = flowchart();
    expect(session.run('create rect Start 0 0 1 1')).toEqual(['rect#Start created']);
    session.expectError('create circle start 0 0 1', 'id already exists: start');
    session.expectError('create g flowchart', 'id already exists: flowchart');
    session.expectError('move START 1 1', 'no such shape: START');
  });

  it('floating-point coordinates are accepted and shown without noise', () => {
    const session = flowchart();
    expect(session.run('create circle c 10.5 0.25 1e1')).toEqual(['circle#c created']);
    expect(session.run('move c 0.1 0.2')).toEqual(['circle#c moved to (10.6,0.45)']);
    expect(session.run('tree c')).toEqual(['circle#c  cx=10.6 cy=0.45 r=10']);
  });

  it('a failing command prints exactly one error line and changes nothing', () => {
    const session = flowchart();
    session.run('move start 5 5');
    session.expectError('move start 1 one', 'invalid number: one');
    session.expectError('set start bogus 1', 'unknown attribute: bogus');
    session.expectError('save', "no file path. use 'save <file.svg>'");
    expect(session.run('undo')).toEqual(['rect#start moved back to (120,100)']);
  });
});

describe('§2.1 Composite: containers and leaves accept the same operations', () => {
  it.each([
    ['move node1 10 0', 'g#node1 moved by (10,0)'],
    ['scale node1 2', 'g#node1 scaled by 2'],
    ['set node1 fill red', 'g#node1 updated: fill=red'],
    ['delete node1', 'g#node1 deleted'],
    ['move start 10 0', 'rect#start moved to (130,100)'],
    ['scale start 2', 'rect#start scaled by 2'],
    ['set start fill red', 'rect#start updated: fill=red'],
    ['delete start', 'rect#start deleted'],
  ])('%s', (line, message) => {
    expect(flowchart().run(line)).toEqual([message]);
  });

  it('container move/scale reach every descendant', () => {
    const session = flowchart();
    session.run('move flowchart 10 20', 'scale flowchart 0.5');
    expect(session.run('tree node1')).toEqual([
      'g#node1',
      '├── rect#start        x=65 y=60 w=80 h=30 fill=#4a90d9',
      '└── text#start-label  (82.5,77.5) "开始"',
    ]);
  });
});

describe('§4.1 create: parameters and generated SVG', () => {
  it.each([
    ['create rect r1 10 20 100 50 #eee', '<rect id="r1" x="10" y="20" width="100" height="50" fill="#eee"/>'],
    ['create circle c1 100 100 20 red', '<circle id="c1" cx="100" cy="100" r="20" fill="red"/>'],
    ['create ellipse e1 1 2 3 4', '<ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>'],
    ['create line l1 1 2 3 4 black', '<line id="l1" x1="1" y1="2" x2="3" y2="4" stroke="black"/>'],
    ['create text t1 20 40 "My Diagram"', '<text id="t1" x="20" y="40">My Diagram</text>'],
    ['create g scene', '<g id="scene"/>'],
  ])('%s → %s', (line, fragment) => {
    const session = new CliSession();
    session.run('init', line, 'save out.svg');
    expect(session.file('out.svg')).toContain(`  ${fragment}\n`);
  });

  it('omitted fill / stroke are not written', () => {
    const session = new CliSession();
    session.run('init', 'create rect r 0 0 1 1', 'create line l 0 0 1 1', 'save out.svg');
    expect(session.file('out.svg')).not.toMatch(/fill=|stroke=/);
  });

  it('in clause: creation-time ownership, with its two errors', () => {
    const session = flowchart();
    expect(session.run('create circle dot 1 1 1 in node1')).toEqual(['circle#dot created in g#node1']);
    session.expectError('create rect x 0 0 1 1 in node9', 'no such container: node9');
    session.expectError('create rect x 0 0 1 1 in start', 'not a container: start');
  });

  it('only rect / circle / ellipse / line / text / g are built in; box is a later plugin', () => {
    const session = flowchart();
    session.expectError('create hexagon h1 0 0', 'unknown shape type: hexagon (is the plugin loaded?)');
    session.expectError('create box n1 120 100 160 60 "开始"', 'unknown shape type: box (is the plugin loaded?)');
  });

  it('set whitelist per type; anything else is an unknown attribute', () => {
    const session = new CliSession();
    session.run('init', 'create rect r 0 0 1 1', 'create circle c 0 0 1', 'create ellipse e 0 0 1 1',
      'create line l 0 0 1 1', 'create text t 0 0 "x"', 'create g g');
    const whitelist: Record<string, string[]> = {
      r: ['x', 'y', 'width', 'height'],
      c: ['cx', 'cy', 'r'],
      e: ['cx', 'cy', 'rx', 'ry'],
      l: ['x1', 'y1', 'x2', 'y2'],
      t: ['x', 'y'],
      g: [],
    };
    for (const [id, geometry] of Object.entries(whitelist)) {
      for (const attribute of [...geometry, 'fill', 'stroke', 'stroke-width']) {
        expect(session.run(`set ${id} ${attribute} 3`)[0], `${id}.${attribute}`).toMatch(/updated:/);
      }
      session.expectError(`set ${id} opacity 1`, 'unknown attribute: opacity');
    }
    expect(session.run('set t text "hello world"')).toEqual(['text#t updated: text="hello world"']);
    session.expectError('set r text "x"', 'unknown attribute: text');
    session.expectError('set c width 3', 'unknown attribute: width');
  });
});

describe('§4.2 error table (every row)', () => {
  it('id already exists', () => flowchart().expectError('create rect start 0 0 1 1', 'id already exists: start'));
  it('no such shape', () => flowchart().expectError('delete r9', 'no such shape: r9'));
  it('in target missing', () => flowchart().expectError('create g x in node9', 'no such container: node9'));
  it('in target not a container', () => flowchart().expectError('create g x in start', 'not a container: start'));
  it('unknown shape type', () =>
    flowchart().expectError('create hexagon h 1', 'unknown shape type: hexagon (is the plugin loaded?)'));
  it('group a container with its own descendant', () =>
    flowchart().expectError('group bad start node1', 'cannot group a container into its own descendant: node1'));
  it('ungroup a top-level container', () =>
    flowchart().expectError('ungroup flowchart', 'cannot ungroup top-level container: flowchart'));
  it('scale factor not positive', () => {
    flowchart().expectError('scale start 0', 'scale factor must be positive');
    flowchart().expectError('scale start -1', 'scale factor must be positive');
  });
  it('file missing / not writable', () => {
    const session = flowchart();
    session.expectError('read a.svg', 'cannot read file: a.svg');
    session.storage.unwritable.add('a.svg');
    session.expectError('save a.svg', 'cannot write file: a.svg');
  });
  it('no document yet', () => {
    const session = new CliSession();
    for (const line of ['tree', 'save x.svg', 'create g g', 'undo', 'canvas', 'show x']) {
      session.expectError(line, "no document. use 'init' or 'read' first");
    }
  });
  it('ungroup a composite shape (hook for the plugin phase)', () => {
    const session = flowchart();
    const document = session.app.context.requireDocument();
    const composite = new (class extends GroupShape {
      override isComposite(): boolean {
        return true;
      }
    })('n1');
    document.attach(composite, document.requireContainer('flowchart'));
    expect(() => new UngroupCommand('n1').execute(session.app.context)).toThrow('cannot ungroup composite shape: n1');
  });
});

describe('§4.3 undo granularity', () => {
  it('group of three shapes is a single undo unit', () => {
    const session = new CliSession();
    session.run('init', 'create rect r1 0 0 1 1', 'create circle c1 0 0 1', 'create text t1 0 0 "t"');
    const before = session.run('tree');
    session.run('group g1 r1 c1 t1');
    expect(session.run('undo')).toEqual(['g#g1 dissolved, 3 children restored']);
    expect(session.run('tree')).toEqual(before);
  });

  it('read and canvas resize also block undo/redo until the next edit', () => {
    const session = new CliSession();
    session.storage.files.set('other.svg', readFileSync('test/fixtures/other.svg', 'utf8'));
    session.run('read other.svg');
    session.expectError('undo', 'undo not allowed after io command');
    session.run('move c1 1 1', 'canvas 500 500');
    session.expectError('undo', 'undo not allowed after io command');
    session.expectError('redo', 'redo not allowed after io command');
    session.run('move c1 1 1');
    expect(session.run('undo')).toEqual(['circle#c1 moved back to (51,51)']);
  });

  it('canvas without arguments is a display command and keeps undo available', () => {
    const session = flowchart();
    session.run('move start 1 0', 'canvas', 'tree', 'show start', 'help');
    expect(session.run('undo')).toEqual(['rect#start moved back to (120,100)']);
  });
});

describe('§5 display formats', () => {
  it('tree <id> shows only that subtree', () => {
    expect(flowchart().run('tree node1')).toEqual([
      'g#node1',
      '├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9',
      '└── text#start-label  (155,135) "开始"',
    ]);
  });
});

describe('§3 group / ungroup / addto / front / back semantics', () => {
  it('group keeps relative order and takes the position of the first member', () => {
    const session = new CliSession();
    session.run('init', 'create rect a 0 0 1 1', 'create rect b 0 0 1 1', 'create rect c 0 0 1 1', 'create rect d 0 0 1 1');
    session.run('group g d b');
    const structure = session.run('tree').slice(1).map((line) => line.replace(/ +x=.*$/, ''));
    expect(structure).toEqual(['├── rect#a', '├── g#g', '│   ├── rect#b', '│   └── rect#d', '└── rect#c']);
  });

  it('ungroup promotes children into the original place', () => {
    const session = flowchart();
    session.run('create g node2 in flowchart');
    expect(session.run('ungroup node1')).toEqual(['g#node1 ungrouped, 2 children moved to g#flowchart']);
    expect(session.run('tree flowchart')[1]).toMatch(/^├── rect#start/);
  });

  it('addto appends; front / back reorder among siblings', () => {
    const session = flowchart();
    session.run('create rect late 0 0 1 1', 'addto node1 late', 'back late');
    expect(session.run('tree node1').map((line) => line.split(' ')[1])).toEqual([undefined, 'rect#late', 'rect#start', 'text#start-label']);
    session.run('front late');
    expect(session.run('tree node1').at(-1)).toMatch(/rect#late/);
  });
});
