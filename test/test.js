import test from "ava";
import { exec } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";

const execPromise = promisify(exec);

class DecodingError extends TypeError {
    constructor(msg) {
        super(msg);
        this.name = "DecodingError";
    }
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);
const randStr = (len) => {
    const array = new Uint8Array(len);
    array.forEach((b, i) => array[i] = randInt(32, 127));
    const str = new TextDecoder("ascii").decode(array);
    return `'${str.replaceAll("'", "\"")}'`;
};


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
        (await execPromise(cmd)).stdout
    );
    
    t.is(bytes.toString, backDecoded.toString);
});


test("Arguments 'upper' and 'lower' (Base32)", async t => {
    const mixedCaseOutput = "jbsWY3DPEBLW64TMMqqq====";
    
    const b32Upper = (await execPromise("./index.js base32_rfc3548 ./test/fixtures/plain.txt -u")).stdout;
    const b32Lower = (await execPromise("./index.js base32_rfc3548 ./test/fixtures/plain.txt -l")).stdout;

    t.is(mixedCaseOutput.toUpperCase(), b32Upper);
    t.is(mixedCaseOutput.toLowerCase(), b32Lower);
});


test("Line wrapping with random string (256 characters) input (BasE91)", async t => {
    const str = randStr(256);
    const cmdEnc = `echo -n ${str} | ./index.js base91`;
    
    const encodedDefault = (await execPromise(cmdEnc)).stdout;
    const encodedW48 = (await execPromise(cmdEnc + " -w 48")).stdout;
    const encodedNoNL = (await execPromise(cmdEnc + " -w 0")).stdout;
    
    t.is(encodedDefault.split(/\s/).length, 5);
    t.is(encodedW48.split(/\s/).length, 7);
    t.is(encodedNoNL.split(/\s/).length, 1);

    const cmdDec = " | ./index.js base91 -d";
    
    const backDecodedDefault = (await execPromise(`echo '${encodedDefault}'` + cmdDec)).stdout;
    const backDecodedW48 = (await execPromise(`echo '${encodedW48}'` + cmdDec)).stdout;
    const backDecodedNoNL = (await execPromise(`echo '${encodedNoNL}'` + cmdDec)).stdout;
    
    t.is(backDecodedDefault, str.slice(1, -1));
    t.is(backDecodedW48, str.slice(1, -1));
    t.is(backDecodedNoNL, str.slice(1, -1));
});


test("Garbage input (default behavior and ignoring) (Base58)", async t => {
    const cmd = "echo 4Ve28L4e_tt | ./index.js base58 -d";

    await t.throwsAsync(execPromise(cmd));
    
    const decoded = (await execPromise(cmd + " -i")).stdout;
    t.is(decoded, "garbage");
    
});