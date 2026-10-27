import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { SvgEditorApp } from '../../src/app/SvgEditorApp.js';
import { InMemoryStorage } from '../support/InMemoryStorage.js';

async function replay(script: string, interactive = false): Promise<string> {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', (chunk) => {
    text += chunk.toString();
  });
  const done = new SvgEditorApp(new InMemoryStorage()).run(input, output, interactive);
  input.end(script);
  await done;
  return text;
}

describe('Repl', () => {
  it('echoes commands with the prompt and keeps comments in script mode', async () => {
    const text = await replay('# setup\ninit 400 200\n\ncreate g flow\n');
    expect(text).toBe(
      [
        `svg-editor ${SvgEditorApp.VERSION} — type 'help' for commands`,
        '',
        '# setup',
        'svg> init 400 200',
        'canvas 400x200 created',
        '',
        'svg> create g flow',
        'g#flow created',
        '',
      ].join('\n'),
    );
  });

  it('stops at exit', async () => {
    const text = await replay('init\nexit\ncreate g never\n');
    expect(text).toContain('svg> exit\n');
    expect(text).not.toContain('never');
  });

  it('handles CRLF line endings', async () => {
    const text = await replay('init 10 20\r\ncanvas\r\n');
    expect(text).toContain('svg> canvas\ncanvas 10x20\n');
  });

  it('interactive mode prints prompts instead of echoing', async () => {
    const text = await replay('init\n', true);
    expect(text).toContain('svg> ');
    expect(text).toContain('canvas 800x600 created');
    expect(text).not.toContain('svg> init');
  });
});
