import * as Parser from "./parser.ts";

import { Location, combine } from "./location.ts";
import { Token } from "./scanner.ts";

export type Definition = {
  tag: "Definition";
  uses: LiteralString;
  productions: Array<Production>;
};

export type Production = {
  tag: "Production";
  name: IdentifierReference;
  expr: Expr;
};

export type Expr =
  | AlternativeExpr
  | SequenceExpr
  | ParenExpr
  | ManyExpr
  | OptionalExpr
  | LiteralString
  | IdentifierReference;

export type AlternativeExpr = {
  tag: "AlternativeExpr";
  exprs: Array<Expr>;
};

export type SequenceExpr = {
  tag: "SequenceExpr";
  exprs: Array<Expr>;
};

export type ParenExpr = {
  tag: "ParenExpr";
  location: Location;
  expr: Expr;
};

export type ManyExpr = {
  tag: "ManyExpr";
  location: Location;
  expr: Expr;
};

export type OptionalExpr = {
  tag: "OptionalExpr";
  location: Location;
  expr: Expr;
};

export type LiteralString = {
  tag: "LiteralString";
  location: Location;
  value: string;
};

export type IdentifierReference = {
  tag: "ID";
  location: Location;
  id: string;
};

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
