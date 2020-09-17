import { Scanner } from "../scanpiler.ts";

export class Definition {
  scanner: Scanner.Definition;
  productions: Array<Production>;

  constructor(
    scanner: Scanner.Definition,
    productions: Array<Production> = [],
  ) {
    this.scanner = scanner;
    this.productions = productions;
  }
}

export class Production {
  lhs: string;
  expr: Expr;

  constructor(lhs: string, expr: Expr) {
    this.lhs = lhs;
    this.expr = expr;
  }
}

export interface Expr {}

export class Identifier implements Expr {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class Sequence implements Expr {
  exprs: Array<Expr>;

  constructor(exprs: Array<Expr>) {
    this.exprs = exprs;
  }
}

export class Alternative implements Expr {
  exprs: Array<Expr>;

  constructor(exprs: Array<Expr>) {
    this.exprs = exprs;
  }
}

export class Many implements Expr {
  expr: Expr;

  constructor(expr: Expr) {
    this.expr = expr;
  }
}

export class Optional implements Expr {
  expr: Expr;

  constructor(expr: Expr) {
    this.expr = expr;
  }
}
