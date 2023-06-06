#!/usr/bin/env node

/**
 * [BaseExCLI]{@link https://github.com/UmamiAppearance/BaseExCLI}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 */


import { readFileSync as readFile, statSync as stat } from "fs";
import { BaseEx } from "base-ex";
import { hideBin } from "yargs/helpers";
import yargs from "yargs";


// config values
const VERSION = (() => {
    const conf = JSON.parse(
        readFile(
            new URL("./package.json", import.meta.url)
        )
    );
    return conf.version;
})();

// used to determine big input amounts
const BIG_DATA_VAL = 16384;

const coerceLastValue = value => Array.isArray(value) ? value.pop() : value;
const FLAGS = {
    "decode": {
        alias: "d",
        coerce: coerceLastValue,
        description: "Decode data.",
        type: "string"
    },
    "ignore-garbage": {
        alias: "i",
        coerce: coerceLastValue,
        description: "When decoding, ignore non-alphabet characters.",
        type: "boolean"
    },
    "upper": {
        alias: "u",
        coerce: coerceLastValue,
        description: "When decoding, return upper case character (if the encoder is case insensitive).",
        type: "boolean"
    },
    "lower": {
        alias: "l",
        coerce: coerceLastValue,
        description: "When decoding, return lower case character (if the encoder is case insensitive).",
        type: "boolean"
    },
    "wrap": {
        alias: "w",
        coerce: coerceLastValue,
        description: "Wrap encoded lines after COLS character (default 76). Use 0 to disable line wrapping.",
        type: "number",
        default: 76
    }
};

const { argv } = yargs(hideBin(process.argv))
    .version(VERSION)
    .usage("$0 <CONVERTER> [OPTIONS]... [FILE]")
    .command("* <CONVERTER> [FILE]", "", yargs => yargs.options(FLAGS)
        .positional("CONVERTER", {
            array: false,
            describe: "CONVERTER encode or decode FILE, or standard input, to standard output.",
            type: "string",
        })
        .positional("FILE", {
            array: false,
            describe: "With no FILE, or when FILE is -, read standard input.",
            type: "string",
        })
    )
    .example("cat plain.txt | $0 base64")
    .example("$0 base32 plain.txt")
    .example("cat encoded.txt | $0 base91 -d")
    .example("$0 base16 encoded.txt -d");


// initialize BaseEx instance
const baseEx = new BaseEx("bytes");

// set options
const lineWrap = argv.wrap;
const args = [];
if ("ignoreGarbage" in argv) args.push("nointegrity");
if ("upper" in argv) args.push("upper");
if ("lower" in argv) args.push("lower");


// create a converter list
const converters = {};
for (const c in baseEx) {
    converters[c.toLowerCase()] = c;
}

delete converters.byteconverter;
delete converters.simplebase;
for (let i=2; i<=62; i++) {
    converters[`simplebase${i}`] = "simpleBase";
}


// select the converter name from the list
let converterName = converters[argv.CONVERTER.toLowerCase()];

// test for a SimpleBase converter
const sbMatch = argv.CONVERTER.match(/^(simpleBase)([0-9]+)$/i);
const sBase = (sbMatch) ? `base${sbMatch.at(2)}` : false;


// get converter
const getConverter = converterName => sBase ? baseEx.simpleBase[sBase] : baseEx[converterName];

// create a converter function
const convert = (converterName, mode, input, ...extraArgs) => {
    const converter = getConverter(converterName);
    return converter[mode](input, ...args, ...extraArgs);
};


// if a valid converter is set -> proceed
if (converterName) {

    const convInstance = getConverter(converterName);

    // test mode encoding/decoding
    const mode = ("decode" in argv) ? "decode" : "encode";

    let uuencode = false;
    // tell UUencode-converter to apply the typical header (filename and permissions)
    if (/^(?:uu|xx)encode/.test(converterName)) {
        args.push("header");
        uuencode = true;
    }

    const noBSWarn = () => {
        process.stderr.write(`WARNING: The ${converterName}-converter needs to convert the complete input into one big integer. It is not made for big data amounts and might take a long time to process. You should consider to use converter with a fixed block size (Base16, Base32, Base64, ...).\n`);
    };
    
    // read from stdin if no file was provided
    if (!argv.FILE || argv.FILE === "-") {
        const fileName = "/dev/stdin";
        const permissions = "777";

        const getBS = () => mode === "encode" ? "bsEnc" : "bsDec";
        let bs = convInstance.converter[getBS()];

        if (uuencode) {
            if (bs === 3) {
                bs = 45;
                process.stdout.write("begin 644 /dev/stdin\n");
            } else {
                bs = 61;
            }
        }
        

        // collect all data before converting if converter has no block size
        const noFlush = !bs;

        // queue for the incoming data
        const dataQueue = [[null, ""]];


        const processChunk = async input => {

            // wait for previous chunk and get carried data
            let [ carryIn, carryOut ] = await dataQueue.at(-1);

            // join the carried data with the current input
            if (carryIn) {
                input = Buffer.concat([carryIn, input]);
                carryIn = null;
            }

            // skip converting and flushing if "noFlush" is true
            if (noFlush) {
                carryIn = input;
                return [ carryIn, "" ];
            }


            let endIndex;

            // ensure complete byte groups according
            // to the bs (decoding needs some twists
            // to work correctly)
            
            if (mode === "decode") {
                
                // for uuencode, always carry the last line
                // which ensures a complete line of 60 encoded
                // characters
                if (uuencode) {
                    endIndex = input
                        .toString()
                        .split(/\r?\n/)
                        .at(-1)
                        .length;
                }

                // for any other converter remove newline characters
                // and carry any byte, which isn't devisable by the bs
                else {
                    const cleanInput = [];
                    for (const val of input) {
                        if (!(val === 0x0a || val === 0x0d)) {
                            cleanInput.push(val);
                        }
                    }
                    input = Buffer.from(cleanInput);

                    if (converterName === "ecoji_v2") {

                        // get the individual utf-8 chars
                        const utf8Array = [...input.toString()];

                        // get the maximum amount of chars according to the bs
                        // (ignore the last char in any case, as it might be split
                        // on byte level)
                        const endIndexUtf8 = ((utf8Array.length-1) % bs) + 1;

                        // calculate the endIndex
                        const inputLen = Buffer.from(utf8Array.slice(0, -endIndexUtf8).join(""), "utf-8").byteLength;
                        endIndex = input.byteLength - inputLen;
                    } 

                    else {
                        endIndex = input.length % bs;
                    }
                }
            }
            
            else {
                endIndex = input.length % bs;
            }
            
            // only convert the amount of bytes, which is divisible by the bs 
            if (endIndex) {
                carryIn = Buffer.alloc(endIndex, input.subarray(-endIndex));
                input = input.subarray(0, -endIndex);
            }

            const options = {
                file: fileName,
                lineWrap: 0,
                permissions
            };


            if (uuencode) {
                process.stdout.write(convert(converterName, mode, input, "buffering", options));
            }
            
            else if (mode === "encode") {
                const output = carryOut + convert(converterName, mode, input, options);
                carryOut = "";
                
                if (lineWrap) {
                    const outArray = output.match(new RegExp(`.{1,${lineWrap}}`, "gu"));

                    // carry the last line as it most likely is not
                    // matching the line wrap (testing the length is
                    // not always reliable due to the fact that unicode
                    // characters differ in bytelength)
                    carryOut = outArray.pop();
                    
                    process.stdout.write(outArray.join("\n") + "\n");
                }

                else {
                    process.stdout.write(output);
                }
            } 

            else {
                process.stdout.write(convert(converterName, mode, input, options));
            }

            return [ carryIn, carryOut ];
        };


        const endDataProcessing = async () => {

            let [carryIn, carryOut] = await dataQueue.at(-1);

            if (carryOut) {
                process.stdout.write(carryOut);
            }

            if (carryIn) {
                if (noFlush && carryIn.length > BIG_DATA_VAL) noBSWarn();
                
                const options = {
                    file: fileName,
                    lineWrap,
                    permissions
                };
                
                const extraArgs = [ options ];
                if (uuencode) {
                    extraArgs.push("buffering");
                }
                process.stdout.write(convert(converterName, mode, carryIn, ...extraArgs));
            }

            if (uuencode && mode === "encode") {
                process.stdout.write(`${convInstance.charsets[convInstance.version].at(0)}\nend\n`);
            }

        };


        // stdin data event listener
        process.stdin.on("data", input => { dataQueue.push(processChunk(input)); });


        // handle the remaining data, when input on stdin ends 
        process.stdin.on("end", endDataProcessing);
    }

    // open the provided file
    else {
        let file;
        try { 
            file = stat(argv.FILE);
        } catch (err) {
            process.stderr.write(`base-ex: ${argv.FILE}: `);

            if (err.code === "ENOENT") {
                process.stderr.write("No such file or directory.\n");
            } else {
                process.stderr.write("Cannot stat file\n");
            }

            process.exit(1);
        }

        // set a file value (without path) and permissions
        const fileName = argv.FILE.replace(/.*\//, "");
        const permissions = (file.mode & 0x1ff).toString(8);
        
        // open the file
        let input;
        try {
            input = readFile(argv.FILE);
        } catch (err) {
            process.stderr.write("base-ex: ");
            process.stderr.write(err);
            process.stderr.write("\n");
            process.exit(2);
        }

        // perform the actual encoding or decoding
        const options = {
            file: fileName,
            lineWrap,
            permissions
        };
        process.stdout.write(convert(converterName, mode, input, options));
    }
}

// if no valid converter was provided list all available converters
else {
    process.stderr.write("\nConverters:\n  * ");
    process.stderr.write(Object.keys(converters).join("\n  * "));
    process.stderr.write("\n---------------------\n");
    process.stderr.write("Unknown converter. See the options above.\n");
    process.exitCode = 1;
}

