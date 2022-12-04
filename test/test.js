import test from "ava";
import { fork } from "child_process";
import { readFile } from "fs/promises";

const forkPromise = (path, args) => {
    return new Promise((resolve, reject) => {
        fork(path, args)
            .on("data", msg => console.log("MSG", msg))
            .on("close", stdout => resolve(stdout))
            .on("error", error => reject(error));
    });
};


test("test name", async t => {
    const encoded = await forkPromise("./index.js", ["base64", "./test/fixtures/plain.txt"]);
    console.log("encoded", encoded);
    const expected = await readFile("./test/fixtures/b64_enc.txt", "utf8");
    t.is(encoded, expected);
});
