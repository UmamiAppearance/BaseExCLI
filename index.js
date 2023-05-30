#!/usr/bin/env node

/**
 * [BaseExCLI]{@link https://github.com/UmamiAppearance/BaseExCLI}
 *
 * @version 0.3.7
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
const options = {
    lineWrap: argv.wrap
};
const extraArgs = [ options ];
if ("ignoreGarbage" in argv) extraArgs.push("nointegrity");
if ("upper" in argv) extraArgs.push("upper");
if ("lower" in argv) extraArgs.push("lower");


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
const convert = (converterName, mode, input) => {
    const converter = getConverter(converterName);
    process.stdout.write(converter[mode](input, ...extraArgs));
    process.exitCode = 0;
};

// if a valid converter is set proceed
if (converterName) {

    // test mode encoding/decoding
    const mode = ("decode" in argv) ? "decode" : "encode";

    // tell UUencode-converter to apply the typical header (filename and permissions)
    if (/^(?:uu|xx)encode/.test(converterName)) {
        extraArgs.push("header");
    }

    const noBSWarn = () => {
        console.warn(`WARNING: The ${converterName}-converter needs to convert the complete input into one big integer. It is not made for big data amounts and might take a long time to process. You should consider to use converter with a fixed block size (Base16, Base32, Base64, ...).`);
    };
    
    // read from stdin if no file was provided
    if (!argv.FILE || argv.FILE === "-") {
        options.file = "/dev/stdin";
        options.permissions = "777";

        const getBS = () => mode === "encode" ? "bsEnc" : "bsDec";
        const bs = getConverter(converterName).converter[getBS()];
        let carry = null;

        // collect all data before converting if converter has no block size
        const noFlush = !bs;
        if (noFlush) {
            process.stdin.on("end", () => {
                if (carry.length > BIG_DATA_VAL) noBSWarn();
                convert(converterName, mode, carry);
            });
        }
        
        // stdin event listener
        process.stdin.on("data", input => {

            // count all newline characters if mode is "decode"
            // (otherwise it is impossible to test for bs groups)
            let newLineChars = 0;
            if (mode === "decode" && !noFlush) {
                for (const val of input) {
                    if (val === 0x0a || val === 0x0d) {
                        newLineChars ++;
                    } 
                } 
            }

            // join the carried data with the current input
            if (carry) {
                input = Buffer.concat([carry, input]);
                carry = null;
            }

            // skip converting and flushing if "noFlush" is true
            if (noFlush) {
                carry = input;
                return;
            }

            // only convert the amount of bytes, which is divisible by the bs 
            // (converts without without padding)
            const bLen = input.length;
            if (bLen >= 65536) {
                const endIndex = (bLen-newLineChars) % bs;
                if (endIndex) {
                    carry = Buffer.alloc(endIndex, input.subarray(-endIndex));
                    input = input.subarray(0, -endIndex);
                }
            }
            
            convert(converterName, mode, input);
        });
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
        options.file = argv.FILE.replace(/.*\//, "");
        options.permissions = (file.mode & 0x1ff).toString(8);
        
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
        convert(converterName, mode, input);
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
