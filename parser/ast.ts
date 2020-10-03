import { Location } from "./location.ts";

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
