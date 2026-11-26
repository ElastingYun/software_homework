/** 判定一个路径是否按 SVG 文件处理：扩展名为 `.svg`，不区分大小写。 */
export class SvgFileRule {
  private static readonly EXTENSION = /\.svg$/i;

  matches(path: string): boolean {
    const name = path.slice(path.lastIndexOf('/') + 1);
    return name.length > '.svg'.length && SvgFileRule.EXTENSION.test(name);
  }
}
