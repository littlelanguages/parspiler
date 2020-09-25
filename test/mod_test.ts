import * as Assert from "https://deno.land/std@0.68.0/testing/asserts.ts";
import { OutputMode, exec } from "https://deno.land/x/exec@0.0.5/mod.ts";

import { denoCommand } from "./mod.ts";

await test("simple");

async function test(name: string) {
  Deno.test(name, async () => {
    await assertTest(name);
  });
}

async function assertTest(name: string) {
  await denoCommand(
    `./test/${name}/parser.pd`,
    { directory: undefined, force: true, verbose: true },
  );

  const result = await exec(
    `deno test ./test/${name}/parser_t.ts`,
    { output: OutputMode.StdOut },
  );

  Assert.assertEquals(result.status.code, 0);
}