import * as Assert from "../testing/asserts.ts";
import * as Set from "../data/set.ts";
import { Either, left, right } from "../data/either.ts";

import {
  Definition,
  DefinitionErrors,
  mkDefinition,
  mkIdentifier,
  mkMany,
  mkOptional,
  mkProduction,
  mkSequence,
} from "./definition.ts";
import { Dynamic, Definition as LADefinition } from "../scanpiler.ts";
import { assertEquals } from "../testing/asserts.ts";

function scannerDefinition(): LADefinition.Definition {
  return Dynamic
    .translate(Deno.readTextFileSync("./test/simple.ll"))
    .either((_) => new LADefinition.Definition(), (d) => d);
}

Deno.test("definition - calculateFirstFollow - left recursive check", () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(
    mkDefinition(
      scanner,
      [mkProduction("Program", { tag: "Identifier", name: "Program" })],
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

  const scanner = new LADefinition.Definition()
    .addToken("a", new LADefinition.LiteralStringRegEx("a"))
    .addToken("b", new LADefinition.LiteralStringRegEx("b"))
    .addToken("c", new LADefinition.LiteralStringRegEx("c"))
    .addToken("f", new LADefinition.LiteralStringRegEx("f"))
    .addToken("g", new LADefinition.LiteralStringRegEx("g"))
    .addToken("h", new LADefinition.LiteralStringRegEx("h"));

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

Deno.test({
  name: "definition - calculateFirstFollow - fix",
  // only: true,
  fn: () => {
    const scanner = new LADefinition.Definition()
      .addToken("Identifier", new LADefinition.LiteralStringRegEx("x"));

    const definition = mkDefinition(scanner, [
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
  },
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
