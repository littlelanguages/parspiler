import * as PP from "https://raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/0.3.0/mod.ts";
import * as ScanpilerErrors from "https://raw.githubusercontent.com/littlelanguages/scanpiler/0.1.0/parser/errors.ts";
import { Location } from "./location.ts";

export type Errors = Array<ErrorItem>;

export type ErrorItem =
  | ScanpilerErrors.ErrorItem
  | ScannerDefinitionFileDoesNotExistError;

export type ScannerDefinitionFileDoesNotExistError = {
  tag: "ScannerDefinitionFileDoesNotExistError";
  location: Location;
  name: string;
};

export function asDoc(
  errorItem: ErrorItem,
  fileName: string | undefined = undefined,
): PP.Doc {
  switch (errorItem.tag) {
    case "ScannerDefinitionFileDoesNotExistError":
      return PP.hcat([
        "Unable to read the scanner definition file ",
        errorItem.name,
        ScanpilerErrors.errorLocation(errorItem.location, fileName),
      ]);
    default:
      return ScanpilerErrors.asDoc(errorItem);
  }
}
