#!/bin/bash

deno run --allow-read --allow-write "https://raw.githubusercontent.com/littlelanguages/scanpiler-cli/main/mod.ts" deno --verbose parser/scanner.ll

