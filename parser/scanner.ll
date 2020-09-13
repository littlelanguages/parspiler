tokens
    Uses = "uses";

    Bar = "|";
    Colon = ":";
    LBracket = "[";
    LCurly = "{";
    LParen = "(";
    RBracket = "]";
    RCurly = "}";
    RParen = ")";
    Semicolon = ";";

    LiteralString = '"' {!'"'} '"';
    Identifier = alpha {alpha | digit};

comments
    "/*" to "*/" nested;
    "//" {!cr};

whitespace
    chr(0)-' ';

fragments
    digit = '0'-'9';
    alpha = 'a'-'z' + 'A'-'Z';
    cr = chr(10);
