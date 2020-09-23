import * as Assert from "../testing/asserts.ts";
import * as Set from "../data/set.ts";

import {
  calculateFirstFollow,
  Definition,
  mkIdentifier,
  mkOptional,
  mkSequence,
  Production,
} from "./definition.ts";
import { Dynamic, Definition as LADefinition } from "../scanpiler.ts";

function scannerDefinition(): LADefinition.Definition {
  return Dynamic
    .translate(Deno.readTextFileSync("./test/simple.ll"))
    .either((_) => new LADefinition.Definition(), (d) => d);
}

Deno.test("definition - calculateFirstFollow - left recursive check", () => {
  const scanner = scannerDefinition();

  Assert.assertEquals(
    calculateFirstFollow(
      new Definition(
        scanner,
        [new Production("Program", { tag: "Identifier", name: "Program" })],
      ),
    ),
    [{
      tag: "LeftRecursiveGrammarError",
      name: "Program",
    }],
  );

  Assert.assertEquals(
    calculateFirstFollow(
      new Definition(
        scanner,
        [
          new Production("Program", mkIdentifier("Fred")),
          new Production("Fred", mkIdentifier("Program")),
        ],
      ),
    ),
    [
      {
        tag: "LeftRecursiveGrammarError",
        name: "Program",
      },
      {
        tag: "LeftRecursiveGrammarError",
        name: "Fred",
      },
    ],
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

  const definition = new Definition(scanner, [
    new Production(
      "S",
      mkSequence([
        mkIdentifier("a"),
        mkIdentifier("B"),
        mkIdentifier("D"),
        mkIdentifier("h"),
      ]),
    ),
    new Production(
      "B",
      mkSequence([mkIdentifier("c"), mkIdentifier("C")]),
    ),
    new Production(
      "C",
      mkOptional(
        mkSequence([
          mkIdentifier("b"),
          mkIdentifier("C"),
        ]),
      ),
    ),
    new Production(
      "D",
      mkSequence([mkIdentifier("E"), mkIdentifier("F")]),
    ),
    new Production("E", mkOptional(mkIdentifier("g"))),
    new Production("F", mkOptional(mkIdentifier("f"))),
  ]);

  Assert.assertEquals(
    calculateFirstFollow(definition),
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
