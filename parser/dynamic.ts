import { Either, right, left } from "../data/either.ts";

import * as Parser from "./parser.ts";
import * as AST from "./ast.ts";
import * as Errors from "./errors.ts";
import { Definition } from "../cfg/definition.ts";
import { Scanner, Dynamic } from "../scanpiler.ts";
import { dropLeft, dropRight } from "../data/string.ts";

export function translate(
  input: string,
): Promise<Either<Errors.Errors, Definition>> {
  const xx = Parser.parseDefinition(input, new AST.Visitor());

  return xx.either(
    (l) => Promise.resolve(left(l)),
    async (r) => {
      const fileName = dropRight(1, dropLeft(1, r.uses.value));
      try {
        const input = await Deno.readTextFile(fileName);
        return Dynamic.translate(input);
      } catch (_) {
        return left(
          [
            {
              tag: "ScannerDefinitionFileDoesNotExistError",
              location: r.uses.location,
              name: fileName,
            },
          ] as Errors.Errors,
        );
      }
    },
  ) as Promise<Either<Errors.Errors, Definition>>;
}
