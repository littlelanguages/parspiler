#!/bin/bash

deno run --allow-read --allow-write "https://raw.githubusercontent.com/littlelanguages/scanpiler-cli/main/mod.ts" deno --verbose parser/scanner.ll
deno fmt parser/scanner.ts

if [[ -e "test/parspiler/parser.ts" ]]
then
    deno fmt test/parspiler/parser.ts
fi

if [[ -e "test/parspiler/scanner.ts" ]]
then
    deno fmt test/parspiler/scanner.ts
fi

if [[ -e "test/simple/parser.ts" ]]
then
    deno fmt test/simple/parser.ts
fi

if [[ -e "test/simple/scanner.ts" ]]
then
    deno fmt test/simple/scanner.ts
fi
