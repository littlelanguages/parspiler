import * as Assert from "../testing/asserts.ts";
import * as Set from "../data/set.ts";

import {
  calculateFirstFollow,
  Definition,
  Identifier,
  Optional,
  Production,
  Sequence,
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
        [new Production("Program", new Identifier("Program"))],
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
          new Production("Program", new Identifier("Fred")),
          new Production("Fred", new Identifier("Program")),
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
      new Sequence([
        new Identifier("a"),
        new Identifier("B"),
        new Identifier("D"),
        new Identifier("h"),
      ]),
    ),
    new Production(
      "B",
      new Sequence([new Identifier("c"), new Identifier("C")]),
    ),
    new Production(
      "C",
      new Optional(
        new Sequence([
          new Identifier("b"),
          new Identifier("C"),
        ]),
      ),
    ),
    new Production(
      "D",
      new Sequence([new Identifier("E"), new Identifier("F")]),
    ),
    new Production("E", new Optional(new Identifier("g"))),
    new Production("F", new Optional(new Identifier("f"))),
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
