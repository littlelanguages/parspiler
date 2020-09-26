import * as Set from "./set.ts";

export const and = (a: Array<boolean>): boolean =>
  a.reduce((a, b) => a && b, true);

export const or = (a: Array<boolean>): boolean =>
  a.reduce((a, b) => a || b, false);

export const union = <T>(ss: Array<Set<T>>): Set<T> =>
  ss.reduce(Set.union, Set.emptySet as Set<T>);
