import { Token } from "./scanner.ts";

interface Visitor<
  T_Definition,
  T_Production,
  T_Expr,
  T_SequenceExpr,
  T_Factor,
> {
  visitDefinition(a: [Token, Token, Token, Array<T_Production>]): T_Definition;

  visitProduction(a: [Token, Token, T_Expr, Token]): T_Production;

  visitExpr(a: [T_SequenceExpr, Array<[Token, T_SequenceExpr]>]): T_Expr;

  visitSequenceExpr(a: Array<T_Factor>): T_SequenceExpr;

  visitFactor1(a: Token): T_Factor;
  visitFactor2(a: [Token, T_Expr, Token]): T_Factor;
  visitFactor3(a: [Token, T_Expr, Token]): T_Factor;
  visitFactor4(a: [Token, T_Expr, Token]): T_Factor;
  visitFactor5(a: Token): T_Factor;
}
