import { Either, left } from "../data/either.ts";
import * as Assert from "../testing/asserts.ts";

import * as Errors from "./errors.ts";
import { calculateTokenName, translate } from "./dynamic.ts";
import { range } from "./location.ts";
import {
  Definition,
  DefinitionErrors,
  mkAlternative,
  mkDefinition,
  mkIdentifier,
  mkMany,
  mkOptional,
  mkProduction,
  mkSequence,
} from "../cfg/definition.ts";
import * as Scanpiler from "../tool/scanpiler.ts";

function scannerDefinition(): Scanpiler.Definition {
  return Scanpiler.translate(Deno.readTextFileSync("./test/simple.llld"))
    .either((_) => new Scanpiler.Definition(), (d) => d);
}

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
  const translation = await translate(
    "./sample.pd",
    'uses "./test/simple.llld";',
  );

  Assert.assertEquals(
    translation,
    mkDefinition(scannerDefinition(), []),
  );
});

Deno.test("dynamic - an error in the scanner file propogates", async () => {
  await assertTranslateErrors('uses "./test/broken.llld";', [{
    tag: "ScannerDefinitionError",
    location: range(5, 1, 6, 24, 1, 25),
    fileName: "./test/broken.llld",
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
    'uses "./test/simple.llld";\n' + "Program: Identifier;",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkIdentifier("Identifier"),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.llld";\n' + "Program: Identifier Identifier;",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkSequence(
            [mkIdentifier("Identifier"), mkIdentifier("Identifier")],
          ),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.llld";\n' + "Program: {Identifier};",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkMany(mkIdentifier("Identifier")),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.llld";\n' + "Program: [Identifier];",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkOptional(mkIdentifier("Identifier")),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.llld";\n' + "Program: (Identifier);",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkIdentifier("Identifier"),
        ),
      ],
    ),
  );

  await assertTranslation(
    'uses "./test/simple.llld";\n' + "Program: (Identifier | Identifier);",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkAlternative(
            [mkIdentifier("Identifier"), mkIdentifier("Identifier")],
          ),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - reference to an unknown symbol", async () => {
  await assertTranslateErrors('uses "./test/simple.llld";\nProduction: ID;', [
    {
      tag: "UnknownSymbolError",
      location: range(39, 2, 13, 40, 2, 14),
      name: "ID",
    },
  ]);
});

Deno.test("dynamic - reference to non-terminal symbol", async () => {
  await assertTranslation(
    'uses "./test/simple.llld";\n' +
      "Program: Names;\nNames: Identifier {Identifier};",
    mkDefinition(
      scannerDefinition(),
      [
        mkProduction(
          "Program",
          mkIdentifier("Names"),
        ),
        mkProduction(
          "Names",
          mkSequence(
            [
              mkIdentifier("Identifier"),
              mkMany(mkIdentifier("Identifier")),
            ],
          ),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - non-terminal and terminal symbol clash", async () => {
  await assertTranslateErrors(
    'uses "./test/simple.llld";\n' +
      "Program: Identifier;\nIdentifier: Identifier {Identifier};",
    [
      {
        tag: "SymbolDefinedAsTerminalError",
        location: range(48, 3, 1, 57, 3, 10),
        name: "Identifier",
      },
    ],
  );
});

Deno.test("dynamic - duplicate non-terminal name", async () => {
  await assertTranslateErrors(
    'uses "./test/simple.llld";\n' +
      "Program: Identifier;\nProgram: Identifier {Identifier};",
    [
      {
        tag: "SymbolDefinedAsNonTerminalError",
        location: range(48, 3, 1, 54, 3, 7),
        name: "Program",
      },
    ],
  );
});

Deno.test("dynamic - move literal strings into terminals", async () => {
  const scanner = scannerDefinition();

  scanner.addToken("Period", new Scanpiler.LiteralStringRegEx("."), 0);
  scanner.addToken("Hello", new Scanpiler.LiteralStringRegEx("hello"), 1);

  await assertTranslation(
    'uses "./test/simple.llld";\n' + 'Program: "hello" "." ;',
    mkDefinition(
      scanner,
      [
        mkProduction(
          "Program",
          mkSequence([
            mkIdentifier("Hello"),
            mkIdentifier("Period"),
          ]),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - match literal strings with terminals", async () => {
  const scanner = scannerDefinition();

  await assertTranslation(
    'uses "./test/simple.llld";\n' + 'Program: "uses" ";" ;',
    mkDefinition(
      scanner,
      [
        mkProduction(
          "Program",
          mkSequence([
            mkIdentifier("Uses"),
            mkIdentifier("Semicolon"),
          ]),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - create and match literal strings with terminals", async () => {
  const scanner = scannerDefinition();

  scanner.addToken("From", new Scanpiler.LiteralStringRegEx("from"), 0);

  await assertTranslation(
    'uses "./test/simple.llld";\n' + 'Program: "from" ";" "from" ;',
    mkDefinition(
      scanner,
      [
        mkProduction(
          "Program",
          mkSequence([
            mkIdentifier("From"),
            mkIdentifier("Semicolon"),
            mkIdentifier("From"),
          ]),
        ),
      ],
    ),
  );
});

Deno.test("dynamic - resolve token name without clash", async () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(calculateTokenName(scanner, "hello"), "Hello");
  Assert.assertEquals(calculateTokenName(scanner, "HELLO"), "HELLO");
  Assert.assertEquals(
    calculateTokenName(scanner, "[]!@#$%^}"),
    "LBracketRBracketBangAtHashDollarPercentCapRCurly",
  );
  Assert.assertEquals(calculateTokenName(scanner, "0..10"), "H0PeriodPeriod10");
});

Deno.test("dynamic - resolve token name with clash", async () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(calculateTokenName(scanner, "Identifier"), "Identifier1");

  scanner.addToken(
    "Identifier1",
    new Scanpiler.LiteralStringRegEx("Identifier"),
  );

  Assert.assertEquals(calculateTokenName(scanner, "Identifier"), "Identifier2");
});

async function assertTranslation(
  content: string,
  definition: Either<DefinitionErrors, Definition>,
) {
  const x = await translate("./sample.pd", content);

  Assert.assertEquals(x, definition);
}

async function assertTranslateErrors(content: string, errors: Errors.Errors) {
  const x = await translate("./sample.pd", content);

  Assert.assertEquals(x, left(errors));
}
