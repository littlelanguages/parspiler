#!/bin/bash

deno run --allow-read --allow-write "https://raw.githubusercontent.com/littlelanguages/parspiler-cli/main/mod.ts" deno --verbose parser/parspiler.llgd
deno fmt parser/parspiler-scanner.ts parser/parspiler-parser.ts
