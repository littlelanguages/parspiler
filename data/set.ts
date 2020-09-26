export * from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-set/0.0.1/mod.ts";

import * as Set from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-set/0.0.1/mod.ts";

export const filter = <S>(p: (e: S) => boolean, s: Set<S>) =>
  Set.setOf([...s].filter(p));
