import { Either, right, left } from "../data/either.ts";

import { Errors } from "./errors.ts";

export function translate(input: string): Promise<Either<Errors, void>> {

  return Promise.resolve(left([]));
}
