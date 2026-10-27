import { CircleShape } from '../../src/model/CircleShape.js';
import { EllipseShape } from '../../src/model/EllipseShape.js';
import { GroupShape } from '../../src/model/GroupShape.js';
import { LineShape } from '../../src/model/LineShape.js';
import { RectShape } from '../../src/model/RectShape.js';
import { ShapeFactory } from '../../src/model/ShapeFactory.js';
import { TextShape } from '../../src/model/TextShape.js';

/** 测试用：注册了 6 种内置类型的工厂（与组装根的注册一致）。 */
export class TestShapes {
  static factory(): ShapeFactory {
    return new ShapeFactory()
      .register(RectShape)
      .register(CircleShape)
      .register(EllipseShape)
      .register(LineShape)
      .register(TextShape)
      .register(GroupShape);
  }
}
