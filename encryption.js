var crypto = require('crypto');
var stream = require('stream');
var express = require('express');
var axios = require('axios');
var { webcrypto } = crypto;
var { PassThrough } = stream;
var { StreamCombiner } = require('./streams');

async function createSymmetricCipherStream(password) {
    var SALT_SIZE = 8,
        SALTED = new TextEncoder('utf-8').encode('Salted__');

    var passphrasebytes = new TextEncoder("utf-8").encode(password);
    var pbkdf2salt = webcrypto.getRandomValues(new Uint8Array(SALT_SIZE));

    var pbkdf2iterations = 10000;
    var passphrasekey = await webcrypto.subtle.importKey('raw', passphrasebytes, { name: 'PBKDF2' }, false, ['deriveBits'])
    var pbkdf2bytes = await webcrypto.subtle.deriveBits({ "name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256' }, passphrasekey, 384)

    pbkdf2bytes = new Uint8Array(pbkdf2bytes);
    keybytes = pbkdf2bytes.slice(0, 32);
    ivbytes = pbkdf2bytes.slice(32);

    var key = await webcrypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['encrypt'])

    var cipherStream = crypto.createCipheriv('aes-256-cbc', key, ivbytes);

    var headerStream = new PassThrough()
    headerStream.write(SALTED);
    headerStream.write(pbkdf2salt);

    return {
        cipherStream: new StreamCombiner(cipherStream, headerStream),
        calculateFinalSize(dataSize) {
            // https://www.w3.org/2012/webcrypto/WebCryptoAPI-20142503/Overview.html#aes-cbc-description
            // For AES-CBC, Web Crypto uses PKCS7 padding, which adds enough data to make
            // the data size multiple of AES block size (16).
            var paddingSize = 16 - (dataSize % 16);
            return dataSize + SALTED.length + SALT_SIZE + paddingSize;
        }
    };
}

var encryptionRouter = express.Router();

encryptionRouter.post('/dl', function handler(req, res) {
    var { url = '', password = '' } = req.body;

    url = url.trim();

    if (!(url && password)) {
        res.status(403).send('Invalid request');
        return;
    }

    var pathname = new URL(url).pathname;
    var filename = pathname.substring(pathname.lastIndexOf('/') + 1);

    axios.get(url, { responseType: 'stream' })
        .then(
            async response => {
                var { cipherStream, calculateFinalSize } = await createSymmetricCipherStream(password);

               var contentLength = response.headers['content-length'];
                if (contentLength) {
                    res.set('Content-Length', calculateFinalSize(parseInt(contentLength)));
                }

                res.set({
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename=${filename}.enc`,
                })

                response.data.pipe(cipherStream).pipe(res);
            }
        ).catch(error => {
            res.set('Content-Type', 'text/plain');

            if (error.response) {
                res.status(error.response.status).send(error.message);
            } else {
                res.send(`Error downloading ${url}\n${error.message}`);
            }
        })
})

module.exports = {
    createSymmetricCipherStream,
    encryptionRouter
};
