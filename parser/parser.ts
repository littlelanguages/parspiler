import { Either, left, right } from "../data/either.ts";
import { mkScanner, Scanner, Token, TToken } from "./scanner.ts";

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

  const isToken = (ttoken: TToken): boolean => currentToken() == ttoken;

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
      const a1 = matchToken(TToken.Uses);
      const a2 = matchToken(TToken.LiteralString);
      const a3 = matchToken(TToken.Semicolon);
      const a4: Array<T_Production> = [];

      while (isTokens(firstProduction)) {
        const a41 = this.production();

        a4.push(a41);
      }

      matchToken(TToken.EOS);

      return visitor.visitDefinition(a1, a2, a3, a4);
    },

    production: function (): T_Production {
      const a1 = matchToken(TToken.Identifier);
      const a2 = matchToken(TToken.Colon);
      const a3 = this.expr();
      const a4 = matchToken(TToken.Semicolon);

      return visitor.visitProduction(a1, a2, a3, a4);
    },

    expr: function (): T_Expr {
      const a1: T_SequenceExpr = this.sequenceExpr();
      const a2: Array<[Token, T_SequenceExpr]> = [];

      while (isToken(TToken.Bar)) {
        const a21 = nextToken();
        const a22 = this.sequenceExpr();

        a2.push([a21, a22]);
      }

      return visitor.visitExpr(a1, a2);
    },

    sequenceExpr: function (): T_SequenceExpr {
      const a1 = [];

      while (isTokens(firstFactor)) {
        const a11 = this.factor();

        a1.push(a11);
      }

      return visitor.visitSequenceExpr(a1);
    },

    factor: function (): T_Factor {
      if (isToken(TToken.LiteralString)) {
        const a1 = nextToken();

        return visitor.visitFactor1(a1);
      } else if (isToken(TToken.LParen)) {
        const a1 = nextToken();
        const a2 = this.expr();
        const a3 = matchToken(TToken.RParen);

        return visitor.visitFactor2(a1, a2, a3);
      } else if (isToken(TToken.LCurly)) {
        const a1 = nextToken();
        const a2 = this.expr();
        const a3 = matchToken(TToken.RCurly);

        return visitor.visitFactor3(a1, a2, a3);
      } else if (isToken(TToken.LBracket)) {
        const a1 = nextToken();
        const a2 = this.expr();
        const a3 = matchToken(TToken.RBracket);

        return visitor.visitFactor4(a1, a2, a3);
      } else if (isToken(TToken.Identifier)) {
        const a1 = nextToken();

        return visitor.visitFactor5(a1);
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: firstFactor,
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

const firstFactor = [
  TToken.LiteralString,
  TToken.LParen,
  TToken.LCurly,
  TToken.LBracket,
  TToken.Identifier,
];
const firstProduction = [TToken.Identifier];
