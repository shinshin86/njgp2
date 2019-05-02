const { readdir, readFile, lstat } = require("fs").promises;
const { join } = require("path");

interface searchScope {
  dir: boolean;
  file: boolean;
  symlink: boolean;
  grep: boolean;
  binary: boolean;
  hidden: boolean;
}

interface GrepOptions {
  ignorePattern?: RegExp;
  scope?: searchScope;
}

interface grepInfo {
  fpath: string;
  lineNumber: number;
  line: string;
}

const TEXT = {
  DIR_COLOR: "\u001b[36m",
  FILE_COLOR: "\u001b[34m",
  SYMLINK_COLOR: "\u001b[35m",
  GREP_COLOR: "\u001b[32m",
  HIT_COLOR: "\u001b[31m",
  NORM_COLOR: "\u001b[39m",
  BOLD_DECO: "\u001b[1m",
  NORM_DECO: "\u001b[0m"
};

class Grep {
  pattern: RegExp;
  ignorePattern?: RegExp;
  scope?: searchScope;

  constructor(pattern: RegExp, options: GrepOptions) {
    this.pattern = pattern;

    if (options.ignorePattern) this.ignorePattern = options.ignorePattern;
    if (options.scope) this.scope = options.scope;
  }

  async search(fpath: string): Promise<void> {
    let targetDirs: Array<string>;
    targetDirs = await readdir(fpath);
    // console.log("targetDirs:", targetDirs);

    if (this.ignorePattern) {
      targetDirs = targetDirs.filter((dir: string) => {
        if (this.ignorePattern && !this.ignorePattern.test(dir)) return dir;
      });
    }

    for (const dir of targetDirs) {
      const stat = await lstat(join(fpath, dir));

      if (stat.isDirectory()) this.search(join(fpath, dir));
      if (stat.isFile()) this.fileSearch(join(fpath, dir));
    }
  }

  async fileSearch(fpath: string): Promise<void> {
    const data = await readFile(fpath, "utf8");
    const lines: Array<string> = data.split(/\r?\n/);
    const size: number = lines.length;
    const maxWidth: number = size.toString().length;

    const lineWithIndexList = lines
      .map((line: string, index: number) => [
        (index + 1).toString().padStart(maxWidth, " "),
        line
      ])
      .filter(
        (lineWithIndex: Array<string>) =>
          lineWithIndex[1].search(this.pattern) > -1
      );

    for (const lineWithIndex of lineWithIndexList) {
      report(lineWithIndex[0], lineWithIndex[1], fpath, this.pattern);
    }
  }
}

/**
 * Report function
 */
function report(
  index: string,
  line: string,
  fpath: string,
  pattern: RegExp
): void {
  console.log(
    `${TEXT.GREP_COLOR}[GREP] ${TEXT.FILE_COLOR}${fpath}:${index} ${
      TEXT.NORM_COLOR
    }${decoText(line, pattern)}
      ${TEXT.NORM_DECO}`
  );
}

/**
 * Decoration Text
 */
function decoText(line: string, pattern: RegExp): string {
  return line.replace(
    pattern,
    `${TEXT.HIT_COLOR}${getPatternText(pattern)}${TEXT.NORM_COLOR}`
  );
}

/**
 * Get Pattern Text
 */
function getPatternText(pattern: RegExp): string {
  return pattern.toString().slice(1, pattern.toString().length - 1);
}

/**
 * main function
 */
async function main(
  word: string,
  fpath: string,
  ignorePath: string | null
): Promise<void> {
  const options: GrepOptions = {};
  if (ignorePath) options.ignorePattern = new RegExp(ignorePath);

  const grep = new Grep(new RegExp(word), options);
  await grep.search(fpath);
}

(async () => main(process.argv[2], process.argv[3], process.argv[4]))();
