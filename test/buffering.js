import test from "ava";
import { exec } from "child_process";
import { writeFile } from "fs/promises";
import { promisify } from "util";
import tmp from "tmp";


const execPromise = promisify(exec);

const randInt = () => Math.floor(Math.random() * 256);

const randBuff = len => {
    const array = new Uint8Array(len);
    array.forEach((b, i) => array[i] = randInt());
    return Buffer.from(array);
};


// Create a temporary file with arbitrary bytes (128KiB+)
const TMP_FILE = tmp.fileSync();
const buffer = randBuff(2**17+randInt());
const BUFFER_STR = buffer.toString();
await writeFile(TMP_FILE.name, buffer);


// encode the file with different converters and decode
// back to test if it matches the original "file"

test("Buffer input (Base16)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js base16 | ./index.js base16 -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});


test("Buffer input (Base32 Crockford)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js base32_crockford | ./index.js base32_crockford -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});


test("Buffer input (BasE91)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js base91 | ./index.js base91 -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});

test("Buffer input (UUencode)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js uuencode | ./index.js uuencode -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});

test("Buffer input (Base85)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js base85_adobe | ./index.js base85_adobe -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});


test("Buffer input (ecoji)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js ecoji_v2 | ./index.js ecoji_v2 -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});

test("Buffer input (Base2048)", async t => {
    const cmd = `cat ${TMP_FILE.name} | ./index.js base2048 | ./index.js base2048 -d`;
    const output = (await execPromise(cmd)).stdout;
    t.is(output, BUFFER_STR);
});

test.after.always("cleanup", TMP_FILE.removeCallback);
