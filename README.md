[![npm version](https://img.shields.io/npm/v/@sovereignbase/hardware-bound)](https://www.npmjs.com/package/@sovereignbase/hardware-bound)
[![CI](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/hardware-bound/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/hardware-bound)
[![license](https://img.shields.io/npm/l/@sovereignbase/hardware-bound)](LICENSE)

1. Title

# hardware-bound

2. Description

1–2 sentences:

what it is

hardware-bound offline capable zero-knowledge/capability based bootstrapping

what it’s for

(optional) what it’s not for

3. Compatibility

A small bullet list, always in this order:

Runtimes: Node >= X; Browsers: <notes>; Workers/Edge: <notes>

Module format: ESM/CJS

Required globals / APIs: crypto.subtle, CompressionStream, indexedDB, etc.

TypeScript: bundled types / source TS / etc.

4. Goals

3–6 bullets, phrased as outcomes:

“Developer-friendly API…”

“No deps…”

“Returns copies for safety…”

5. Installation

Always the same triple:

npm install <name>

# or

pnpm add <name>

# or

yarn add <name>

6. Usage

Smallest runnable example (the “copy/paste test”)

Common patterns: 2–5 short subsections max (don’t turn this into an API book)

7. Runtime behavior

This is where you put the “how it behaves in different environments” and “what errors look like”.

Use a consistent set of subheadings when relevant:

Node

Browsers / Edge runtimes

Validation & errors

Safety / copying semantics

Caching semantics (if applicable)

8. Tests

This section should answer:

What test types exist? (unit / integration / e2e / type tests)

Where do they run? (Node versions; browser matrix)

Coverage: tool + percentage (and what it measures)

Status claim: “passes on …” (keep it factual)

Example format:

Suite: unit (Node), integration, E2E (Playwright)

Matrix: Chromium / Firefox / WebKit (+ mobile emulation if you do it)

Coverage: c8 — 100% statements/branches/functions/lines (Node)

Notes: any known skips

9. Benchmarks

This should show actual numbers, plus reproduction context.

Minimum content:

How it was run: command

Environment: runtime version + platform

Results: table or block of key ops/s or timings

Disclaimer: results vary by machine

10. License

One line. Always last.

EXAMPLES:

1.

[![npm version](https://img.shields.io/npm/v/@sovereignbase/bytecodec)](https://www.npmjs.com/package/@sovereignbase/bytecodec)
[![CI](https://github.com/sovereignbase/bytecodec/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/bytecodec/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/bytecodec/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/bytecodec)
[![license](https://img.shields.io/npm/l/@sovereignbase/bytecodec)](LICENSE)

# bytecodec

Typed JavaScript byte utilities for base64url, UTF-8 strings, JSON, and gzip that behave the same in browsers and Node. Built to make JavaScript/TypeScript projects with lots of byte-format data a breeze to build, without having to write your own utilities or boilerplate.

## Compatibility

- Runtimes: Node >= 18; Browsers: modern browsers with TextEncoder/TextDecoder + btoa/atob; Workers/Edge: runtimes with TextEncoder/TextDecoder + btoa/atob (gzip needs CompressionStream/DecompressionStream).
- Module format: ESM-only (no CJS build).
- Required globals / APIs: Node `Buffer` (base64/UTF-8 fallback); browser/edge `TextEncoder`, `TextDecoder`, `btoa`, `atob`; gzip in browser/edge needs `CompressionStream`/`DecompressionStream`.
- TypeScript: bundled types.

## Goals

- Developer-friendly API for base64url, UTF-8, JSON, gzip, concat, and equality.
- No dependencies or bundler shims.
- ESM-only and side-effect free for tree-shaking.
- Returns copies for safety when normalizing inputs.
- Consistent behavior across Node, browsers, and edge runtimes.

## Installation

```sh
npm install @sovereignbase/bytecodec
# or
pnpm add @sovereignbase/bytecodec
# or
yarn add @sovereignbase/bytecodec
```

## Usage

### Bytes wrapper

```js
import { Bytes } from '@sovereignbase/bytecodec'
// The `Bytes` convenience class wraps the same functions as static methods.
const encoded = Bytes.toBase64UrlString(new Uint8Array([1, 2, 3]))
```

### Base64URL

```js
import {
  toBase64UrlString,
  fromBase64UrlString,
} from '@sovereignbase/bytecodec'

const bytes = new Uint8Array([104, 101, 108, 108, 111])
const encoded = toBase64UrlString(bytes) // string of base64url chars
const decoded = fromBase64UrlString(encoded) // Uint8Array
```

### UTF-8 strings

```js
import { fromString, toString } from '@sovereignbase/bytecodec'

const textBytes = fromString('caffe and rockets') // Uint8Array
const text = toString(textBytes) // "caffe and rockets"
```

### JSON

```js
import { fromJSON, toJSON } from '@sovereignbase/bytecodec'

const jsonBytes = fromJSON({ ok: true, count: 3 }) // Uint8Array
const obj = toJSON(jsonBytes) // { ok: true, count: 3 }
```

### Compression

```js
import { toCompressed, fromCompressed } from '@sovereignbase/bytecodec'

const compressed = await toCompressed(new Uint8Array([1, 2, 3])) // Uint8Array
const restored = await fromCompressed(compressed) // Uint8Array
```

### Normalization

```js
import {
  toUint8Array,
  toArrayBuffer,
  toBufferSource,
} from '@sovereignbase/bytecodec'

const normalized = toUint8Array([1, 2, 3]) // Uint8Array
const copied = toArrayBuffer(normalized) // ArrayBuffer
const bufferSource = toBufferSource(normalized) // Uint8Array as BufferSource
```

### Equality

```js
import { equals } from '@sovereignbase/bytecodec'

const isSame = equals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])) // true | false
```

### Concatenating

```js
import { concat } from '@sovereignbase/bytecodec'

const joined = concat([new Uint8Array([1, 2]), new Uint8Array([3, 4]), [5, 6]]) // Uint8Array
```

## Runtime behavior

### Node

Uses `Buffer.from` for base64 and `TextEncoder`/`TextDecoder` when available, with `Buffer` fallback; gzip uses `node:zlib`.

### Browsers / Edge runtimes

Uses `TextEncoder`/`TextDecoder` and `btoa`/`atob`. Gzip uses `CompressionStream`/`DecompressionStream` when available.

### Validation & errors

Validation failures throw `BytecodecError` with a `code` string (for example `BASE64URL_INVALID_LENGTH`, `UTF8_DECODER_UNAVAILABLE`, `GZIP_COMPRESSION_UNAVAILABLE`), while underlying runtime errors may bubble through.

### Safety / copying semantics

Normalization helpers return copies (`Uint8Array`/`ArrayBuffer`) to avoid mutating caller-owned buffers.

## Tests

Suite: unit + integration (Node), E2E (Playwright)
Matrix: Chromium / Firefox / WebKit + mobile emulation (Pixel 5, iPhone 12)
Coverage: c8 — 100% statements/branches/functions/lines (Node)
Notes: no known skips

## Benchmarks

How it was run: `node benchmark/bench.js`
Environment: Node v22.14.0 (win32 x64)
Results:

| Benchmark        | Result                     |
| ---------------- | -------------------------- |
| base64 encode    | 514,743 ops/s (97.1 ms)    |
| base64 decode    | 648,276 ops/s (77.1 ms)    |
| utf8 encode      | 1,036,895 ops/s (48.2 ms)  |
| utf8 decode      | 2,893,954 ops/s (17.3 ms)  |
| json encode      | 698,985 ops/s (28.6 ms)    |
| json decode      | 791,690 ops/s (25.3 ms)    |
| concat 3 buffers | 617,497 ops/s (81.0 ms)    |
| toUint8Array     | 10,149,502 ops/s (19.7 ms) |
| toArrayBuffer    | 620,992 ops/s (322.1 ms)   |
| toBufferSource   | 8,297,585 ops/s (24.1 ms)  |
| equals same      | 4,035,195 ops/s (49.6 ms)  |
| equals diff      | 2,760,784 ops/s (72.4 ms)  |
| gzip compress    | 10,275 ops/s (38.9 ms)     |
| gzip decompress  | 18,615 ops/s (21.5 ms)     |

Results vary by machine.

## License

Apache

2.

[![npm version](https://img.shields.io/npm/v/@sovereignbase/cryptosuite)](https://www.npmjs.com/package/@sovereignbase/cryptosuite)
[![CI](https://github.com/sovereignbase/cryptosuite/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/cryptosuite/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/cryptosuite/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/cryptosuite)
[![license](https://img.shields.io/npm/l/@sovereignbase/cryptosuite)](LICENSE)

# cryptosuite

Developer-experience-first cryptography toolkit that lets you powerfully express cryptographic intentions through a semantic and declarative API surface.

## Compatibility

- Runtimes: Modern JavaScript hosts with WebCrypto.
- Module format: ESM-only (no CJS build).
- Required globals / APIs: `crypto`, `crypto.subtle`, `crypto.getRandomValues`.
- TypeScript: bundled types.

## Goals

- Consistent JWK validation for AES-GCM, HMAC, Ed25519, and RSA-OAEP.
- Byte-oriented APIs (`Uint8Array` and `ArrayBuffer`) to avoid ambiguous inputs.
- No side effects on import; all work happens per call.
- Clean separation between agents (stateful) and clusters (cached).
- Minimal, but strict WebCrypto wrappers with explicit `CryptosuiteError` codes.

## Installation

```sh
npm install @sovereignbase/cryptosuite
# or
pnpm add @sovereignbase/cryptosuite
# or
yarn add @sovereignbase/cryptosuite
```

## Usage

### Cryptosuite wrapper

```ts
import { Cryptosuite } from '@sovereignbase/cryptosuite'
// The `Cryptosuite` convenience class wraps classes and functions into an intuitive structure.
const cipherJwk = await Cryptosuite.cipher.generateKey()
const payload = new Uint8Array([1, 2, 3])
const artifact = await Cryptosuite.cipher.encrypt(cipherJwk, payload)
const roundtrip = await Cryptosuite.cipher.decrypt(cipherJwk, artifact)
```

### OpaqueIdentifier

```ts
import {
  deriveOID,
  generateOID,
  validateOID,
  type OpaqueIdentifier,
} from '@sovereignbase/cryptosuite'

const oid = await generateOID() // 43 random base64url chars
const derived = await deriveOID(idBytesFromSomewhere) // 43 deterministic base64url chars
const valid = validateOID(uncontrolledOID) // 43 base64url chars | false
if (!valid) return
```

### Cipher

```ts
import { fromJSON, toJSON } from '@sovereignbase/bytecodec'
import {
  deriveCipherKey,
  CipherCluster,
  CipherAgent,
  type CipherJWK,
} from '@sovereignbase/cryptosuite'

const cipherJwk = await deriveCipherKey(deterministicBytes)

const state = { name: 'Bob', email: 'bob@email.com' }
const enc = await CipherCluster.encrypt(cipherJwk, fromJSON(state)) // {iv, ciphertext}
const dec = await CipherCluster.decrypt(cipherJwk, enc)

const restored = toJSON(dec)
console.log(restored.name) // "Bob"
```

### Exchange

```ts
import { fromString, toString } from '@sovereignbase/bytecodec'
import {
  generateCipherKey,
  generateExchangePair,
  ExchangeCluster,
  WrapAgent,
  type WrapJWK,
  UnwrapAgent,
  type UnwrapJWK,
  CipherAgent,
  type CipherJWK,
} from '@sovereignbase/cryptosuite'

const { wrapJwk, unwrapJwk } = await generateExchangePair()
const encryptJwk = await generateCipherKey()
const encryptAgent = new CipherAgent(encryptJwk)
const body = await encryptAgent.encrypt(fromString('Hello world!')) // {iv, ciphertext}
const header = await ExchangeCluster.wrap(wrapJwk, encryptJwk) // ArrayBuffer
const message = { header, body }
const decryptJwk = (await ExchangeCluster.unwrap(
  unwrapJwk,
  message.header
)) as CipherJWK
const decryptAgent = new CipherAgent(decryptJwk)
const decryptedBody = await decryptAgent.decrypt(message.body)
const messageText = toString(decryptedBody) // "Hello world!"
```

### HMAC

```ts
import { fromString } from '@sovereignbase/bytecodec'
import {
  generateHMACKey,
  HMACCluster,
  HMACAgent,
  type HMACJWK,
} from '@sovereignbase/cryptosuite'

const hmacJwk = await generateHMACKey()

const challenge = crypto.getRandomValues(new Uint8Array(32))
const sig = await HMACCluster.sign(hmacJwk, challenge) // ArrayBuffer
const ok = await HMACCluster.verify(hmacJwk, challenge, sig) // true | false
```

### Verification

```ts
import {
  generateVerificationPair,
  VerificationCluster,
  SignAgent,
  type SignJWK,
  VerifyAgent,
  type VerifyJWK,
} from '@sovereignbase/cryptosuite'

const { signJwk, verifyJwk } = await generateVerificationPair()
const payload = new Uint8Array([9, 8, 7])
const sig = await VerificationCluster.sign(signJwk, payload) // ArrayBuffer
const ok = await VerificationCluster.verify(verifyJwk, payload, sig) // true | false
```

## Runtime behavior

### Node

Uses Node's global WebCrypto (`globalThis.crypto`) when available. Node is not the primary target, but tests and benchmarks run on Node 18+.

### Browsers / Edge runtimes

Uses `crypto.subtle` and `crypto.getRandomValues`. Ed25519 and RSA-OAEP support vary by engine; unsupported operations throw `CryptosuiteError` codes.

### Validation & errors

Validation failures throw `CryptosuiteError` with a `code` string (for example `AES_GCM_KEY_EXPECTED`, `RSA_OAEP_UNSUPPORTED`, `ED25519_ALG_INVALID`). Cryptographic failures (e.g., decrypt with the wrong key) bubble the underlying WebCrypto error.

### Security considerations

- Keep `{iv, ciphertext}` together and never mix IVs across messages or keys.
- Treat all JWKs and raw key bytes as secrets; never log them and rotate on exposure.
- Always sign a canonical byte serialization so verifiers see identical bytes.
- Ciphertext length leaks; add padding at your protocol layer if size is sensitive.
- Handle decrypt/verify failures uniformly; don't leak which check failed.

## Tests

Suite: unit + integration (Node), E2E (Playwright)
Matrix: Chromium / Firefox / WebKit + mobile emulation (Pixel 5, iPhone 12)
Coverage: c8 — 100% statements/branches/functions/lines (Node)

## Benchmarks

How it was run: `node benchmark/bench.js`
Environment: Node v22.14.0 (win32 x64)
Results:

| Benchmark            | Result                    |
| -------------------- | ------------------------- |
| AES-GCM encrypt      | 30.41ms (6575.9 ops/sec)  |
| HMAC sign+verify     | 29.95ms (6678.1 ops/sec)  |
| Ed25519 sign+verify  | 76.45ms (2616.0 ops/sec)  |
| RSA-OAEP wrap+unwrap | 1224.07ms (163.4 ops/sec) |

Results vary by machine.

## License

Apache

3.

[![npm version](https://img.shields.io/npm/v/@sovereignbase/zero-knowledge-credentials)](https://www.npmjs.com/package/@sovereignbase/zero-knowledge-credentials)
[![CI](https://github.com/sovereignbase/zero-knowledge-credentials/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/zero-knowledge-credentials/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/zero-knowledge-credentials/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/zero-knowledge-credentials)
[![license](https://img.shields.io/npm/l/@sovereignbase/zero-knowledge-credentials)](LICENSE)

# zero-knowledge-credentials

Client-side WebAuthn credential discovery for strict zero-knowledge apps. Deterministically derive a routing identifier and cryptographic root keys from a user-verifying authenticator, without accounts, identifiers, or server-side state.

## Compatibility

- Runtimes: modern browsers with WebAuthn + PRF extension + user verification.
- Module format: ESM-only (no CJS build).
- Required globals / APIs: `window`, `navigator.credentials`, `PublicKeyCredential`, PRF extension, `crypto.subtle`, `crypto.getRandomValues`.
- TypeScript: bundled types.

## Goals

- Enable strict local-first zero-knowledge for browsers.
- Deterministic, runtime-only derivation of an opaque ID and root keys.
- No storage, no networking, no server-side requirements.
- Explicit failure modes with stable error codes.

## Installation

```sh
npm install @sovereignbase/zero-knowledge-credentials
# or
pnpm add @sovereignbase/zero-knowledge-credentials
# or
yarn add @sovereignbase/zero-knowledge-credentials
```

## Usage

**These give a general idea and MUST NOT be interpreted as a full solution.**

### Register a credential

```ts
import {
  ZKCredentials,
  type ZKCredential,
  type ZKCredentialErrorCode,
} from '@sovereignbase/zero-knowledge-credentials'

await ZKCredentials.registerCredential(
  'User display name',
  'platform' // or 'cross-platform'
)
```

### Discover a credential

```ts
import { Bytes } from '@sovereignbase/bytecodec'
import { Cryptosuite } from '@sovereignbase/cryptosuite'
import { ZKCredentials } from '@sovereignbase/zero-knowledge-credentials'

const root = await ZKCredentials.discoverCredential()

const id = root.id // routing identifier / OpaqueIdentifier
const hmacJwk = root.hmacJwk // HMAC root key / HMACJWK
const cipherJwk = root.cipherJwk // AES-GCM root key / CipherJWK

const cache = await caches.open('opaque-blobs')

let artifact = await cache.match(id) // {iv, ciphertext}

if (!artifact) {
  const challengeRaw = await fetch(`/api/v1/artifact/${id}/challenge`)
  const challengeText = await challengeRaw.text()
  const challengeBytes = Bytes.fromBase64UrlString(challengeText)
  const signature = await Cryptosuite.hmac.sign(hmacJwk, challengeBytes)
  const raw = await fetch(`/api/v1/artifact/${id}`, {
    headers: {
      Authorization: Bytes.toBase64UrlString(signature),
    },
  })
  artifact = await raw.json() // {iv, ciphertext}
}

const accountCredentials = await Cryptosuite.cipher.decrypt(cipherJwk, artifact)

// const {id, hmacJwk, cipherJwk} = accountCredentials
// repeat...
// const {profileCredentials, workspaceCredentials}  = resourceCredentials
```

### Generate a credential

```ts
import { Bytes } from '@sovereignbase/bytecodec'
import { Cryptosuite } from '@sovereignbase/cryptosuite'
import { ZKCredentials } from '@sovereignbase/zero-knowledge-credentials'

const profile = {
  name: 'Bob',
  preferences: {
    theme: 'dark',
  },
}

const credentials = await ZKCredentials.generateCredential()

const id = credentials.id // resource routing identifier / OpaqueIdentifier
const hmacJwk = credentials.hmacJwk // HMAC resource key / HMACJWK
const cipherJwk = credentials.cipherJwk // AES-GCM resource key / CipherJWK

const profileBytes = Bytes.fromJSON(profile)
const artifact = await Cryptosuite.cipher.encrypt(cipherJwk, profileBytes)
fetch(
  `/api/v1/artifact/${id}`,
  JSON.stringify({
    verifier: hmacJwk,
    state: {
      iv: Bytes.toBase64UrlString(artifact.iv),
      ciphertext: Bytes.toBase64UrlString(artifact.ciphertext),
    },
  }),
  {
    method: 'POST',
  }
)
```

## Runtime behavior

### Browsers

Uses WebAuthn PRF outputs to derive:

- `id` (SHA-256 -> base64url of `rawId`)
- `cipherJwk` (AES-GCM)
- `hmacJwk` (HMAC-SHA256)

### Validation & errors

All failures are explicit and semantic. Errors are instances of `ZKCredentialError` with a stable `code`:

- `unsupported`
- `aborted`
- `user-denied`
- `no-credential`
- `prf-unavailable`
- `key-derivation-failed`

## Tests

Suite: unit + integration (Node), E2E (Playwright)
Matrix: Chromium / Firefox / WebKit + mobile emulation (Pixel 5, iPhone 12)
Coverage: c8 — 100% statements/branches/functions/lines (dist via source maps)

## Benchmarks

How it was run: `npm run bench`
Environment: Node v22.14.0 (win32 x64)
Results:

| Benchmark          | Result                             |
| ------------------ | ---------------------------------- |
| fromPRF            | 5,224 ops/s (0.191 ms/op, 200 ops) |
| generateCredential | 5,825 ops/s (0.172 ms/op, 50 ops)  |

Results vary by machine.

## License

Apache
