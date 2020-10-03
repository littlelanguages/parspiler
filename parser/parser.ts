import { Either, left, right } from "../data/either.ts";
import { mkScanner, Token } from "./parspiler-scanner.ts";
import { combine } from "./location.ts";
import { Definition, Expr, Production } from "./ast.ts";
import * as Parser from "./parspiler-parser.ts";

export const visitor: Parser.Visitor<Definition, Production, Expr, Expr, Expr> =
  {
    visitDefinition: (
      _1: Token,
      a2: Token,
      _2: Token,
      a4: Array<Production>,
    ) => ({
      tag: "Definition",
      uses: { tag: "LiteralString", location: a2[1], value: a2[2] },
      productions: a4,
    }),

    visitProduction: (a1: Token, _1: Token, a3: Expr, _2: Token) => ({
      tag: "Production",
      name: { tag: "ID", location: a1[1], id: a1[2] },
      expr: a3,
    }),

    visitExpr: (a1: Expr, a2: Array<[Token, Expr]>) =>
      (a2.length == 0)
        ? a1
        : { tag: "AlternativeExpr", exprs: [a1, ...a2.map((c) => c[1])] },

    visitSequenceExpr: (a: Array<Expr>) =>
      (a.length == 1) ? a[0] : { tag: "SequenceExpr", exprs: a },

    visitFactor1: (a: Token) => ({
      tag: "LiteralString",
      location: a[1],
      value: a[2],
    }),

    visitFactor2: (a1: Token, a2: Expr, a3: Token) => ({
      tag: "ParenExpr",
      location: combine(a1[1], a3[1]),
      expr: a2,
    }),

    visitFactor3: (a1: Token, a2: Expr, a3: Token) => ({
      tag: "ManyExpr",
      location: combine(a1[1], a3[1]),
      expr: a2,
    }),

    visitFactor4: (a1: Token, a2: Expr, a3: Token) => ({
      tag: "OptionalExpr",
      location: combine(a1[1], a3[1]),
      expr: a2,
    }),

    visitFactor5: (a: Token) => ({ tag: "ID", location: a[1], id: a[2] }),
  };

export const parseDefinition = (
  input: string,
): Either<Parser.SyntaxError, Definition> => {
  try {
    return right(Parser.mkParser(mkScanner(input), visitor).definition());
  } catch (e) {
    return left(e);
  }
};

export const mkParser = (input: string) =>
  Parser.mkParser(mkScanner(input), visitor);
