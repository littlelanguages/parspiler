import * as PP from "https://raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/0.3.0/mod.ts";
import { Errors as ScanpilerErrors } from "../scanpiler.ts";
import { Location } from "./location.ts";

export type Errors = Array<ErrorItem>;

export type ErrorItem =
  | ScannerDefinitionError
  | ScannerDefinitionFileDoesNotExistError
  | UnknownSymbolError;

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
  }
}
