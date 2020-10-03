import * as Array from "../data/array.ts";
import * as Set from "../data/set.ts";
import { Either, left, right } from "../data/either.ts";

import * as Scanpiler from "../tool/scanpiler.ts";

export type Definition = {
  scanner: Scanpiler.Definition;
  productions: Array<Production>;
  terminalNames: Set<string>;
  nonTerminalNames: Set<string>;
  firsts: Map<string, Set<string>>;
  follows: Map<string, Set<string>>;
};

export const mkDefinition = (
  scanner: Scanpiler.Definition,
  productions: Array<Production>,
): Either<DefinitionErrors, Definition> => {
  const terminalNames = Set.setOf(scanner.tokens.map((t) => t[0]));
  const nonTerminalNames = Set.setOf(productions.map((p) => p.lhs));

  const calculationDefinition = {
    scanner,
    productions,
    terminalNames,
    nonTerminalNames,
  };

  return validateNotLeftRecursive(calculationDefinition).map((_) => {
    const firsts = productions.length === 0
      ? new Map()
      : calculateFirst(calculationDefinition);
    const follows = productions.length === 0
      ? new Map()
      : calculateFollow(calculationDefinition, firsts);

    return {
      scanner,
      productions,
      terminalNames,
      nonTerminalNames,
      firsts,
      follows,
    };
  }).andThen(validateLL1);
};

export type Production = {
  lhs: string;
  expr: Expr;
};

export const mkProduction = (lhs: string, expr: Expr): Production => ({
  lhs,
  expr,
});

export type Expr = Identifier | Sequence | Alternative | Many | Optional;

export type Identifier = {
  tag: "Identifier";
  name: string;
};

export type Sequence = {
  tag: "Sequence";
  exprs: Array<Expr>;
};

export type Alternative = {
  tag: "Alternative";
  exprs: Array<Expr>;
};

export type Many = {
  tag: "Many";
  expr: Expr;
};

export type Optional = {
  tag: "Optional";
  expr: Expr;
};

export const mkIdentifier = (name: string): Identifier => ({
  tag: "Identifier",
  name,
});

export const mkSequence = (exprs: Array<Expr>): Sequence => ({
  tag: "Sequence",
  exprs,
});

export const mkAlternative = (exprs: Array<Expr>): Alternative => ({
  tag: "Alternative",
  exprs,
});

export const mkMany = (expr: Expr): Many => ({ tag: "Many", expr });

export const mkOptional = (expr: Expr): Optional => ({ tag: "Optional", expr });

export type DefinitionErrors = Array<DefinitionError>;

export type DefinitionError =
  | LeftRecursiveGrammarError
  | AmbiguousAlternativesError
  | AmbiguousSequenceError;

export type LeftRecursiveGrammarError = {
  tag: "LeftRecursiveGrammarError";
  name: string;
};

export type AmbiguousAlternativesError = {
  tag: "AmbiguousAlternativesError";
  name: string;
  alternatives: Array<[Expr, Set<string>]>;
};

export type AmbiguousSequenceError = {
  tag: "AmbiguousSequenceError";
  name: string;
  hd: [Expr, Set<string>];
  tl: [Expr, Set<string>];
};

type CalculationDefinition = {
  scanner: Scanpiler.Definition;
  productions: Array<Production>;
  terminalNames: Set<string>;
  nonTerminalNames: Set<string>;
};

const validateNotLeftRecursive = (
  definition: { productions: Array<Production>; nonTerminalNames: Set<string> },
): Either<DefinitionErrors, void> => {
  const leftRecursionDependencies = (e: Expr): Set<string> => {
    const isEpsilonable = (e: Expr): boolean => {
      switch (e.tag) {
        case "Identifier":
          return false;
        case "Sequence":
          return Array.and(e.exprs.map(isEpsilonable));
        case "Alternative":
          return Array.or(e.exprs.map(isEpsilonable));
        default:
          return true;
      }
    };

    switch (e.tag) {
      case "Identifier":
        return Set.setOf(e.name);
      case "Sequence":
        let result = Set.emptySet as Set<string>;

        for (const es of e.exprs) {
          result = Set.union(result, leftRecursionDependencies(es));
          if (!isEpsilonable(es)) {
            return result;
          }
        }
        return result;
      case "Alternative":
        return Array.union(e.exprs.map(leftRecursionDependencies));
      case "Many":
        return leftRecursionDependencies(e.expr);
      default:
        return leftRecursionDependencies(e.expr);
    }
  };

  const closure = (m: Map<string, Set<string>>) => {
    while (true) {
      let anythingChanged = false;

      for (const d of m) {
        const currentDependencies: Set<string> = d[1];
        const newDependencies = Set.union(
          currentDependencies,
          Array.union(
            [...currentDependencies].map((d) => m.get(d)!),
          ),
        );

        if (!Set.isEqual(currentDependencies, newDependencies)) {
          anythingChanged = true;
          m.set(d[0], newDependencies);
        }
      }

      if (!anythingChanged) {
        break;
      }
    }
  };

  const leftRecursiveDependencies: Map<string, Set<string>> = new Map(
    definition.productions.map((
      p,
    ) => [
      p.lhs,
      Set.intersection(
        leftRecursionDependencies(p.expr),
        definition.nonTerminalNames,
      ),
    ]),
  );

  closure(leftRecursiveDependencies);

  const errors: DefinitionErrors = [...leftRecursiveDependencies]
    .filter((dep) => dep[1].has(dep[0]))
    .map((dep) => ({ tag: "LeftRecursiveGrammarError", name: dep[0] }));

  return (errors.length === 0) ? right(undefined) : left(errors);
};

const validateLL1 = (
  definition: Definition,
): Either<DefinitionErrors, Definition> => {
  const validateProduction = (production: Production): DefinitionErrors => {
    const validateExpression = (e: Expr): DefinitionErrors => {
      switch (e.tag) {
        case "Identifier":
          return [];
        case "Sequence": {
          const errors = e.exprs.flatMap(validateExpression);

          let seq = e.exprs;

          while (seq.length > 1) {
            let [hd, ...tl] = seq;

            const firstHd = first(definition.firsts, hd);
            if (firstHd.has("")) {
              const exprTl: Expr = { tag: "Sequence", exprs: tl };
              const firstTl = first(
                definition.firsts,
                exprTl,
              );
              if (
                firstHd.has("") &&
                Set.intersection(Set.minus(firstHd, Set.setOf("")), firstTl)
                    .size > 0
              ) {
                errors.push({
                  tag: "AmbiguousSequenceError",
                  name: production.lhs,
                  hd: [hd, firstHd],
                  tl: [exprTl, firstTl],
                });
              }
            }

            seq = tl;
          }

          return errors;
        }
        case "Alternative": {
          const alts: Array<[Expr, Set<string>]> = e.exprs.map((
            es,
          ) => [es, first(definition.firsts, es)]);

          let error = false;
          for (let i = 0; i < alts.length && !error; i += 1) {
            for (let j = i + 1; j < alts.length && !error; j += 1) {
              error = Set.intersection(alts[i][1], alts[j][1]).size > 0;
            }
          }

          return error
            ? [{
              tag: "AmbiguousAlternativesError",
              name: production.lhs,
              alternatives: alts,
            }]
            : [];
        }
        case "Many":
          return [];
        default:
          return [];
      }
    };

    return validateExpression(production.expr);
  };

  const errors = definition.productions.flatMap(validateProduction);

  return errors.length === 0 ? right(definition) : left(errors);
};

const calculateEmptyNonTerminalNames = (
  definition: CalculationDefinition,
): Set<string> => {
  const calculateEmptyNonTerminals = (): Map<string, boolean> => {
    const emptyNonTerminals: Map<string, boolean> = new Map();

    const isExprNullable = (e: Expr): boolean | undefined => {
      switch (e.tag) {
        case "Identifier":
          return (definition.terminalNames.has(e.name))
            ? false
            : emptyNonTerminals.get(e.name);
        case "Sequence":
          const isSequenceNullable = e.exprs.map((es) => isExprNullable(es));

          return (isSequenceNullable.some((x) => x === undefined))
            ? undefined
            : isSequenceNullable.every((x) => x === true);
        case "Alternative":
          const isAlternativesNullable = e.exprs.map((es) =>
            isExprNullable(es)
          );

          return (isAlternativesNullable.some((x) => x === true))
            ? true
            : (isAlternativesNullable.some((x) => x === undefined))
            ? undefined
            : false;
        default:
          return true;
      }
    };

    while (true) {
      const sizeOfEmptyNonTerminals = emptyNonTerminals.size;

      for (const p of definition.productions) {
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
  };

  return Set.setOf(
    [...calculateEmptyNonTerminals()].filter((x) => x[1]).map((x) => x[0]),
  );
};

const calculateFirst = (
  definition: CalculationDefinition,
): Map<string, Set<string>> => {
  const emptyNonTerminalNames = calculateEmptyNonTerminalNames(definition);
  const terminalNames = definition.terminalNames;
  const nonTerminalNames = definition.nonTerminalNames;

  const isExprNullable = (e: Expr): boolean => {
    switch (e.tag) {
      case "Identifier":
        return emptyNonTerminalNames.has(e.name);
      case "Sequence":
        return Array.and(e.exprs.map((es) => isExprNullable(es)));
      case "Alternative":
        return e.exprs.map((es) => isExprNullable(es)).some((x) => x);
      default:
        return true;
    }
  };

  const calculateInitialFirst = (e: Expr): Set<string> => {
    switch (e.tag) {
      case "Identifier":
        return Set.setOf(e.name);
      case "Sequence":
        let result = Set.emptySet as Set<string>;
        for (const es of e.exprs) {
          result = Set.union(calculateInitialFirst(es), result);
          if (!isExprNullable(es)) {
            break;
          }
        }
        return result;
      case "Alternative":
        return Array.union(e.exprs.map((es) => calculateInitialFirst(es)));
      case "Many":
        return calculateInitialFirst(e.expr);
      default:
        return calculateInitialFirst((e as Optional).expr);
    }
  };

  const firsts: Map<string, Set<string>> = new Map(
    definition.productions.map((
      p,
    ) => [p.lhs, calculateInitialFirst(p.expr)]),
  );

  while (true) {
    let changed = false;
    for (const p of firsts) {
      const nonTerminals = Set.filter(
        (e) => nonTerminalNames.has(e),
        p[1],
      );
      if (!Set.isEmpty(nonTerminals)) {
        const terminals = Set.filter((e) => terminalNames.has(e), p[1]);

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

  emptyNonTerminalNames.forEach((nt) =>
    firsts.set(nt, Set.union(firsts.get(nt)!, epsilonSet))
  );

  return firsts;
};

const calculateFollow = (
  definition: CalculationDefinition,
  firsts: Map<string, Set<string>>,
): Map<string, Set<string>> => {
  const calculateInitialFollow = (
    firsts: Map<string, Set<string>>,
    follows: Map<string, Set<string>>,
    e: Expr,
    nextFirst: Set<string>,
  ) => {
    switch (e.tag) {
      case "Identifier":
        if (definition.nonTerminalNames.has(e.name)) {
          const follow = (nextFirst.has(""))
            ? Set.minus(nextFirst, epsilonSet)
            : nextFirst;
          const currentFollows = follows.get(e.name);
          const nextFollows = (currentFollows === undefined)
            ? follow
            : Set.union(currentFollows, follow);

          follows.set(e.name, nextFollows);
        }
        break;
      case "Sequence":
        let exprs = e.exprs;

        while (exprs.length > 0) {
          const [hdExpr, ...tlExprs] = exprs;
          const tlFirst = first(firsts, { tag: "Sequence", exprs: tlExprs });

          if (tlFirst.has("")) {
            calculateInitialFollow(
              firsts,
              follows,
              hdExpr,
              Set.union(nextFirst, Set.minus(tlFirst, epsilonSet)),
            );
          } else {
            calculateInitialFollow(firsts, follows, hdExpr, tlFirst);
          }

          exprs = tlExprs;
        }
        break;
      case "Alternative":
        e.exprs.forEach((es) =>
          calculateInitialFollow(firsts, follows, es, nextFirst)
        );
        break;
      case "Many":
        calculateInitialFollow(firsts, follows, e.expr, nextFirst);
        break;
      default:
        calculateInitialFollow(firsts, follows, e.expr, nextFirst);
    }
  };

  const follows: Map<string, Set<string>> = new Map(
    [[definition.productions[0].lhs, Set.setOf("$")]],
  );

  definition.productions.forEach((p) =>
    calculateInitialFollow(
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
        (e) => definition.nonTerminalNames.has(e),
        p[1],
      );
      if (!Set.isEmpty(nonTerminals)) {
        const terminals = Set.filter(
          (e) => definition.terminalNames.has(e),
          p[1],
        );

        const newFollows = Set.minus(
          Set.union(
            terminals,
            Array.union(
              [...nonTerminals].map((nt) =>
                follows.get(nt) ?? Set.emptySet as Set<string>
              ),
            ),
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
};

export function first(firsts: Map<string, Set<string>>, e: Expr): Set<string> {
  switch (e.tag) {
    case "Identifier":
      return firsts.get(e.name) ?? Set.setOf(e.name);
    case "Sequence":
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
    case "Alternative":
      return Array.union(e.exprs.map((es) => first(firsts, es)));
    case "Many":
      return Set.union(first(firsts, e.expr), epsilonSet);
    default:
      return Set.union(first(firsts, ((e as Optional).expr)), epsilonSet);
  }
}

const epsilonSet = Set.setOf("");
