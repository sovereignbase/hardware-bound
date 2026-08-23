[![npm version](https://img.shields.io/npm/v/@sovereignbase/hardware-bound)](https://www.npmjs.com/package/@sovereignbase/hardware-bound)
[![JSR](https://jsr.io/badges/@sovereignbase/hardware-bound)](https://jsr.io/@sovereignbase/hardware-bound)
[![CI](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/hardware-bound/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/hardware-bound)
[![license](https://img.shields.io/npm/l/@sovereignbase/hardware-bound)](LICENSE)

# hardware-bound

Creates a device-bound browser credential and derives stable entropy bytes from it so local-first and zero-knowledge apps can bootstrap cryptographic state without storing their own seed material.

The public API is intentionally tiny:

- `createDeviceBinding(credentialName)`
- `deriveDeviceEntropy()`

## Installation

```sh
npm install @sovereignbase/hardware-bound
# or
pnpm add @sovereignbase/hardware-bound
# or
yarn add @sovereignbase/hardware-bound
# or
bun add @sovereignbase/hardware-bound
# or
deno add jsr:@sovereignbase/hardware-bound
# or
vlt install jsr:@sovereignbase/hardware-bound
```

## Usage

```js
import {
  createDeviceBinding,
  deriveDeviceEntropy,
} from '@sovereignbase/hardware-bound'

const [created, storage] = await createDeviceBinding('Ada Lovelace')
if (!created) throw new Error('Device binding failed')

console.log(storage)

const entropy = await deriveDeviceEntropy()
if (!entropy) throw new Error('Entropy derivation failed')

console.log(entropy)
```

## API

### `createDeviceBinding(credentialName, signal?)`

Creates a device binding for the current origin and returns a pair:

```ts
[created: boolean, storage: DeviceBindingStorage]
```

`storage` is one of:

- `device-bound`: the authenticator reports a single-device credential that is
  not eligible for backup.
- `sync-eligible`: the credential is eligible for backup but is not currently
  reported as backed up.
- `synced`: the credential is eligible for backup and currently reported as
  backed up.
- `unknown`: the browser did not expose usable authenticator data, the flags
  were inconsistent, or creation failed.

The storage signal describes WebAuthn credential backup eligibility and state.
It does not attest whether key material is protected by software, a TEE, or a
secure element.

### `deriveDeviceEntropy(signal?)`

Derives deterministic entropy bytes from the existing device binding and returns either:

- `Uint8Array`
- `false`

The returned bytes are:

1. credential `rawId`
2. first PRF output
3. second PRF output

## Behavior

- No storage.
- No network.
- No thrown library errors from the two exported functions. Failure is `false`.
- Intended as bootstrap material for local cryptographic state, not as a general authentication library.

## Tests

- Unit and integration tests in Vitest.
- Browser tests in Playwright.
- Browser matrix: Chromium, Firefox, WebKit, Pixel 5 emulation, iPhone 12 emulation.

## License

Apache-2.0
