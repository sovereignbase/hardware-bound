[![npm version](https://img.shields.io/npm/v/@sovereignbase/hardware-bound)](https://www.npmjs.com/package/@sovereignbase/hardware-bound)
[![CI](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/hardware-bound/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/hardware-bound)
[![license](https://img.shields.io/npm/l/@sovereignbase/hardware-bound)](LICENSE)

# hardware-bound

Browser-first WebAuthn helpers for creating a device binding and deriving deterministic entropy from a platform credential PRF. The package keeps the surface intentionally small: bind once with `createDeviceBinding()` and later recover entropy bytes with `deriveDeviceEntropy()`.

## Compatibility

- Runtimes: browsers only for real use; Node is supported for tests with mocked browser globals; workers and edge runtimes are not supported because WebAuthn credential APIs are window-bound.
- Module format: ESM and CJS.
- Required globals / APIs: `window`, `navigator.credentials`, `crypto.getRandomValues`, and a browser or authenticator that supports the WebAuthn PRF extension for real hardware-backed flows.
- TypeScript: bundled types.

## Goals

- Provide a very small browser API for hardware-bound entropy flows.
- Reuse WebAuthn PRF outputs instead of inventing custom device identifiers.
- Stay side-effect free and easy to bundle.
- Return plain values (`true` / `false` / `Uint8Array`) without framework coupling.

## Installation

```sh
npm install @sovereignbase/hardware-bound
# or
pnpm add @sovereignbase/hardware-bound
# or
yarn add @sovereignbase/hardware-bound
```

## Usage

```js
import {
  createDeviceBinding,
  deriveDeviceEntropy,
} from '@sovereignbase/hardware-bound'

const created = await createDeviceBinding('Ada Lovelace')
if (!created) {
  throw new Error('Device binding was cancelled or is unsupported')
}

const entropy = await deriveDeviceEntropy()
if (!entropy) {
  throw new Error('Entropy derivation failed')
}

console.log(entropy)
```

## API

### `createDeviceBinding(usersDisplayName, signal?)`

Creates a platform WebAuthn credential for the current origin, requests resident key storage, and asks the authenticator to evaluate two fixed PRF inputs. Returns `true` when the browser finishes credential creation and `false` when the flow is cancelled, blocked, or unsupported.

### `deriveDeviceEntropy(signal?)`

Requests the previously created credential with the same PRF inputs and returns a `Uint8Array` containing:

1. the credential `rawId`
2. the first PRF result
3. the second PRF result

Returns `false` when credential discovery fails, PRF results are unavailable, or the browser rejects the request.

## Runtime behavior

### Browsers

The library uses `navigator.credentials.create()` and `navigator.credentials.get()` against `window.location.hostname`. In real deployments, successful entropy derivation depends on browser and authenticator support for the WebAuthn PRF extension.

### Node / tests

Node execution is only practical with mocked `window`, `navigator`, and `crypto` objects. The included automated tests do exactly that for coverage and browser contract verification.

### Failure model

Both exported functions are intentionally non-throwing. They collapse unsupported, cancelled, and malformed credential flows to `false`, which makes them easy to compose into application-specific retry or fallback logic.

## Tests

- Suite: Node unit tests, Node integration tests, and Playwright browser tests.
- Matrix: Chromium, Firefox, WebKit, Pixel 5 emulation, and iPhone 12 emulation.
- Coverage: `c8` with 100% statements, branches, functions, and lines for `dist/**/*.js`.
- Notes: browser tests stub `navigator.credentials` so the API contract is exercised consistently across engines without requiring physical authenticator hardware in CI.

## Development

```sh
npm run build
npm test
node in-browser-testing-build.js
```

## License

Apache-2.0
