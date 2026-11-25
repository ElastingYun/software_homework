import type { SourcePosition } from './SourcePosition';

/** 源码中的一段范围 [start, end)。 */
export class SourceSpan {
  constructor(
    readonly start: SourcePosition,
    readonly end: SourcePosition,
  ) {}
}
