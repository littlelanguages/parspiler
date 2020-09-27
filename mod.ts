export * from "./cfg/definition.ts";
export * from "./parser/errors.ts";
export { translate } from "./parser/dynamic.ts";
export {
  SyntaxError,
  Visitor,
  parseDefinition,
  mkParser,
} from "./parser/parser.ts";
