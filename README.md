[![npm version](https://img.shields.io/npm/v/@sovereignbase/hardware-bound)](https://www.npmjs.com/package/@sovereignbase/hardware-bound)
[![JSR](https://jsr.io/badges/@sovereignbase/hardware-bound)](https://jsr.io/@sovereignbase/hardware-bound)
[![CI](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/hardware-bound/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/hardware-bound/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/hardware-bound)
[![license](https://img.shields.io/npm/l/@sovereignbase/hardware-bound)](LICENSE)

# hardware-bound

Creates a device-bound browser credential and provides access to stable entropy upon user authentication, enabling reliable reconstruction of the same cryptographic state locally.

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

```ts
import {
  createDeviceBinding,
  accessDeviceBinding,
  invalidateDeviceBinding,
} from '@sovereignbase/hardware-bound'

const created = await createDeviceBinding('Ada Lovelace')
if (!created) throw new Error('Device binding creation failed')

const [credentialId, bindingStorage] = created
console.log(bindingStorage)

const binding = await accessDeviceBinding(credentialId)
if (!binding) throw new Error('Device binding access failed')

const [, entropy] = binding

console.log(credentialId, entropy)

// When the credential is no longer accepted:
// await invalidateDeviceBinding(credentialId)
```

## API

### `createDeviceBinding(credentialName, signal?)`

Creates a device binding for the current origin.

```ts
createDeviceBinding(
  credentialName: string,
  signal?: AbortSignal
): Promise<false | [credentialId: string, bindingStorage: DeviceBindingStorage]>
```

**Parameters**

- `credentialName`: The display name assigned to the credential.
- `signal`: An optional `AbortSignal` used to cancel the operation.

**Returns**

A tuple containing the Base64URL-encoded credential identifier and binding storage characteristics, or `false` if creation fails.

`bindingStorage` is one of:

- `non-extractable`: The credential is not eligible for backup or synchronization.
- `sync-eligible`: The credential is eligible for backup but has not been backed up.
- `synced`: The credential has been backed up and may be available on other devices.
- `unknown`: The credential's storage characteristics could not be determined.

The storage classification reflects the credential's reported backup state, not whether its private key is hardware-protected.

Returns `false` if credential creation fails or the required PRF functionality is unavailable.

### `accessDeviceBinding(credentialId?, signal?)`

Accesses an existing device binding.

```ts
accessDeviceBinding(
  credentialId?: string,
  signal?: AbortSignal
): Promise<false | [credentialId: string, entropy: Uint8Array]>
```

**Parameters**

- `credentialId`: An optional Base64URL-encoded credential identifier. When provided, only that credential can be selected. When omitted, the browser can select an available discoverable credential for the current origin.
- `signal`: An optional `AbortSignal` used to cancel the operation.

**Returns**

A tuple containing the credential identifier and its associated entropy, or `false` if access fails.

- `credentialId`: The Base64URL-encoded credential identifier.
- `entropy`: Stable entropy bytes associated with the credential.

The entropy consists of the concatenation of:

1. The credential's raw identifier.
2. The first PRF output.
3. The second PRF output.

Accessing the same credential with the same PRF inputs produces the same entropy, allowing applications to reconstruct cryptographic state without persisting the entropy themselves.

Returns `false` if the credential cannot be accessed or the required PRF outputs are unavailable.
If the requested credential is unavailable, access does not fall back to another credential.

### `invalidateDeviceBinding(credentialId)`

Requests invalidation of an existing device binding.

```ts
invalidateDeviceBinding(
  credentialId: string
): Promise<void>
```

**Parameters**

- `credentialId`: The Base64URL-encoded identifier of the credential to invalidate.

**Returns**

A promise that resolves when the invalidation request completes.

Invalidation is best-effort. The browser or credential provider may remove or hide the credential, but successful completion does not guarantee deletion.

## Behavior

- **User verification:** Credential creation and access require user verification.
- **Stable entropy:** Repeated access to the same credential provides consistent entropy for reconstructing local cryptographic state.
- **Offline-capable:** No application-level network requests are required. Offline access depends on the credential being locally available.
- **No application storage:** The library does not persist credentials or entropy in browser storage.
- **Error handling:** Credential creation and access return failure values for unsuccessful credential requests. Unexpected failures are wrapped in `DeviceBoundError` with the `UNKNOWN_ERROR` code and the original cause.
- **Scope:** Intended for bootstrapping local cryptographic state, not as a general-purpose authentication library.

## Tests

Vitest: 57 passed, 0 failed, 0 skipped, 0 todo. Result: passed.

### Coverage

| Statements | Branches | Functions | Lines |
| ---------- | -------- | --------- | ----- |
| 100%       | 100%     | 100%      | 100%  |

### Browser wrapper tests

| Browser                             | Result | Passed | Failed | Flaky | Skipped |
| ----------------------------------- | ------ | ------ | ------ | ----- | ------- |
| Chromium                            | Passed | 7      | 0      | 0     | 0       |
| Firefox                             | Passed | 7      | 0      | 0     | 0       |
| WebKit                              | Passed | 7      | 0      | 0     | 0       |
| Mobile Chrome (Pixel 5 emulation)   | Passed | 7      | 0      | 0     | 0       |
| Mobile Safari (iPhone 12 emulation) | Passed | 7      | 0      | 0     | 0       |

### Native WebAuthn and PRF

| Browser                             | Result  | Passed | Failed | Flaky | Skipped |
| ----------------------------------- | ------- | ------ | ------ | ----- | ------- |
| Chromium                            | Passed  | 7      | 0      | 0     | 0       |
| Firefox                             | Not run | 0      | 0      | 0     | 0       |
| WebKit                              | Not run | 0      | 0      | 0     | 0       |
| Mobile Chrome (Pixel 5 emulation)   | Passed  | 7      | 0      | 0     | 0       |
| Mobile Safari (iPhone 12 emulation) | Not run | 0      | 0      | 0     | 0       |

Wrapper tests use Playwright’s `context.credentials` mock, which currently returns no PRF extension results. They verify rejection of credentials without PRF support and unavailable credentials. Successful PRF operations use native browser virtual authenticators with automatic user verification.

Native tests currently cover Chromium. “Not run” describes automated test coverage, not browser support. Mobile projects use device emulation.

## License

Apache-2.0
