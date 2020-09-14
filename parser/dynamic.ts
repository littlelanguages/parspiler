import { Either, right, left } from "../data/either.ts";

import * as Parser from "./parser.ts";
import * as AST from "./ast.ts";
import { Errors } from "./errors.ts";

export function translate(input: string): Promise<Either<Errors, string>> {
  return Promise.resolve(tt(input));
}

function tt(input: string): Either<Errors, string> {
  return Parser.parseDefinition(input, new AST.Visitor()).map((_) => "");
}
