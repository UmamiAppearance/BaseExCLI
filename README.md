# BaseEx Command Line Interface

[![License](https://img.shields.io/github/license/UmamiAppearance/BaseExCLI?color=009911&style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/base-ex?color=%23009911&style=for-the-badge)](https://www.npmjs.com/package/base-ex-cli)

This is a **CLI** for [BaseExJs](https://github.com/UmamiAppearance/BaseExJS). BaseEx is designed as a library for base conversions for node.js or the browser. There are already a lot of individual CLIs available for, lets say Base32 Base64, etc.  
Those clients are very good and also fast, while this one is certainly not fast. But it has all the important base converters available, the converter is only an argument and not whole program. So, if speed is not an issue, this might be interesting for you. On top of that, it contains different encoding standards and some more exotic converters (see the list below). 

___
:warning: _This program still has to stand the test of time. Be extra attentive when using this in production._
___

## Converters/Converter Arguments
* base1
* base16
* base32_crockford
* base32_rfc3548
* base32_rfc4648
* base32_zbase32
* base58
* base58_bitcoin
* base58_flickr
* base64
* base64_urlsafe
* uuencode
* xxencode
* base85_adobe
* base85_ascii
* base85_z85
* base91
* leb128
* ecoji_v1
* ecoji_v2
* base2048
* basephi
* byteconverter
* simplebase2
* simplebase3
* simplebase4
* simplebase5
* simplebase6
* simplebase7
* simplebase8
* simplebase9
* simplebase10
* simplebase11
* simplebase12
* simplebase13
* simplebase14
* simplebase15
* simplebase16
* simplebase17
* simplebase18
* simplebase19
* simplebase20
* simplebase21
* simplebase22
* simplebase23
* simplebase24
* simplebase25
* simplebase26
* simplebase27
* simplebase28
* simplebase29
* simplebase30
* simplebase31
* simplebase32
* simplebase33
* simplebase34
* simplebase35
* simplebase36
* simplebase37
* simplebase38
* simplebase39
* simplebase40
* simplebase41
* simplebase42
* simplebase43
* simplebase44
* simplebase45
* simplebase46
* simplebase47
* simplebase48
* simplebase49
* simplebase50
* simplebase51
* simplebase52
* simplebase53
* simplebase54
* simplebase55
* simplebase56
* simplebase57
* simplebase58
* simplebase59
* simplebase60
* simplebase61
* simplebase62


## Install
```sh
npm install --global base-ex-cli
```

## Usage
The executable is reachable by calling ``bex``. Pick a converter of your choice from [above](#convertersconverter-arguments) and enjoy your data in your favorite way!  
  
**Examples:**
```sh
// encoding from stdin
cat plain.txt | bex base64
printf "Hello World!" | bex ecoji_v2

// encoding from file
bex base32_rfc3548 plain.txt

// decoding from stdin
cat encoded.txt | bex base91 -d
echo 3432210a | bex base16 -d

// decoding from file
bex base16 encoded.txt -d
```

## License
This work is licensed under [GPL-3.0](https://opensource.org/licenses/GPL-3.0).
