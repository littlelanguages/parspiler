import { isRight, left, right } from "../data/either.ts";

import * as Assert from "../testing/asserts.ts";
import * as Errors from "./errors.ts";

import { translate } from "./dynamic.ts";
import { range } from "./location.ts";
import { Definition } from "../cfg/definition.ts";
import { Dynamic, Definition as LADefinition } from "../scanpiler.ts";

const scannerDefinition = Dynamic
  .translate(Deno.readTextFileSync("./test/simple.ll"))
  .either((_) => new LADefinition.Definition(), (d) => d);

Deno.test("dynamic - scanner file does not exist", () => {
  assertTranslateErrors('uses "./test/not.exists.ll";', [
    {
      tag: "ScannerDefinitionFileDoesNotExistError",
      location: range(5, 1, 6, 26, 1, 27),
      name: "./test/not.exists.ll",
    },
  ]);
});

Deno.test("dynamic - scanner file exists", async () => {
  const translation = await translate('uses "./test/simple.ll";');

  Assert.assertEquals(translation, right(new Definition(scannerDefinition)));
});

Deno.test("dynamic - an error in the scanner file propogates", async () => {
  assertTranslateErrors('uses "./test/broken.ll";', [{
    tag: "ScannerDefinitionError",
    location: range(5, 1, 6, 22, 1, 23),
    fileName: "./test/broken.ll",
    errors: [
      {
        tag: "UnknownFragmentIdentifierError",
        location: range(24, 2, 18, 26, 2, 20),
        name: "bob",
      },
    ],
  }]);
});

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
