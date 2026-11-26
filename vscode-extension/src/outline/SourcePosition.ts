/** 源码中的位置：行与列都从 0 开始，列按 UTF-16 码元计数（与 VSCode 的 Position 一致）。 */
export class SourcePosition {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}
