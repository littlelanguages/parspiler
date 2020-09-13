import * as Assert from "../testing/asserts.ts";

import * as AST from "./ast.ts";
import * as Parser from "./parser.ts";
import { range } from "./location.ts";
import { assertStrictEquals } from "../testing/asserts.ts";

Deno.test('parser - expr - "while"', () => {
  Assert.assertEquals(
    parseExpr('"while"'),
    {
      tag: "LiteralString",
      location: range(0, 1, 1, 6, 1, 7),
      value: '"while"',
    },
  );
});

function parseExpr(text: string) {
  return Parser.parseExpr(text, new AST.Visitor());
}
