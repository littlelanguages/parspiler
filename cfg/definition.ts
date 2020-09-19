import * as Array from "../data/array.ts";
import * as Set from "../data/set.ts";

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

  terminalNames(): Set<string> {
    return Set.setOf(this.scanner.tokens.map((t) => t[0]));
  }

  nonTerminalNames(): Set<string> {
    return Set.setOf(this.productions.map((p) => p.lhs));
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

export interface Expr {
  leftRecursionDependencies(): Set<string>;
  isEpsilonable(): boolean;
}

export class Identifier implements Expr {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  leftRecursionDependencies(): Set<string> {
    return Set.setOf(this.name);
  }

  isEpsilonable(): boolean {
    return false;
  }
}

export class Sequence implements Expr {
  exprs: Array<Expr>;

  constructor(exprs: Array<Expr>) {
    this.exprs = exprs;
  }

  leftRecursionDependencies(): Set<string> {
    let result = Set.emptySet as Set<string>;

    for (const e of this.exprs) {
      result = Set.union(result, e.leftRecursionDependencies());
      if (!e.isEpsilonable()) {
        return result;
      }
    }
    return result;
  }

  isEpsilonable(): boolean {
    return Array.and(this.exprs.map((e) => e.isEpsilonable()));
  }
}

export class Alternative implements Expr {
  exprs: Array<Expr>;

  constructor(exprs: Array<Expr>) {
    this.exprs = exprs;
  }

  leftRecursionDependencies(): Set<string> {
    return Array.union(this.exprs.map((e) => e.leftRecursionDependencies()));
  }

  isEpsilonable(): boolean {
    return Array.or(this.exprs.map((e) => e.isEpsilonable()));
  }
}

export class Many implements Expr {
  expr: Expr;

  constructor(expr: Expr) {
    this.expr = expr;
  }

  leftRecursionDependencies(): Set<string> {
    return this.expr.leftRecursionDependencies();
  }

  isEpsilonable(): boolean {
    return true;
  }
}

export class Optional implements Expr {
  expr: Expr;

  constructor(expr: Expr) {
    this.expr = expr;
  }

  leftRecursionDependencies(): Set<string> {
    return this.expr.leftRecursionDependencies();
  }

  isEpsilonable(): boolean {
    return true;
  }
}

type FirstFollowErrors = Array<FirstFollowError>;

type FirstFollowError = LeftRecursiveGrammarError;

type LeftRecursiveGrammarError = {
  tag: "LeftRecursiveGrammarError";
  name: string;
};

export function calculateFirstFollow(
  definition: Definition,
): [Set<string>, Set<string>] | FirstFollowErrors {
  return new FirstFollowCalculation(definition).process();
}

class FirstFollowCalculation {
  private definition: Definition;
  private errors: FirstFollowErrors = [];
  private terminalNames: Set<string>;
  private nonTerminalNames: Set<string>;

  constructor(definition: Definition) {
    this.definition = definition;

    this.terminalNames = definition.terminalNames();
    this.nonTerminalNames = definition.nonTerminalNames();
  }

  process(): [Set<string>, Set<string>] | FirstFollowErrors {
    this.validateNotLeftRecursive();

    if (this.errors.length == 0) {
      return [Set.emptySet as Set<string>, Set.emptySet as Set<string>];
    } else {
      return this.errors;
    }
  }

  private validateNotLeftRecursive() {
    const leftRecursiveDependencies: Map<string, Set<string>> = new Map(this
      .definition.productions.map((
        p,
      ) => [
        p.lhs,
        Set.intersection(
          p.expr.leftRecursionDependencies(),
          this.nonTerminalNames,
        ),
      ]));

    while (true) {
      let anythingChanged = false;

      for (const d of leftRecursiveDependencies) {
        const currentDependencies: Set<string> = d[1];
        const newDependencies = Set.union(
          currentDependencies,
          Array.union(
            [...currentDependencies].map((d) =>
              leftRecursiveDependencies.get(d)!
            ),
          ),
        );

        if (!Set.isEqual(currentDependencies, newDependencies)) {
          anythingChanged = true;
          leftRecursiveDependencies.set(d[0], newDependencies);
        }
      }

      if (!anythingChanged) {
        break;
      }
    }

    for (const dep of leftRecursiveDependencies) {
      if (dep[1].has(dep[0])) {
        this.errors.push({ tag: "LeftRecursiveGrammarError", name: dep[0] });
      }
    }
  }
}
