# parspiler

This project is an implementation of an LL(1) parser generator designed specifically for specifying and generating parsers for programming and domain languages.  The project has the following features:

- Provides a syntax to define a programming language's grammar,
- This syntax for defining grammar allows the right-hand side of productions to be expressed using EBNF,
- Parsers the input into an internal structure, and
- Validates that the grammar is LL(1)

## See Also

A number of projects together make up the entire `parspiler` suite.  The following describes each of the projects, their purpose and how they relate to all of the other projects.

| Name | Descrpition | Related to |
|------|-------------|------------|
| parspiler | Parsers a grammar and translates the definition into an LL(1) parser for the purpose of building parsers for a target language. |  |
| [parspiler-tool-deno](https://github.com/littlelanguages/parspiler-tool-deno) | Given a grammar this tool will produce a parser and scanner in Typescript that can be included into a Deno code base. | [parspiler](https://github.com/littlelanguages/parspiler) |
| [parspiler-cli](https://github.com/littlelanguages/parspiler-cli) | A single CLI that encompasses all of the `parspiler` tools. | [parspiler-tool-deno](https://github.com/littlelanguages/parspiler-tool-deno) |


## Input Syntax

The following EBNF grammar defines the syntax of a grammar definition.

```
Definition: 
    "uses" LiteralString ";"
    {Production};
    
Production: Identifier ":" Expr ";";

Expr: SequenceExpr {"|" SequenceExpr};

SequenceExpr: {Factor};

Factor
  : LiteralString
  | "(" Expr ")"
  | "{" Expr "}"
  | "[" Expr "]"
  | Identifier
  ;
```

Using this grammar `parspiler`'s lexical structure is defined using [`scanpiler`](https://github.com/littlelanguages/scanpiler)as follows:

```
tokens
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
```

## Building Source

The directory `~/.devcontainer` contains a Dockerfile used by [Visual Studio Code](https://code.visualstudio.com) to issolate the editor and build tools from being installed on the developer's workstation.

The Dockerfile is straightforward with the interesting piece being [entr](https://github.com/eradman/entr/) which is used by the `etl.sh` to run `test.sh` whenever a source file has changed.

## Scripts

Two script can be found inside `~/.bin`

| Name   | Purpose |
|--------|----------------------------------|
| build.sh | Builds the scanner and parser in the event that the lexical ([./parser/parspiler.llld](./parser/parspiler.llld)) and syntactic ([./parser/parspiler.llgd](./parser/parspiler.llgd)) definitions have been changed. |
| etl.sh | Runs an edit-test-loop - loops indefinately running all of the tests whenever a source file has changed. |
| test.sh | Runs lint on the source code and executes the automated tests. |

These scripts must be run out of the project's root directory which, when using [Visual Studio Code](https://code.visualstudio.com), is done using a shell inside the container.