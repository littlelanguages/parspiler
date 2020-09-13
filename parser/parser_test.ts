import * as Assert from "../testing/asserts.ts";

import * as AST from "./ast.ts";
import { range } from "./location.ts";
import * as Parser from "./parser.ts";

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

Deno.test("parser - expr - (...)", () => {
  Assert.assertEquals(
    parseExpr("(LiteralString)"),
    {
      tag: "ParenExpr",
      location: range(0, 1, 1, 14, 1, 15),
      expr: {
        tag: "ID",
        location: range(1, 1, 2, 13, 1, 14),
        id: "LiteralString",
      },
    },
  );
});

Deno.test("parser - expr - LiteralString", () => {
  Assert.assertEquals(
    parseExpr("LiteralString"),
    {
      tag: "ID",
      location: range(0, 1, 1, 12, 1, 13),
      id: "LiteralString",
    },
  );
});

function parseExpr(text: string) {
  return Parser.parseExpr(text, new AST.Visitor());
}
