import {
  Either,
  left,
  right,
} from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-either/0.1.2/mod.ts";
import { mkScanner, Scanner, Token, TToken } from "./parspiler-scanner.ts";

export interface Visitor<
  T_Definition,
  T_Production,
  T_Expr,
  T_SequenceExpr,
  T_Factor,
> {
  visitDefinition(
    a1: Token,
    a2: Token,
    a3: Token,
    a4: Array<T_Production>,
  ): T_Definition;
  visitProduction(a1: Token, a2: Token, a3: T_Expr, a4: Token): T_Production;
  visitExpr(a1: T_SequenceExpr, a2: Array<[Token, T_SequenceExpr]>): T_Expr;
  visitSequenceExpr(a: Array<T_Factor>): T_SequenceExpr;
  visitFactor1(a: Token): T_Factor;
  visitFactor2(a1: Token, a2: T_Expr, a3: Token): T_Factor;
  visitFactor3(a1: Token, a2: T_Expr, a3: Token): T_Factor;
  visitFactor4(a1: Token, a2: T_Expr, a3: Token): T_Factor;
  visitFactor5(a: Token): T_Factor;
}

export const parseDefinition = <
  T_Definition,
  T_Production,
  T_Expr,
  T_SequenceExpr,
  T_Factor,
>(
  input: string,
  visitor: Visitor<
    T_Definition,
    T_Production,
    T_Expr,
    T_SequenceExpr,
    T_Factor
  >,
): Either<SyntaxError, T_Definition> => {
  try {
    return right(mkParser(mkScanner(input), visitor).definition());
  } catch (e) {
    return left(e);
  }
};

export const mkParser = <
  T_Definition,
  T_Production,
  T_Expr,
  T_SequenceExpr,
  T_Factor,
>(
  scanner: Scanner,
  visitor: Visitor<
    T_Definition,
    T_Production,
    T_Expr,
    T_SequenceExpr,
    T_Factor
  >,
) => {
  const matchToken = (ttoken: TToken): Token => {
    if (isToken(ttoken)) {
      return nextToken();
    } else {
      throw {
        tag: "SyntaxError",
        found: scanner.current(),
        expected: [ttoken],
      };
    }
  };

  const isToken = (ttoken: TToken): boolean => currentToken() === ttoken;

  const isTokens = (ttokens: Array<TToken>): boolean =>
    ttokens.includes(currentToken());

  const currentToken = (): TToken => scanner.current()[0];

  const nextToken = (): Token => {
    const result = scanner.current();
    scanner.next();
    return result;
  };

  return {
    definition: function (): T_Definition {
      const a1: Token = matchToken(TToken.Uses);
      const a2: Token = matchToken(TToken.LiteralString);
      const a3: Token = matchToken(TToken.Semicolon);
      const a4: Array<T_Production> = [];

      while (isToken(TToken.Identifier)) {
        const a4t: T_Production = this.production();
        a4.push(a4t);
      }
      return visitor.visitDefinition(a1, a2, a3, a4);
    },
    production: function (): T_Production {
      const a1: Token = matchToken(TToken.Identifier);
      const a2: Token = matchToken(TToken.Colon);
      const a3: T_Expr = this.expr();
      const a4: Token = matchToken(TToken.Semicolon);
      return visitor.visitProduction(a1, a2, a3, a4);
    },
    expr: function (): T_Expr {
      const a1: T_SequenceExpr = this.sequenceExpr();
      const a2: Array<[Token, T_SequenceExpr]> = [];

      while (isToken(TToken.Bar)) {
        const a2t1: Token = matchToken(TToken.Bar);
        const a2t2: T_SequenceExpr = this.sequenceExpr();
        const a2t: [Token, T_SequenceExpr] = [a2t1, a2t2];
        a2.push(a2t);
      }
      return visitor.visitExpr(a1, a2);
    },
    sequenceExpr: function (): T_SequenceExpr {
      const a: Array<T_Factor> = [];

      while (
        isTokens(
          [
            TToken.LiteralString,
            TToken.LParen,
            TToken.LCurly,
            TToken.LBracket,
            TToken.Identifier,
          ],
        )
      ) {
        const at: T_Factor = this.factor();
        a.push(at);
      }
      return visitor.visitSequenceExpr(a);
    },
    factor: function (): T_Factor {
      if (isToken(TToken.LiteralString)) {
        return visitor.visitFactor1(matchToken(TToken.LiteralString));
      } else if (isToken(TToken.LParen)) {
        const a1: Token = matchToken(TToken.LParen);
        const a2: T_Expr = this.expr();
        const a3: Token = matchToken(TToken.RParen);
        return visitor.visitFactor2(a1, a2, a3);
      } else if (isToken(TToken.LCurly)) {
        const a1: Token = matchToken(TToken.LCurly);
        const a2: T_Expr = this.expr();
        const a3: Token = matchToken(TToken.RCurly);
        return visitor.visitFactor3(a1, a2, a3);
      } else if (isToken(TToken.LBracket)) {
        const a1: Token = matchToken(TToken.LBracket);
        const a2: T_Expr = this.expr();
        const a3: Token = matchToken(TToken.RBracket);
        return visitor.visitFactor4(a1, a2, a3);
      } else if (isToken(TToken.Identifier)) {
        return visitor.visitFactor5(matchToken(TToken.Identifier));
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [
            TToken.LiteralString,
            TToken.LParen,
            TToken.LCurly,
            TToken.LBracket,
            TToken.Identifier,
          ],
        };
      }
    },
  };
};

export type SyntaxError = {
  tag: "SyntaxError";
  found: Token;
  expected: Array<TToken>;
};
