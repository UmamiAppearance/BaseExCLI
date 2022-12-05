import test from "ava";
import { exec } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";

const execPromise = promisify(exec);

test("Encoding Base64", async t => {
    const encoded = (await execPromise("./index.js base64 ./test/fixtures/plain.txt")).stdout;
    const expected = await readFile("./test/fixtures/b64_enc.txt", "utf8");
    t.is(encoded, expected);
});

test("Decoding Base64", async t => {
    const decoded = (await execPromise("./index.js base64 ./test/fixtures/b64_enc.txt -d")).stdout;
    const expected = await readFile("./test/fixtures/plain.txt", "utf8");
    t.is(decoded, expected);
});
