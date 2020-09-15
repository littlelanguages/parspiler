import { left } from "../data/either.ts";

import * as Assert from "../testing/asserts.ts";
import * as Errors from "./errors.ts";

import { translate } from "./dynamic.ts";
import { range } from "./location.ts";

Deno.test("dynamic - scanner file does not exist", () => {
  assertTranslateErrors('uses "not.exists.ll";', [
    {
      tag: "ScannerDefinitionFileDoesNotExistError",
      location: range(5, 1, 6, 19, 1, 20),
      name: "not.exists.ll",
    },
  ]);
});

Deno.test("dynamic - scanner file exists", async () => {
  const translation = await translate('uses "./parser/scanner.ll";');

  Assert.assert(translation.either((_) => false, (_) => true));
});

async function assertTranslateErrors(content: string, errors: Errors.Errors) {
  const x = await translate(content);

  Assert.assertEquals(x, left(errors));
}
