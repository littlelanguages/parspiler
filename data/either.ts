import { Either } from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-either/0.0.1/mod.ts";

export * from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-either/0.0.1/mod.ts";

export function isLeft<A, B>(e: Either<A, B>): boolean {
  return e.either((_) => true, (_) => false);
}

export function isRight<A, B>(e: Either<A, B>): boolean {
  return e.either((_) => false, (_) => true);
}
