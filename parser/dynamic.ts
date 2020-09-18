import { Either, right, left } from "../data/either.ts";
import { dropLeft, dropRight } from "../data/string.ts";
import * as Set from "../data/set.ts";

import * as Parser from "./parser.ts";
import * as AST from "./ast.ts";
import * as Errors from "./errors.ts";
import {
  Alternative,
  Definition,
  Expr,
  Identifier,
  Many,
  Optional,
  Production,
  Sequence,
} from "../cfg/definition.ts";
import { Dynamic, Definition as ScanpilerDefinition } from "../scanpiler.ts";

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
          return Dynamic.translate(input).mapLeft((e) =>
            [{
              tag: "ScannerDefinitionError",
              location: ast.uses.location,
              fileName: fileName,
              errors: e,
            }] as Errors.Errors
          ).andThen((scannerDefinition) =>
            new Translate(ast, scannerDefinition).process()
          );
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

class Translate {
  private ast: AST.Definition;
  private scannerDefinition: ScanpilerDefinition.Definition;
  private productions: Array<Production> = [];
  private errors: Errors.Errors = [];
  private nonTerminals = Set.emptySet as Set<string>;
  private terminals = Set.emptySet as Set<string>;

  constructor(
    ast: AST.Definition,
    scannerDefinition: ScanpilerDefinition.Definition,
  ) {
    this.ast = ast;
    this.scannerDefinition = scannerDefinition;

    this.nonTerminals = Set.setOf(ast.productions.map((p) => p.name.id));
    this.terminals = Set.setOf(scannerDefinition.tokens.map((t) => t[0]));
  }

  process(): Either<Errors.Errors, Definition> {
    this.translateProductions();

    return (this.errors.length == 0)
      ? right(new Definition(this.scannerDefinition, this.productions))
      : left(this.errors);
  }

  private translateProductions() {
    this.ast.productions.forEach((p) => this.translateProduction(p));
  }

  private translateProduction(production: AST.Production) {
    this.productions.push(
      new Production(production.name.id, this.translateExpr(production.expr)),
    );
  }

  private translateExpr(expr: AST.Expr): Expr {
    if (expr.tag == "ID") {
      if (!this.nonTerminals.has(expr.id) && !this.terminals.has(expr.id)) {
        this.errors.push({
          tag: "UnknownSymbolError",
          location: expr.location,
          name: expr.id,
        });
      }

      return new Identifier(expr.id);
    } else if (expr.tag == "ParenExpr") {
      return this.translateExpr(expr.expr);
    } else if (expr.tag == "SequenceExpr") {
      return new Sequence(expr.exprs.map((e) => this.translateExpr(e)));
    } else if (expr.tag == "AlternativeExpr") {
      return new Alternative(expr.exprs.map((e) => this.translateExpr(e)));
    } else if (expr.tag == "ManyExpr") {
      return new Many(this.translateExpr(expr.expr));
    } else if (expr.tag == "OptionalExpr") {
      return new Optional(this.translateExpr(expr.expr));
    } else {
      throw new Error(`TBD: translateExpr: ${expr}`);
    }
  }
}
