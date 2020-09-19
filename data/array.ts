import * as Set from "./set.ts";

export function and(a: Array<boolean>): boolean {
  return a.reduce((a, b) => a && b, true);
}

export function or(a: Array<boolean>): boolean {
  return a.reduce((a, b) => a || b, false);
}

export function union<T>(ss: Array<Set<T>>): Set<T> {
  return ss.reduce(
    Set.union,
    Set.emptySet as Set<T>,
  );
}
