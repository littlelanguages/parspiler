import * as Parser from "./parser.ts";

import { Location, combine } from "./location.ts";
import { Token, TToken } from "./scanner.ts";

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
  value: Expr;
};

export type ManyExpr = {
  tag: "ManyExpr";
  location: Location;
  value: Expr;
};

export type OptionalExpr = {
  tag: "OptionalExpr";
  location: Location;
  value: Expr;
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

export class Visitor
  implements Parser.Visitor<Definition, Production, Expr, Expr, Expr> {
  visitDefinition(
    a: [Token, Token, Token, Production[]],
  ): Definition {
    throw new Error("Method not implemented.");
  }

  visitProduction(
    a: [Token, Token, Expr, Token],
  ): Production {
    throw new Error("Method not implemented.");
  }

  visitExpr(a: [Expr, [Token, Expr][]]): Expr {
    if (a[1].length == 0) {
      return a[0];
    } else {
      const rest = a[1].map((c) => c[1]);

      return { tag: "AlternativeExpr", exprs: [a[0], ...rest] };
    }
  }

  visitSequenceExpr(a: Expr[]): Expr {
    return (a.length == 1) ? a[0] : { tag: "SequenceExpr", exprs: a };
  }

  visitFactor1(a: Token): Expr {
    return { tag: "LiteralString", location: a[1], value: a[2] };
  }

  visitFactor2(a: [Token, Expr, Token]): Expr {
    throw new Error("Method not implemented.");
  }

  visitFactor3(a: [Token, Expr, Token]): Expr {
    throw new Error("Method not implemented.");
  }

  visitFactor4(a: [Token, Expr, Token]): Expr {
    throw new Error("Method not implemented.");
  }

  visitFactor5(a: Token): Expr {
    throw new Error("Method not implemented.");
  }
}
