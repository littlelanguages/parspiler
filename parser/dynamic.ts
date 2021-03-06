import * as Path from "https://deno.land/std@0.76.0/path/mod.ts";

import { Either, left } from "../data/either.ts";
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
import * as Scanpiler from "../tool/scanpiler.ts";

export const translate = (
  inputFileName: string,
  input: string,
): Promise<Either<Errors.Errors, Definition>> =>
  Parser
    .parseDefinition(input)
    .mapLeft((e) => [e] as Errors.Errors)
    .either(
      (l) => Promise.resolve(left(l) as Either<Errors.Errors, Definition>),
      (ast) => {
        const fileName = dropRight(1, dropLeft(1, ast.uses.value));

        return Deno.readTextFile(relativeTo(
          inputFileName,
          fileName,
        )).then((input) =>
          Scanpiler
            .translate(input).mapLeft((e) => [{
              tag: "ScannerDefinitionError",
              location: ast.uses.location,
              fileName: fileName,
              errors: e,
            } as Errors.ErrorItem])
            .andThen((scannerDefinition) =>
              translateAST(ast, scannerDefinition)
            )
        ).catch((_) =>
          left([{
            tag: "ScannerDefinitionFileDoesNotExistError",
            location: ast.uses.location,
            name: fileName,
          }])
        );
      },
    );

const relativeTo = (src: string, target: string): string => {
  let srcParse = Path.parse(src);
  const targetParse = Path.parse(target);
  return (srcParse.root !== targetParse.root ||
      targetParse.dir.startsWith("/"))
    ? target
    : Path.normalize(Path.format(
      Object.assign(
        targetParse,
        { dir: srcParse.dir + "/" + targetParse.dir },
      ),
    ));
};

const translateAST = (
  ast: AST.Definition,
  scannerDefinition: Scanpiler.Definition,
): Either<Errors.Errors, Definition> => {
  const nonTerminals = Set.setOf(ast.productions.map((p) => p.name.id));
  const terminals = Set.setOf(scannerDefinition.tokens.map((t) => t[0]));

  const errors: Errors.Errors = [];

  const translateExpr = (expr: AST.Expr): Expr => {
    switch (expr.tag) {
      case "ID":
        if (!nonTerminals.has(expr.id) && !terminals.has(expr.id)) {
          errors.push({
            tag: "UnknownSymbolError",
            location: expr.location,
            name: expr.id,
          });
        }

        return mkIdentifier(expr.id);
      case "LiteralString":
        return mkIdentifier(
          addLiteralToken(
            scannerDefinition,
            dropRight(1, dropLeft(1, expr.value)),
          ),
        );
      case "ParenExpr":
        return translateExpr(expr.expr);
      case "SequenceExpr":
        return mkSequence(expr.exprs.map((e) => translateExpr(e)));
      case "AlternativeExpr":
        return mkAlternative(expr.exprs.map((e) => translateExpr(e)));
      case "ManyExpr":
        return mkMany(translateExpr(expr.expr));
      case "OptionalExpr":
        return mkOptional(translateExpr(expr.expr));
      default:
        throw new Error(`TBD: translateExpr: ${expr}`);
    }
  };

  const translateProductions = () => {
    const productions: Array<Production> = [];

    const translateProduction = (production: AST.Production) => {
      if (terminals.has(production.name.id)) {
        errors.push({
          tag: "SymbolDefinedAsTerminalError",
          location: production.name.location,
          name: production.name.id,
        });
      }
      if (Set.setOf(productions.map((p) => p.lhs)).has(production.name.id)) {
        errors.push({
          tag: "SymbolDefinedAsNonTerminalError",
          location: production.name.location,
          name: production.name.id,
        });
      }

      productions.push(
        mkProduction(production.name.id, translateExpr(production.expr)),
      );
    };

    ast.productions.forEach((p) => translateProduction(p));

    return productions;
  };

  const productions = translateProductions();

  return (errors.length === 0)
    ? mkDefinition(scannerDefinition, productions)
    : left(errors);
};

const addLiteralToken = (
  scanner: Scanpiler.Definition,
  text: string,
): string => {
  const token = scanner.literalMatch(text);

  if (token === undefined) {
    const tokenName = calculateTokenName(scanner, text);

    scanner.addToken(
      tokenName,
      new Scanpiler.LiteralStringRegEx(text),
      0,
    );

    return tokenName;
  } else {
    return token[0];
  }
};

export const calculateTokenName = (
  scanner: Scanpiler.Definition,
  text: string,
): string => {
  let candidateName = "";

  const appendName = (name: string) => {
    candidateName = candidateName + name;
  };

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
};

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
