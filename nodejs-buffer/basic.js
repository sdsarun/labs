const { Buffer } = require('node:buffer');
const { Readable, Transform, Writable, pipeline } = require('node:stream');
const { promises: fs } = require('node:fs');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const { createGzip } = require('node:zlib');

// Run this file with `node basic.js`. Each logged section walks through how Buffers
// describe raw bytes and how that idea connects to other Node.js systems.
// Think of a Buffer as a fixed-size tray of byte slots. Every tool we touch below
// either fills the tray, reads it, or forwards it somewhere else.

const logSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

(async () => {
  logSection('Seeing Bytes For The First Time');
  const text = 'Hi';
  const textBuffer = Buffer.from(text, 'utf8');
  console.log('Original string:', text);
  console.log('Raw bytes:', textBuffer, '-> per byte:', Array.from(textBuffer));
  console.log('toString turns bytes back into text:', textBuffer.toString('utf8'));

  logSection('Creating Buffers Safely');
  const fromArray = Buffer.from([0x4e, 0x6f, 0x64, 0x65]);
  console.log('Buffer.from([bytes]):', fromArray, '->', fromArray.toString());

  const zeroed = Buffer.alloc(4); // Always zero-filled.
  console.log('Buffer.alloc(4):', zeroed);

  const unsafe = Buffer.allocUnsafe(4); // May contain old memory.
  console.log('Buffer.allocUnsafe(4):', unsafe, '// clear it before trusting it');
  unsafe.fill(0); // Scrub when using allocUnsafe.

  logSection('Characters vs Bytes');
  const emoji = '😁';
  const emojiBytes = Buffer.from(emoji, 'utf8');
  console.log('Emoji:', emoji, 'byte length:', Buffer.byteLength(emoji, 'utf8'));
  console.log('Stored bytes:', Array.from(emojiBytes.values()).map((b) => b.toString(16)));

  logSection('Encodings Change Meaning');
  const message = Buffer.from('Encode me!', 'utf8');
  console.log('UTF-8 view:', message.toString('utf8'));
  console.log('Hex view:', message.toString('hex'));
  console.log('Base64 view:', message.toString('base64'));
  const roundTrip = Buffer.from(message.toString('base64'), 'base64');
  console.log('Round-trip equals original:', roundTrip.equals(message));

  logSection('Writing Numbers With Byte Order In Mind');
  const packet = Buffer.alloc(6);
  packet.writeUInt16BE(0xdead, 0); // Store 0xDEAD starting at byte 0 (big endian).
  packet.writeUInt16LE(0xbeef, 2); // Store 0xBEEF starting at byte 2 (little endian).
  packet.writeUInt8(0x7a, 4);
  packet.writeUInt8(0xff, 5);
  console.log('Packed bytes:', packet);
  console.log('Read UInt16BE @0:', packet.readUInt16BE(0));
  console.log('Read UInt16LE @2:', packet.readUInt16LE(2));

  logSection('Sharing vs Copying Memory');
  const original = Buffer.from('mutable');
  const view = original.slice(0, 4); // Shares memory.
  view[0] = 0x4d;
  console.log('Slice changed original:', original.toString());
  const copy = Buffer.from(original); // New memory.
  copy[0] = 0x5a;
  console.log('Copy stays independent:', copy.toString(), original.toString());

  logSection('Buffers Are The Currency Of Streams');
  const bufferChunks = [Buffer.from('Node '), Buffer.from('Streams')];
  const bufferStream = Readable.from(bufferChunks);
  const toUpper = new Transform({
    transform(chunk, _encoding, callback) {
      console.log('Readable emitted Buffer:', chunk, 'length:', chunk.length);
      const uppercased = chunk.toString('utf8').toUpperCase();
      callback(null, Buffer.from(uppercased));
    },
  });
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      console.log('Writable received Buffer:', chunk, '-> as text:', chunk.toString('utf8'));
      callback();
    },
  });
  await new Promise((resolve, reject) => {
    bufferStream.pipe(toUpper).pipe(sink).on('finish', resolve).on('error', reject);
  });

  const textStream = Readable.from(['chunk', 's become strings']);
  textStream.setEncoding('utf8'); // Asking the stream to decode Buffers for us.
  textStream.on('data', (chunk) => {
    console.log('After setEncoding, chunk type:', typeof chunk, 'value:', chunk);
  });
  await once(textStream, 'end');

  logSection('How stream.pipe Works');
  const pipeSource = Readable.from(['pipe ', 'moves ', 'buffers']);
  const toUpperCase = new Transform({
    transform(chunk, _encoding, callback) {
      const upper = chunk.toString('utf8').toUpperCase();
      console.log('Transform#1 uppercases chunk:', upper);
      callback(null, Buffer.from(upper));
    },
  });
  const appendBang = new Transform({
    transform(chunk, _encoding, callback) {
      const exclaimed = `${chunk.toString('utf8')}!`;
      console.log('Transform#2 appends bang:', exclaimed);
      callback(null, Buffer.from(exclaimed));
    },
  });
  const pipeSink = new Writable({
    write(chunk, _encoding, callback) {
      console.log('Writable consumed chunk from pipe chain:', chunk.toString('utf8'));
      callback();
    },
  });
  pipeSource.pipe(toUpperCase).pipe(appendBang).pipe(pipeSink); // pipe returns the destination, enabling chaining.
  await once(pipeSink, 'finish');

  const manualSource = Readable.from([Buffer.from('manual '), Buffer.from('flow')]);
  manualSource.on('data', (chunk) => {
    console.log('Manual on("data") handler saw Buffer:', chunk, '->', chunk.toString('utf8'));
  });
  await once(manualSource, 'end');

  logSection('File System APIs Hand You Buffers');
  const selfBuffer = await fs.readFile(__filename); // Reading this script itself.
  console.log('First 32 bytes of this file:', selfBuffer.subarray(0, 32));
  console.log('fs.readFile returns Buffer:', Buffer.isBuffer(selfBuffer));
  const snippet = selfBuffer.subarray(0, 32).toString();
  await fs.writeFile('./buffer-snippet.txt', snippet); // Store small text preview.
  console.log('Wrote first 32 bytes to buffer-snippet.txt (text form).');

  logSection('Buffers In Crypto Workflows');
  const hash = createHash('sha256');
  hash.update(Buffer.from('secret payload'));
  const digest = hash.digest(); // Digest is a Buffer.
  console.log('SHA-256 digest bytes:', digest);
  console.log('SHA-256 hex:', digest.toString('hex'));

  logSection('Buffers Frame Network Messages');
  const payload = Buffer.from('HELLO');
  const framed = Buffer.alloc(2 + payload.length);
  framed.writeUInt16BE(payload.length, 0); // 2-byte length prefix.
  payload.copy(framed, 2);
  console.log('Framed packet:', framed);
  const lengthPrefix = framed.readUInt16BE(0);
  const body = framed.subarray(2, 2 + lengthPrefix);
  console.log('Decoded payload:', body.toString());

  logSection('Buffers And TypedArray Views');
  const letters = Buffer.from('abc');
  const uint8 = new Uint8Array(letters.buffer, letters.byteOffset, letters.byteLength);
  console.log('Uint8Array shares memory:', uint8);
  uint8[0] = 0x5a;
  console.log('Buffer sees Uint8Array edit:', letters.toString());

  logSection('Converting To/From ArrayBuffer');
  const fromArrayBuffer = Buffer.from(new TextEncoder().encode('Browser Bytes').buffer);
  console.log('Buffer from ArrayBuffer:', fromArrayBuffer.toString());
  const backToArrayBuffer = fromArrayBuffer.buffer.slice(
    fromArrayBuffer.byteOffset,
    fromArrayBuffer.byteOffset + fromArrayBuffer.byteLength,
  );
  console.log('Raw ArrayBuffer byteLength:', backToArrayBuffer.byteLength);

  logSection('JSON Serialization Helper');
  const json = letters.toJSON();
  console.log('Buffer.toJSON output:', json, '-> safe for JSON.stringify');

  logSection('Key Takeaways');
  console.log('- Buffers are fixed trays of bytes; strings are human views of those bytes.');
  console.log('- Use factory helpers (`Buffer.from`, `alloc`, `allocUnsafe`) to control memory.');
  console.log('- Streams, fs, crypto, and network code all speak in Buffers.');
  console.log('- Slices/subarrays share memory; `Buffer.from(otherBuffer)` copies.');
  console.log('- Interpret bytes with explicit encodings and byte-order aware read/write helpers.');

  logSection('Clean Up Demo Artifacts');
  await fs.unlink('./buffer-snippet.txt');
  console.log('Removed buffer-snippet.txt to keep workspace tidy.');
})();
