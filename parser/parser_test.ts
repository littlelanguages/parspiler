import * as Assert from "../testing/asserts.ts";

import * as AST from "./ast.ts";
import { mkCoordinate, range } from "./location.ts";
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

Deno.test("parser - expr - {...}", () => {
  Assert.assertEquals(
    parseExpr("{LiteralString}"),
    {
      tag: "ManyExpr",
      location: range(0, 1, 1, 14, 1, 15),
      expr: {
        tag: "ID",
        location: range(1, 1, 2, 13, 1, 14),
        id: "LiteralString",
      },
    },
  );
});

Deno.test("parser - expr - [...]", () => {
  Assert.assertEquals(
    parseExpr("[LiteralString]"),
    {
      tag: "OptionalExpr",
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

Deno.test("parser - expr - a (b) [c] {d}", () => {
  Assert.assertEquals(
    parseExpr("a (b) [c] {d}"),
    {
      tag: "SequenceExpr",
      exprs: [
        {
          tag: "ID",
          location: mkCoordinate(0, 1, 1),
          id: "a",
        },
        {
          tag: "ParenExpr",
          location: range(2, 1, 3, 4, 1, 5),
          expr: {
            tag: "ID",
            location: mkCoordinate(3, 1, 4),
            id: "b",
          },
        },
        {
          tag: "OptionalExpr",
          location: range(6, 1, 7, 8, 1, 9),
          expr: {
            tag: "ID",
            location: mkCoordinate(7, 1, 8),
            id: "c",
          },
        },
        {
          tag: "ManyExpr",
          location: range(10, 1, 11, 12, 1, 13),
          expr: {
            tag: "ID",
            location: mkCoordinate(11, 1, 12),
            id: "d",
          },
        },
      ],
    },
  );
});

Deno.test("parser - expr - a b | c d | e f", () => {
  Assert.assertEquals(
    parseExpr("a b | c d | e f"),
    {
      tag: "AlternativeExpr",
      exprs: [
        {
          tag: "SequenceExpr",
          exprs: [
            { tag: "ID", location: mkCoordinate(0, 1, 1), id: "a" },
            { tag: "ID", location: mkCoordinate(2, 1, 3), id: "b" },
          ],
        },
        {
          tag: "SequenceExpr",
          exprs: [
            { tag: "ID", location: mkCoordinate(6, 1, 7), id: "c" },
            { tag: "ID", location: mkCoordinate(8, 1, 9), id: "d" },
          ],
        },
        {
          tag: "SequenceExpr",
          exprs: [
            { tag: "ID", location: mkCoordinate(12, 1, 13), id: "e" },
            { tag: "ID", location: mkCoordinate(14, 1, 15), id: "f" },
          ],
        },
      ],
    },
  );
});

Deno.test("parser - definition - minimal", () => {
  Assert.assertEquals(
    parseDefinition('uses "some.ll";'),
    {
      tag: "Definition",
      uses: {
        tag: "LiteralString",
        location: range(5, 1, 6, 13, 1, 14),
        value: '"some.ll"',
      },
      productions: [],
    },
  );
});

function parseExpr(text: string) {
  return Parser.parseExpr(text, new AST.Visitor());
}

function parseDefinition(text: string) {
  return Parser.parseDefinition(text, new AST.Visitor());
}
