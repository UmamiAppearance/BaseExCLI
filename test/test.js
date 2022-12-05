import test from "ava";
import { exec } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";

const execPromise = promisify(exec);

test("Encoding Base64 from file", async t => {
    const encoded = (await execPromise("./index.js base64 ./test/fixtures/plain.txt")).stdout;
    const expected = await readFile("./test/fixtures/b64_enc.txt", "utf8");
    t.is(encoded, expected);
});

test("Decoding Base64 from file", async t => {
    const cmd = "./index.js base64 ./test/fixtures/b64_enc.txt -d";
    const decoded = (await execPromise(cmd)).stdout;
    const expected = await readFile("./test/fixtures/plain.txt", "utf8");
    t.is(decoded, expected);
});

test("En- and decoding arbitrary bytes (Ecoji 2.0)", async t => {
    const cmd = "./index.js ecoji_v2 ./test/fixtures/bytes.dat | ./index.js ecoji_v2 -d";
    const bytes = new Uint8Array(await readFile("./test/fixtures/plain.txt"));
    const backDecoded = new TextEncoder().encode(
        (await execPromise(cmd)).stdout);
    t.is(bytes.toString, backDecoded.toString);
});