#!/usr/bin/env node
import { SvgEditorApp } from './app/SvgEditorApp.js';

await new SvgEditorApp().run(process.stdin, process.stdout, process.stdin.isTTY === true);
