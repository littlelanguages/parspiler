import * as PP from "https://raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/0.3.1/mod.ts";
import { Errors as ScanpilerErrors } from "../scanpiler.ts";
import { TToken } from "./scanner.ts";
import { SyntaxError } from "./parser.ts";
import { Location } from "./location.ts";
import { DefinitionError, Expr } from "../cfg/definition.ts";

export type Errors = Array<ErrorItem>;

export type ErrorItem =
  | ScannerDefinitionError
  | SyntaxError
  | ScannerDefinitionFileDoesNotExistError
  | UnknownSymbolError
  | SymbolDefinedAsNonTerminalError
  | SymbolDefinedAsTerminalError
  | DefinitionError;

export type ScannerDefinitionError = {
  tag: "ScannerDefinitionError";
  location: Location;
  fileName: string;
  errors: ScanpilerErrors.Errors;
};

export type ScannerDefinitionFileDoesNotExistError = {
  tag: "ScannerDefinitionFileDoesNotExistError";
  location: Location;
  name: string;
};

export type UnknownSymbolError = {
  tag: "UnknownSymbolError";
  location: Location;
  name: string;
};

export type SymbolDefinedAsNonTerminalError = {
  tag: "SymbolDefinedAsNonTerminalError";
  location: Location;
  name: string;
};

export type SymbolDefinedAsTerminalError = {
  tag: "SymbolDefinedAsTerminalError";
  location: Location;
  name: string;
};

export function asDoc(
  errorItem: ErrorItem,
  fileName: string | undefined = undefined,
): PP.Doc {
  switch (errorItem.tag) {
    case "ScannerDefinitionError":
      return PP.vcat([
        PP.hcat([
          "Unable to load the scanner definition ",
          errorItem.fileName,
          ScanpilerErrors.errorLocation(errorItem.location, fileName),
        ]),
        PP.nest(
          2,
          PP.vcat(
            errorItem.errors.map((e) =>
              ScanpilerErrors.asDoc(e, errorItem.fileName)
            ),
          ),
        ),
      ]);
    case "SyntaxError":
      return PP.hcat([
        "Unexpected token ",
        ttokenAsString(errorItem.found[0]),
        ". Expected ",
        PP.join(errorItem.expected.map(ttokenAsString), ", ", " or "),
        ScanpilerErrors.errorLocation(errorItem.found[1], fileName),
      ]);
    case "ScannerDefinitionFileDoesNotExistError":
      return PP.hcat([
        "Unable to read the scanner definition file ",
        errorItem.name,
        ScanpilerErrors.errorLocation(errorItem.location, fileName),
      ]);
    case "UnknownSymbolError":
      return PP.hcat([
        "No terminal or non-terminal defined with the name ",
        errorItem.name,
        ScanpilerErrors.errorLocation(errorItem.location, fileName),
      ]);
    case "SymbolDefinedAsNonTerminalError":
      return PP.hcat([
        "The name ",
        errorItem.name,
        " is already defined as a non-terminal",
        ScanpilerErrors.errorLocation(errorItem.location, fileName),
      ]);
    case "SymbolDefinedAsTerminalError":
      return PP.hcat([
        "No name ",
        errorItem.name,
        " is already defined as a terminal",
        ScanpilerErrors.errorLocation(errorItem.location, fileName),
      ]);
    case "LeftRecursiveGrammarError":
      return PP.hcat([
        "The production ",
        errorItem.name,
        " is left recursive",
      ]);
    case "AmbiguousAlternativesError":
      return PP.vcat([
        PP.hcat(
          ["The production ", errorItem.name, " has ambigious alternatives:"],
        ),
        PP.nest(
          2,
          PP.vcat(errorItem.alternatives.map((a) =>
            PP.vcat([
              exprToDoc(a[0]),
              PP.nest(2, PP.hcat(["First: {", PP.join([...a[1]], ", "), "}"])),
            ])
          )),
        ),
      ]);
  }
}

const exprToDoc = (e: Expr): PP.Doc => {
  return PP.text(JSON.stringify(e, null, 2));
};

export const ttokenAsString = (ttoken: TToken): string => {
  switch (ttoken) {
    case TToken.Uses:
      return "uses";
    case TToken.Bar:
      return '"|"';
    case TToken.Colon:
      return '":"';
    case TToken.LBracket:
      return '"["';
    case TToken.LCurly:
      return '"{"';
    case TToken.LParen:
      return '"("';
    case TToken.RBracket:
      return '"]"';
    case TToken.RCurly:
      return '"}"';
    case TToken.RParen:
      return '")"';
    case TToken.Semicolon:
      return '";"';
    case TToken.LiteralString:
      return "literal string";
    case TToken.Identifier:
      return "identifier";
    case TToken.EOS:
      return "end of content";
    case TToken.ERROR:
      return "unknown token";
  }
};
