import { EditorContext } from '../command/EditorContext.js';
import { CommandInterpreter } from '../cli/CommandInterpreter.js';
import { CommandRegistry } from '../cli/CommandRegistry.js';
import { Repl } from '../cli/Repl.js';
import { AddToParser } from '../cli/parsers/AddToParser.js';
import { BackParser } from '../cli/parsers/BackParser.js';
import { CanvasParser } from '../cli/parsers/CanvasParser.js';
import { CreateParser } from '../cli/parsers/CreateParser.js';
import { DeleteParser } from '../cli/parsers/DeleteParser.js';
import { ExitParser } from '../cli/parsers/ExitParser.js';
import { FrontParser } from '../cli/parsers/FrontParser.js';
import { GroupParser } from '../cli/parsers/GroupParser.js';
import { HelpParser } from '../cli/parsers/HelpParser.js';
import { InitParser } from '../cli/parsers/InitParser.js';
import { MoveParser } from '../cli/parsers/MoveParser.js';
import { ReadParser } from '../cli/parsers/ReadParser.js';
import { RedoParser } from '../cli/parsers/RedoParser.js';
import { SaveParser } from '../cli/parsers/SaveParser.js';
import { ScaleParser } from '../cli/parsers/ScaleParser.js';
import { SetParser } from '../cli/parsers/SetParser.js';
import { ShowParser } from '../cli/parsers/ShowParser.js';
import { TreeParser } from '../cli/parsers/TreeParser.js';
import { UndoParser } from '../cli/parsers/UndoParser.js';
import { UngroupParser } from '../cli/parsers/UngroupParser.js';
import type { DocumentStorage } from '../io/DocumentStorage.js';
import { SvgFileStorage } from '../io/SvgFileStorage.js';
import { SvgReader } from '../io/SvgReader.js';
import { SvgWriter } from '../io/SvgWriter.js';
import { CircleShape } from '../model/CircleShape.js';
import { EllipseShape } from '../model/EllipseShape.js';
import { GroupShape } from '../model/GroupShape.js';
import { LineShape } from '../model/LineShape.js';
import { RectShape } from '../model/RectShape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { TextShape } from '../model/TextShape.js';

/**
 * 组装根（Composition Root）：唯一知道全部具体实现的地方。
 * 注册内置图形类型与命令、注入文件存储、启动 REPL。
 */
export class SvgEditorApp {
  static readonly VERSION = '0.8';
  static readonly BANNER = `svg-editor ${SvgEditorApp.VERSION} — type 'help' for commands`;

  readonly shapeFactory: ShapeFactory;
  readonly context: EditorContext;
  readonly interpreter: CommandInterpreter;

  /** @param storage 缺省为基于文件系统的 SvgFileStorage；测试可注入替身。 */
  constructor(storage?: DocumentStorage) {
    this.shapeFactory = SvgEditorApp.builtinShapes();
    this.context = new EditorContext(
      storage ?? new SvgFileStorage(new SvgReader(this.shapeFactory), new SvgWriter()),
    );
    this.interpreter = new CommandInterpreter(this.builtinCommands(), this.context);
  }

  async run(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, interactive: boolean): Promise<void> {
    await new Repl(this.interpreter, input, output, interactive).run(SvgEditorApp.BANNER);
  }

  private static builtinShapes(): ShapeFactory {
    return new ShapeFactory()
      .register(RectShape)
      .register(CircleShape)
      .register(EllipseShape)
      .register(LineShape)
      .register(TextShape)
      .register(GroupShape);
  }

  private builtinCommands(): CommandRegistry {
    const registry = new CommandRegistry();
    return registry
      .register(new InitParser())
      .register(new ReadParser())
      .register(new SaveParser())
      .register(new CanvasParser())
      .register(new CreateParser(this.shapeFactory))
      .register(new DeleteParser())
      .register(new MoveParser())
      .register(new ScaleParser())
      .register(new SetParser())
      .register(new GroupParser())
      .register(new UngroupParser())
      .register(new AddToParser())
      .register(new FrontParser())
      .register(new BackParser())
      .register(new TreeParser())
      .register(new ShowParser())
      .register(new HelpParser(registry))
      .register(new UndoParser())
      .register(new RedoParser())
      .register(new ExitParser());
  }
}
