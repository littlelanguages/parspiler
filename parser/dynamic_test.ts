import { left, right } from "../data/either.ts";

import * as Assert from "../testing/asserts.ts";
import * as Errors from "./errors.ts";

import { translate } from "./dynamic.ts";
import { range } from "./location.ts";
import {
  Alternative,
  Definition,
  Identifier,
  Many,
  Optional,
  Production,
  Sequence,
} from "../cfg/definition.ts";
import { Dynamic, Definition as LADefinition } from "../scanpiler.ts";

const scannerDefinition = Dynamic
  .translate(Deno.readTextFileSync("./test/simple.ll"))
  .either((_) => new LADefinition.Definition(), (d) => d);

Deno.test("dynamic - scanner file does not exist", async () => {
  await assertTranslateErrors('uses "./test/not.exists.ll";', [
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

Deno.test("dynamic - reference to terminal symbol", async () => {
  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: Identifier;",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Identifier("Identifier"),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: Identifier Identifier;",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Sequence(
            [new Identifier("Identifier"), new Identifier("Identifier")],
          ),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: {Identifier};",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Many(new Identifier("Identifier")),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: [Identifier];",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Optional(new Identifier("Identifier")),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: (Identifier);",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Identifier("Identifier"),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.ll";\n' + "Program: (Identifier | Identifier);",
    new Definition(
      scannerDefinition,
      [
        new Production(
          "Program",
          new Alternative(
            [new Identifier("Identifier"), new Identifier("Identifier")],
          ),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - reference to an unknown symbol", async () => {
  await assertTranslateErrors('uses "./test/simple.ll";\nProduction: ID;', [
    {
      tag: "UnknownSymbolError",
      location: range(37, 2, 13, 38, 2, 14),
      name: "ID",
    },
  ]);
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

  Assert.assertEquals(x, right(definition));
}

async function assertTranslateErrors(content: string, errors: Errors.Errors) {
  const x = await translate(content);

  Assert.assertEquals(x, left(errors));
}
