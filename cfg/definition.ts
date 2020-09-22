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
): [Map<string, Set<string>>, Map<string, Set<string>>] | FirstFollowErrors {
  return new FirstFollowCalculation(definition).process();
}

class FirstFollowCalculation {
  private definition: Definition;
  private errors: FirstFollowErrors = [];
  private terminalNames: Set<string>;
  private nonTerminalNames: Set<string>;
  private emptyNonTerminals: Set<string> = Set.emptySet as Set<string>;

  constructor(definition: Definition) {
    this.definition = definition;

    this.terminalNames = definition.terminalNames();
    this.nonTerminalNames = definition.nonTerminalNames();
  }

  process():
    | [Map<string, Set<string>>, Map<string, Set<string>>]
    | FirstFollowErrors {
    this.validateNotLeftRecursive();

    this.emptyNonTerminals = Set.setOf(
      [...this.calculateEmptyNonTerminals()].filter((x) => x[1]).map((x) =>
        x[0]
      ),
    );
    const firsts = this.calculateFirst();
    const follows = this.calculateFollow(firsts);

    if (this.errors.length === 0) {
      return [firsts, follows];
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

  private calculateEmptyNonTerminals(): Map<string, boolean> {
    const emptyNonTerminals: Map<string, boolean> = new Map();

    const isExprNullable = (e: Expr): boolean | undefined => {
      if (e instanceof Identifier) {
        return (this.terminalNames.has(e.name))
          ? false
          : emptyNonTerminals.get(e.name);
      } else if (e instanceof Sequence) {
        const isSequenceNullable = e.exprs.map((es) => isExprNullable(es));

        return (isSequenceNullable.some((x) => x === undefined))
          ? undefined
          : isSequenceNullable.every((x) => x === true);
      } else if (e instanceof Alternative) {
        const isAlternativesNullable = e.exprs.map((es) => isExprNullable(es));

        return (isAlternativesNullable.some((x) => x === true))
          ? true
          : (isAlternativesNullable.some((x) => x === undefined))
          ? undefined
          : false;
      } else {
        return true;
      }
    };

    while (true) {
      const sizeOfEmptyNonTerminals = emptyNonTerminals.size;

      for (const p of this.definition.productions) {
        if (!emptyNonTerminals.has(p.lhs)) {
          const v = isExprNullable(p.expr);

          if (v !== undefined) {
            emptyNonTerminals.set(p.lhs, v);
          }
        }
      }

      if (sizeOfEmptyNonTerminals === emptyNonTerminals.size) {
        break;
      }
    }

    return emptyNonTerminals;
  }

  private isExprNullable(e: Expr): boolean {
    if (e instanceof Identifier) {
      return this.emptyNonTerminals.has(e.name);
    } else if (e instanceof Sequence) {
      return Array.and(e.exprs.map((es) => this.isExprNullable(es)));
    } else if (e instanceof Alternative) {
      return e.exprs.map((es) => this.isExprNullable(es)).some((x) => x);
    } else {
      return true;
    }
  }

  private calculateInitialFirst(e: Expr): Set<string> {
    if (e instanceof Identifier) {
      return Set.setOf(e.name);
    } else if (e instanceof Sequence) {
      let result = Set.emptySet as Set<string>;
      for (const es of e.exprs) {
        result = Set.union(this.calculateInitialFirst(es), result);
        if (!this.isExprNullable(es)) {
          break;
        }
      }
      return result;
    } else if (e instanceof Alternative) {
      return Array.union(e.exprs.map((es) => this.calculateInitialFirst(es)));
    } else if (e instanceof Many) {
      return this.calculateInitialFirst(e.expr);
    } else {
      return this.calculateInitialFirst((e as Optional).expr);
    }
  }

  private calculateFirst(): Map<string, Set<string>> {
    let firsts: Map<string, Set<string>> = new Map(
      this.definition.productions.map((
        p,
      ) => [p.lhs, this.calculateInitialFirst(p.expr)]),
    );

    while (true) {
      let changed = false;
      for (const p of firsts) {
        const nonTerminals = Set.filter(
          (e) => this.nonTerminalNames.has(e),
          p[1],
        );
        if (!Set.isEmpty(nonTerminals)) {
          const terminals = Set.filter((e) => this.terminalNames.has(e), p[1]);

          const newFirsts = Set.union(
            terminals,
            Array.union([...nonTerminals].map((nt) => firsts.get(nt)!)),
          );

          if (!Set.isEqual(newFirsts, p[1])) {
            changed = true;
            firsts.set(p[0], newFirsts);
          }
        }
      }

      if (!changed) {
        break;
      }
    }

    this.emptyNonTerminals.forEach((nt) =>
      firsts.set(nt, Set.union(firsts.get(nt)!, epsilonSet))
    );

    return firsts;
  }

  private calculateInitialFollow(
    firsts: Map<string, Set<string>>,
    follows: Map<string, Set<string>>,
    e: Expr,
    nextFirst: Set<string>,
  ) {
    if (e instanceof Identifier) {
      if (this.nonTerminalNames.has(e.name)) {
        const follow = (nextFirst.has(""))
          ? Set.minus(nextFirst, epsilonSet)
          : nextFirst;
        const currentFollows = follows.get(e.name);
        const nextFollows = (currentFollows === undefined)
          ? follow
          : Set.union(currentFollows, follow);

        follows.set(e.name, nextFollows);
      }
    } else if (e instanceof Sequence) {
      let exprs = e.exprs;

      while (exprs.length > 0) {
        const [hdExpr, ...tlExprs] = exprs;
        const tlFirst = first(firsts, new Sequence(tlExprs));

        if (tlFirst.has("")) {
          this.calculateInitialFollow(
            firsts,
            follows,
            hdExpr,
            Set.union(nextFirst, Set.minus(tlFirst, epsilonSet)),
          );
        } else {
          this.calculateInitialFollow(firsts, follows, hdExpr, tlFirst);
        }

        exprs = tlExprs;
      }
    } else if (e instanceof Alternative) {
      e.exprs.forEach((es) =>
        this.calculateInitialFollow(firsts, follows, es, nextFirst)
      );
    } else if (e instanceof Many) {
      this.calculateInitialFollow(firsts, follows, e.expr, nextFirst);
    } else {
      this.calculateInitialFollow(
        firsts,
        follows,
        (e as Optional).expr,
        nextFirst,
      );
    }
  }

  private calculateFollow(
    firsts: Map<string, Set<string>>,
  ): Map<string, Set<string>> {
    let follows: Map<string, Set<string>> = new Map(
      [[this.definition.productions[0].lhs, Set.setOf("$")]],
    );

    this.definition.productions.forEach((p) =>
      this.calculateInitialFollow(
        firsts,
        follows,
        p.expr,
        Set.setOf(p.lhs),
      )
    );

    while (true) {
      let changed = false;
      for (const p of follows) {
        const nonTerminals = Set.filter(
          (e) => this.nonTerminalNames.has(e),
          p[1],
        );
        if (!Set.isEmpty(nonTerminals)) {
          const terminals = Set.filter((e) => this.terminalNames.has(e), p[1]);

          const newFollows = Set.minus(
            Set.union(
              terminals,
              Array.union([...nonTerminals].map((nt) => follows.get(nt)!)),
            ),
            Set.setOf(p[0]),
          );

          if (!Set.isEqual(newFollows, p[1])) {
            changed = true;
            follows.set(p[0], newFollows);
          }
        }
      }

      if (!changed) {
        break;
      }
    }

    return follows;
  }
}

export function first(firsts: Map<string, Set<string>>, e: Expr): Set<string> {
  if (e instanceof Identifier) {
    const f = firsts.get(e.name);
    return (f === undefined) ? Set.setOf(e.name) : f;
  } else if (e instanceof Sequence) {
    let result = Set.emptySet as Set<string>;
    for (const es of e.exprs) {
      const esFirst = first(firsts, es);

      if (esFirst.has("")) {
        result = Set.union(Set.minus(esFirst, epsilonSet), result);
      } else {
        return Set.union(esFirst, result);
      }
    }
    return Set.union(result, epsilonSet);
  } else if (e instanceof Alternative) {
    return Array.union(e.exprs.map((es) => first(firsts, es)));
  } else if (e instanceof Many) {
    return Set.union(first(firsts, e.expr), epsilonSet);
  } else {
    return Set.union(first(firsts, ((e as Optional).expr)), epsilonSet);
  }
}

const epsilonSet = Set.setOf("");
