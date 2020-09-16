import { Either, right, left } from "../data/either.ts";
import { dropLeft, dropRight } from "../data/string.ts";

import * as Parser from "./parser.ts";
import * as AST from "./ast.ts";
import * as Errors from "./errors.ts";
import { Definition } from "../cfg/definition.ts";
import { Dynamic } from "../scanpiler.ts";

export function translate(
  input: string,
): Promise<Either<Errors.Errors, Definition>> {
  return Parser
    .parseDefinition(input, new AST.Visitor())
    .either(
      (l) => Promise.resolve(left(l)),
      async (ast) => {
        const fileName = dropRight(1, dropLeft(1, ast.uses.value));
        try {
          const input = await Deno.readTextFile(fileName);
          return Dynamic.translate(input).mapLeft((e) => [{
            tag: "ScannerDefinitionError",
            location: ast.uses.location,
            fileName: fileName,
            errors: e,
          }]).map((scannerDefinition) => new Definition(scannerDefinition));
        } catch (_) {
          return left(
            [
              {
                tag: "ScannerDefinitionFileDoesNotExistError",
                location: ast.uses.location,
                name: fileName,
              },
            ] as Errors.Errors,
          );
        }
      },
    ) as Promise<Either<Errors.Errors, Definition>>;
}
