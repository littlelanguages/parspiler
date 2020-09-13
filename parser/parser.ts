import { mkScanner, Scanner, Token, TToken } from "./scanner.ts";

export interface Visitor<
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

export function parseExpr<
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
): T_Expr {
  return new Parser(mkScanner(input), visitor).expr();
}

export function parseDefinition<
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
): T_Definition {
  return new Parser(mkScanner(input), visitor).definition();
}

class Parser<
  T_Definition,
  T_Production,
  T_Expr,
  T_SequenceExpr,
  T_Factor,
> {
  private scanner: Scanner;
  private visitor: Visitor<
    T_Definition,
    T_Production,
    T_Expr,
    T_SequenceExpr,
    T_Factor
  >;

  constructor(
    scanner: Scanner,
    visitor: Visitor<
      T_Definition,
      T_Production,
      T_Expr,
      T_SequenceExpr,
      T_Factor
    >,
  ) {
    this.scanner = scanner;
    this.visitor = visitor;
  }

  definition(): T_Definition {
    const a1 = this.matchToken(TToken.Uses);
    const a2 = this.matchToken(TToken.LiteralString);
    const a3 = this.matchToken(TToken.Semicolon);
    const a4: Array<T_Production> = [];

    return this.visitor.visitDefinition([a1, a2, a3, a4]);
  }

  expr(): T_Expr {
    const a1: T_SequenceExpr = this.sequenceExpr();
    const a2: Array<[Token, T_SequenceExpr]> = [];

    while (this.isToken(TToken.Bar)) {
      const a21 = this.nextToken();
      const a22 = this.sequenceExpr();
      a2.push([a21, a22]);
    }

    return this.visitor.visitExpr([a1, a2]);
  }

  sequenceExpr(): T_SequenceExpr {
    const a1 = [];

    while (this.isTokens(firstFactor)) {
      a1.push(this.factor());
    }

    return this.visitor.visitSequenceExpr(a1);
  }

  factor(): T_Factor {
    if (this.isToken(TToken.LiteralString)) {
      const a1 = this.nextToken();

      return this.visitor.visitFactor1(a1);
    } else if (this.isToken(TToken.LParen)) {
      const a1 = this.nextToken();
      const a2 = this.expr();
      const a3 = this.matchToken(TToken.RParen);

      return this.visitor.visitFactor2([a1, a2, a3]);
    } else if (this.isToken(TToken.LCurly)) {
      const a1 = this.nextToken();
      const a2 = this.expr();
      const a3 = this.matchToken(TToken.RCurly);

      return this.visitor.visitFactor3([a1, a2, a3]);
    } else if (this.isToken(TToken.LBracket)) {
      const a1 = this.nextToken();
      const a2 = this.expr();
      const a3 = this.matchToken(TToken.RBracket);

      return this.visitor.visitFactor4([a1, a2, a3]);
    } else if (this.isToken(TToken.Identifier)) {
      const a1 = this.nextToken();

      return this.visitor.visitFactor5(a1);
    } else {
      throw new SyntaxError(this.scanner.current(), firstFactor);
    }
  }

  private matchToken(ttoken: TToken): Token {
    if (this.isToken(ttoken)) {
      return this.nextToken();
    } else {
      throw new SyntaxError(this.scanner.current(), [ttoken]);
    }
  }

  private isToken(ttoken: TToken): boolean {
    return this.currentToken() == ttoken;
  }

  private isTokens(ttokens: Array<TToken>): boolean {
    return ttokens.includes(this.currentToken());
  }

  private currentToken(): TToken {
    return this.scanner.current()[0];
  }

  private nextToken(): Token {
    const result = this.scanner.current();
    this.scanner.next();
    return result;
  }
}

class SyntaxError {
  found: Token;
  expected: Array<TToken>;

  constructor(found: Token, expected: Array<TToken>) {
    this.found = found;
    this.expected = expected;
  }
}

const firstFactor = [
  TToken.LiteralString,
  TToken.LParen,
  TToken.LCurly,
  TToken.LBracket,
  TToken.Identifier,
];
