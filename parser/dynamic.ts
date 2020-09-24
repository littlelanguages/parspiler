import { Either, right, left } from "../data/either.ts";
import { dropLeft, dropRight } from "../data/string.ts";
import * as Set from "../data/set.ts";

import * as Parser from "./parser.ts";
import * as AST from "./ast.ts";
import * as Errors from "./errors.ts";
import {
  Definition,
  Expr,
  mkAlternative,
  mkDefinition,
  mkIdentifier,
  mkMany,
  mkOptional,
  mkProduction,
  mkSequence,
  Production,
} from "../cfg/definition.ts";
import { Dynamic, Definition as ScanpilerDefinition } from "../scanpiler.ts";

export function translate(
  input: string,
): Promise<Either<Errors.Errors, Definition>> {
  return Parser
    .parseDefinition(input, AST.visitor)
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
      ? right(mkDefinition(this.scannerDefinition, this.productions))
      : left(this.errors);
  }

  private translateProductions() {
    this.ast.productions.forEach((p) => this.translateProduction(p));
  }

  private translateProduction(production: AST.Production) {
    if (this.terminals.has(production.name.id)) {
      this.errors.push({
        tag: "SymbolDefinedAsTerminalError",
        location: production.name.location,
        name: production.name.id,
      });
    }
    if (Set.setOf(this.productions.map((p) => p.lhs)).has(production.name.id)) {
      this.errors.push({
        tag: "SymbolDefinedAsNonTerminalError",
        location: production.name.location,
        name: production.name.id,
      });
    }

    this.productions.push(
      mkProduction(production.name.id, this.translateExpr(production.expr)),
    );
  }

  private translateExpr(expr: AST.Expr): Expr {
    switch (expr.tag) {
      case "ID":
        if (!this.nonTerminals.has(expr.id) && !this.terminals.has(expr.id)) {
          this.errors.push({
            tag: "UnknownSymbolError",
            location: expr.location,
            name: expr.id,
          });
        }

        return mkIdentifier(expr.id);
      case "LiteralString":
        return mkIdentifier(
          addLiteralToken(
            this.scannerDefinition,
            dropRight(1, dropLeft(1, expr.value)),
          ),
        );
      case "ParenExpr":
        return this.translateExpr(expr.expr);
      case "SequenceExpr":
        return mkSequence(expr.exprs.map((e) => this.translateExpr(e)));
      case "AlternativeExpr":
        return mkAlternative(expr.exprs.map((e) => this.translateExpr(e)));
      case "ManyExpr":
        return mkMany(this.translateExpr(expr.expr));
      case "OptionalExpr":
        return mkOptional(this.translateExpr(expr.expr));
      default:
        throw new Error(`TBD: translateExpr: ${expr}`);
    }
  }
}

function addLiteralToken(
  scanner: ScanpilerDefinition.Definition,
  text: string,
): string {
  const token = scanner.literalMatch(text);

  if (token == undefined) {
    const tokenName = calculateTokenName(scanner, text);

    scanner.addToken(
      tokenName,
      new ScanpilerDefinition.LiteralStringRegEx(text),
      0,
    );

    return tokenName;
  } else {
    return token[0];
  }
}

export function calculateTokenName(
  scanner: ScanpilerDefinition.Definition,
  text: string,
): string {
  let candidateName = "";

  function appendName(name: string) {
    candidateName = candidateName + name;
  }

  for (const c of text) {
    const cc = c.charCodeAt(0);
    if (cc < 32 || cc > 127) {
      appendName("H" + cc);
    } else {
      appendName(characterMappings[cc - 32]);
    }
  }

  candidateName = (candidateName[0] >= "0" && candidateName[0] <= "9")
    ? `H${candidateName}`
    : (candidateName[0] >= "a" && candidateName[0] <= "z")
    ? String.fromCharCode(candidateName.charCodeAt(0) - 32) +
      candidateName.substr(1)
    : candidateName;

  if (scanner.hasToken(candidateName)) {
    let lp = 1;

    while (true) {
      const testName = `${candidateName}${lp}`;
      if (scanner.hasToken(testName)) {
        lp += 1;
      } else {
        return testName;
      }
    }
  } else {
    return candidateName;
  }
}

const characterMappings = [
  "Space", // 32
  "Bang",
  "Quote",
  "Hash",
  "Dollar",
  "Percent",
  "Ampersand",
  "Tick",
  "LParen",
  "RParen",
  "Star",
  "Plus",
  "Comma",
  "Dash",
  "Period",
  "Slash",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "Colon",
  "Semicolon",
  "LessThan",
  "Equal",
  "GreaterThan",
  "Question",
  "At",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "LBracket",
  "Backslash",
  "RBracket",
  "Cap",
  "Underscore",
  "Backtick",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "LCurly",
  "Bar",
  "RCurly",
  "Tilde",
];
