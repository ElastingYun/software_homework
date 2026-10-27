/** 表现属性取值规则（Strategy）：只约束用户经 `set` 的编辑；读入与撤销原样恢复，不经规则。 */
export interface StyleRule {
  /** 不合法时抛出 EditorError。 */
  validate(name: string, value: string): void;
}
