import { Scanner } from "../scanpiler.ts";

export class Definition {
  scanner: Scanner.Definition;

  constructor(scanner: Scanner.Definition) {
    this.scanner = scanner;
  }
}
