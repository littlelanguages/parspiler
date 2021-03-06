import * as Assert from "../testing/asserts.ts";
import * as Set from "../data/set.ts";
import { Either, left, right } from "../data/either.ts";

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
} from "./definition.ts";
import * as Scanpiler from "../tool/scanpiler.ts";
import { assertEquals } from "../testing/asserts.ts";

function scannerDefinition(): Scanpiler.Definition {
  return Scanpiler
    .translate(Deno.readTextFileSync("./test/simple.llld"))
    .either((_) => new Scanpiler.Definition(), (d) => d);
}

Deno.test("definition - calculateFirstFollow - left recursive check", () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [mkProduction("Program", mkIdentifier("Program"))],
    ),
    left([{
      tag: "LeftRecursiveGrammarError",
      name: "Program",
    }]),
  );

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [
        mkProduction("Program", mkIdentifier("Fred")),
        mkProduction("Fred", mkIdentifier("Program")),
      ],
    ),
    left([
      {
        tag: "LeftRecursiveGrammarError",
        name: "Program",
      },
      {
        tag: "LeftRecursiveGrammarError",
        name: "Fred",
      },
    ]),
  );
});

Deno.test("definition - calculateFirstFollow - sample grammar", () => {
  // S: "a" B D "h";
  // B: "c" C;
  // C: ["b" C];
  // D: E F;
  // E: ["g"];
  // F: ["f"];

  const scanner = new Scanpiler.Definition()
    .addToken("a", new Scanpiler.LiteralStringRegEx("a"))
    .addToken("b", new Scanpiler.LiteralStringRegEx("b"))
    .addToken("c", new Scanpiler.LiteralStringRegEx("c"))
    .addToken("f", new Scanpiler.LiteralStringRegEx("f"))
    .addToken("g", new Scanpiler.LiteralStringRegEx("g"))
    .addToken("h", new Scanpiler.LiteralStringRegEx("h"));

  const definition = mkDefinition(scanner, [
    mkProduction(
      "S",
      mkSequence([
        mkIdentifier("a"),
        mkIdentifier("B"),
        mkIdentifier("D"),
        mkIdentifier("h"),
      ]),
    ),
    mkProduction(
      "B",
      mkSequence([mkIdentifier("c"), mkIdentifier("C")]),
    ),
    mkProduction(
      "C",
      mkOptional(
        mkSequence([
          mkIdentifier("b"),
          mkIdentifier("C"),
        ]),
      ),
    ),
    mkProduction(
      "D",
      mkSequence([mkIdentifier("E"), mkIdentifier("F")]),
    ),
    mkProduction("E", mkOptional(mkIdentifier("g"))),
    mkProduction("F", mkOptional(mkIdentifier("f"))),
  ]);

  assertFirstFollowEquals(
    definition,
    [
      new Map(
        [
          ["S", Set.setOf("a")],
          ["B", Set.setOf("c")],
          ["C", Set.setOf(["b", ""])],
          ["D", Set.setOf(["g", "f", ""])],
          ["E", Set.setOf(["g", ""])],
          ["F", Set.setOf(["f", ""])],
        ],
      ),
      new Map([
        ["S", Set.setOf("$")],
        ["B", Set.setOf(["g", "f", "h"])],
        ["C", Set.setOf(["g", "f", "h"])],
        ["D", Set.setOf("h")],
        ["E", Set.setOf(["f", "h"])],
        ["F", Set.setOf("h")],
      ]),
    ],
  );
});

Deno.test("definition - calculateFirstFollow - fix", () => {
  const scanner = new Scanpiler.Definition()
    .addToken("Identifier", new Scanpiler.LiteralStringRegEx("x"));

  mkDefinition(scanner, [
    mkProduction(
      "Id",
      mkIdentifier("Identifier"),
    ),
    mkProduction(
      "OptionalIds",
      mkOptional(
        mkIdentifier("Ids"),
      ),
    ),
    mkProduction(
      "Ids",
      mkMany(mkIdentifier("Identifier")),
    ),
  ]);
});

Deno.test("definition - ll(1) error - alternative selection ambiguity", () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [mkProduction(
        "Program",
        mkAlternative([mkIdentifier("Identifier"), mkIdentifier("Identifier")]),
      )],
    ),
    left([{
      tag: "AmbiguousAlternativesError",
      name: "Program",
      alternatives: [
        [mkIdentifier("Identifier"), Set.setOf("Identifier")],
        [mkIdentifier("Identifier"), Set.setOf("Identifier")],
      ],
    }]),
  );
});

Deno.test("definition - ll(1) error - ambiguous sequence error", () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [mkProduction(
        "Program",
        mkSequence(
          [mkOptional(mkIdentifier("Identifier")), mkIdentifier("Identifier")],
        ),
      )],
    ),
    left([{
      tag: "AmbiguousSequenceError",
      name: "Program",
      hd: [
        mkOptional(mkIdentifier("Identifier")),
        Set.setOf(["Identifier", ""]),
      ],
      tl: [mkSequence([mkIdentifier("Identifier")]), Set.setOf("Identifier")],
    }]),
  );

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [mkProduction(
        "Program",
        mkSequence(
          [mkMany(mkIdentifier("Identifier")), mkIdentifier("Identifier")],
        ),
      )],
    ),
    left([{
      tag: "AmbiguousSequenceError",
      name: "Program",
      hd: [
        mkMany(mkIdentifier("Identifier")),
        Set.setOf(["Identifier", ""]),
      ],
      tl: [mkSequence([mkIdentifier("Identifier")]), Set.setOf("Identifier")],
    }]),
  );
});

const assertFirstFollowEquals = (
  definition: Either<DefinitionErrors, Definition>,
  firstFollows: [Map<string, Set<string>>, Map<string, Set<string>>],
) => {
  assertEquals(
    definition.map((d) => [d.firsts, d.follows]),
    right(firstFollows),
  );
};
