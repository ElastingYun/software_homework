import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

describe('extension manifest', () => {
  it('opens .svg files in the text editor by default so outline navigation stays in the source (BUG-V1)', () => {
    expect(manifest.contributes.configurationDefaults['workbench.editorAssociations']).toEqual({ '*.svg': 'default' });
  });

  it('activates after startup so the Explorer badge is available without opening a file', () => {
    expect(manifest.activationEvents).toEqual(['onStartupFinished']);
  });
});
