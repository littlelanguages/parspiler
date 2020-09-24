import * as Assert from "../testing/asserts.ts";

import * as AST from "./ast.ts";
import { Either, right } from "../data/either.ts";
import { Errors } from "./errors.ts";
import { mkCoordinate, range } from "./location.ts";
import * as Parser from "./parser.ts";

Deno.test('parser - expr - "while"', () => {
  Assert.assertEquals(
    parseExpr('"while"'),
    mkLiteralString([0, 1, 1], '"while"'),
  );
});

Deno.test("parser - expr - (...)", () => {
  Assert.assertEquals(
    parseExpr("(LiteralString)"),
    {
      tag: "ParenExpr",
      location: range(0, 1, 1, 14, 1, 15),
      expr: mkID([1, 1, 2], "LiteralString"),
    },
  );
});

Deno.test("parser - expr - {...}", () => {
  Assert.assertEquals(
    parseExpr("{LiteralString}"),
    {
      tag: "ManyExpr",
      location: range(0, 1, 1, 14, 1, 15),
      expr: mkID([1, 1, 2], "LiteralString"),
    },
  );
});

Deno.test("parser - expr - [...]", () => {
  Assert.assertEquals(
    parseExpr("[LiteralString]"),
    {
      tag: "OptionalExpr",
      location: range(0, 1, 1, 14, 1, 15),
      expr: mkID([1, 1, 2], "LiteralString"),
    },
  );
});

Deno.test("parser - expr - LiteralString", () => {
  Assert.assertEquals(
    parseExpr("LiteralString"),
    mkID([0, 1, 1], "LiteralString"),
  );
});

Deno.test("parser - expr - a (b) [c] {d}", () => {
  Assert.assertEquals(
    parseExpr("a (b) [c] {d}"),
    {
      tag: "SequenceExpr",
      exprs: [
        mkID([0, 1, 1], "a"),
        {
          tag: "ParenExpr",
          location: range(2, 1, 3, 4, 1, 5),
          expr: mkID([3, 1, 4], "b"),
        },
        {
          tag: "OptionalExpr",
          location: range(6, 1, 7, 8, 1, 9),
          expr: mkID([7, 1, 8], "c"),
        },
        {
          tag: "ManyExpr",
          location: range(10, 1, 11, 12, 1, 13),
          expr: mkID([11, 1, 12], "d"),
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
            mkID([0, 1, 1], "a"),
            mkID([2, 1, 3], "b"),
          ],
        },
        {
          tag: "SequenceExpr",
          exprs: [
            mkID([6, 1, 7], "c"),
            mkID([8, 1, 9], "d"),
          ],
        },
        {
          tag: "SequenceExpr",
          exprs: [
            mkID([12, 1, 13], "e"),
            mkID([14, 1, 15], "f"),
          ],
        },
      ],
    },
  );
});

Deno.test("parser - definition - minimal", () => {
  Assert.assertEquals(
    parseDefinition('uses "some.ll";'),
    right({
      tag: "Definition",
      uses: mkLiteralString([5, 1, 6], '"some.ll"'),
      productions: [],
    }),
  );
});

Deno.test("parser - definition - simple", () => {
  Assert.assertEquals(
    parseDefinition(
      'uses "some.ll";\n' +
        'Definition: \"uses\" LiteralString \";\" {Production};\n' +
        'Production: Identifier ":" Expr ";";\n' +
        "Expr: LiteralString | Identifier;",
    ),
    right({
      tag: "Definition",
      uses: mkLiteralString([5, 1, 6], '"some.ll"'),
      productions: [
        {
          tag: "Production",
          name: mkID([16, 2, 1], "Definition"),
          expr: {
            tag: "SequenceExpr",
            exprs: [
              mkLiteralString([28, 2, 13], '"uses"'),
              mkID([35, 2, 20], "LiteralString"),
              mkLiteralString([49, 2, 34], '";"'),
              {
                tag: "ManyExpr",
                location: range(53, 2, 38, 64, 2, 49),
                expr: mkID([54, 2, 39], "Production"),
              },
            ],
          },
        },
        {
          tag: "Production",
          name: mkID([67, 3, 1], "Production"),
          expr: {
            tag: "SequenceExpr",
            exprs: [
              mkID([79, 3, 13], "Identifier"),
              mkLiteralString([90, 3, 24], '":"'),
              mkID([94, 3, 28], "Expr"),
              mkLiteralString([99, 3, 33], '";"'),
            ],
          },
        },
        {
          tag: "Production",
          name: mkID([104, 4, 1], "Expr"),
          expr: {
            tag: "AlternativeExpr",
            exprs: [
              mkID([110, 4, 7], "LiteralString"),
              mkID([126, 4, 23], "Identifier"),
            ],
          },
        },
      ],
    }),
  );
});

function parseExpr(text: string) {
  return Parser.parseExpr(text, AST.visitor);
}

function parseDefinition(text: string): Either<Errors, AST.Definition> {
  return Parser.parseDefinition(text, AST.visitor);
}

function mkID(point: [number, number, number], id: string) {
  return {
    tag: "ID",
    location: id.length == 1
      ? mkCoordinate(point[0], point[1], point[2])
      : range(
        point[0],
        point[1],
        point[2],
        point[0] + id.length - 1,
        point[1],
        point[2] + id.length - 1,
      ),
    id,
  };
}
function mkLiteralString(point: [number, number, number], value: string) {
  return {
    tag: "LiteralString",
    location: value.length == 1
      ? mkCoordinate(point[0], point[1], point[2])
      : range(
        point[0],
        point[1],
        point[2],
        point[0] + value.length - 1,
        point[1],
        point[2] + value.length - 1,
      ),
    value,
  };
}
