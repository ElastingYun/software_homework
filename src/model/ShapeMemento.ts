/** 备忘录（Memento）：图形几何状态的快照，用于精确撤销 move / scale。 */
export interface ShapeMemento {
  restore(): void;
}
