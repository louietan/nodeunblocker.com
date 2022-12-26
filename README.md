# nodeunblocker.com

Forked from https://github.com/nfriedly/nodeunblocker.com with the
following modifications.

## Server-side encryption

This is for downloading files (such as .exe, .sh) that are
forbidden by cooperate firewalls.

The code is actually ported from
https://github.com/meixler/web-browser-based-file-encryption-decryption,
adjusted to use Node.js streams for better performance.
Which means the encrypted download can be decrypted right in the
browser.

- Entry page:
  [encryption-server.html](./public/encryption-server.html)
- Browser-side decryptor: [encryption.html](./public/encryption.html)
