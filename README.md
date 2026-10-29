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

const [created, bindingStorage] = await createDeviceBinding('Ada Lovelace')
if (!created) throw new Error('Device binding creation failed')

console.log(bindingStorage)

const binding = await accessDeviceBinding()
if (!binding) throw new Error('Device binding access failed')

const [credentialId, entropy] = binding

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
): Promise<[created: boolean, bindingStorage: DeviceBindingStorage]>
```

**Parameters**

- `credentialName`: The display name assigned to the credential.
- `signal`: An optional `AbortSignal` used to cancel the operation.

**Returns**

A tuple containing the creation status and binding storage characteristics.

`bindingStorage` is one of:

- `non-extractable`: The credential is not eligible for backup or synchronization.
- `sync-eligible`: The credential is eligible for backup but has not been backed up.
- `synced`: The credential has been backed up and may be available on other devices.
- `unknown`: The credential's storage characteristics could not be determined.

The storage classification reflects the credential's reported backup state, not whether its private key is hardware-protected.

Returns `[false, 'unknown']` if credential creation fails or the required PRF functionality is unavailable.

### `accessDeviceBinding(signal?)`

Accesses an existing device binding.

```ts
accessDeviceBinding(
  signal?: AbortSignal
): Promise<DeviceBinding | false>
```

**Parameters**

- `signal`: An optional `AbortSignal` used to cancel the operation.

**Returns**

A tuple containing the credential identifier and its associated entropy:

```ts
type DeviceBinding = [id: string, entropy: Uint8Array]
```

- `id`: The Base64URL-encoded credential identifier.
- `entropy`: Stable entropy bytes associated with the credential.

The entropy consists of the concatenation of:

1. The credential's raw identifier.
2. The first PRF output.
3. The second PRF output.

Accessing the same credential with the same PRF inputs produces the same entropy, allowing applications to reconstruct cryptographic state without persisting the entropy themselves.

Returns `false` if the credential cannot be accessed or the required PRF outputs are unavailable.

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

## License

Apache-2.0
