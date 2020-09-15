import { isRight, left } from "../data/either.ts";

import * as Assert from "../testing/asserts.ts";
import * as Errors from "./errors.ts";

import { translate } from "./dynamic.ts";
import { range } from "./location.ts";
import { Definition } from "../cfg/definition.ts";
import { Dynamic, Definition as LADefinition } from "../scanpiler.ts";

const scannerDefinition = Dynamic
  .translate(Deno.readTextFileSync("./parser/scanner.ll"))
  .either((_) => new LADefinition.Definition(), (d) => d);

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

  Assert.assert(isRight(translation));
});

Deno.test(
  {
    name: "dynamic - an error in the scanner file propogates",
    ignore: true,
    fn() {
    },
  },
);

Deno.test({
  name: "dynamic - reference to terminal symbol",
  ignore: true,
  fn() {
    assertTranslation(
      'uses "./parser/scanner.ll";\n' + "Program: {Identifier};",
      new Definition(scannerDefinition),
    );
  },
});

Deno.test({
  name: "dynamic - reference to non-terminal symbol",
  ignore: true,
  fn() {
  },
});

Deno.test({
  name: "dynamic - non-terminal and terminal symbol clash",
  ignore: true,
  fn() {
  },
});

async function assertTranslation(content: string, definition: Definition) {
  const x = await translate(content);

  Assert.assert(isRight(x));
}

async function assertTranslateErrors(content: string, errors: Errors.Errors) {
  const x = await translate(content);

  Assert.assertEquals(x, left(errors));
}
