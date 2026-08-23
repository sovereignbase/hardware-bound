import { webcrypto } from 'node:crypto'
import { afterEach, expect, test } from 'vitest'
import { createDeviceBinding, deriveDeviceEntropy } from '../../dist/index.js'

type GlobalName = 'crypto' | 'navigator' | 'window'
type CreateImplementation = (
  options: CredentialCreationOptions
) => Promise<unknown>
type GetImplementation = (options: CredentialRequestOptions) => Promise<unknown>
type SetupOptions = {
  createImpl?: CreateImplementation
  getImpl?: GetImplementation
}

const snapshot = {
  crypto: Object.getOwnPropertyDescriptor(globalThis, 'crypto'),
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
}

const makeBytes = (size: number, seed = 1): Uint8Array => {
  const bytes = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) {
    bytes[index] = (seed + index) & 0xff
  }
  return bytes
}

const setGlobal = (name: GlobalName, value: unknown): void => {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

const restoreGlobal = (
  name: GlobalName,
  descriptor: PropertyDescriptor | undefined
): void => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
    return
  }

  delete (globalThis as Partial<Record<GlobalName, unknown>>)[name]
}

const restoreGlobals = () => {
  restoreGlobal('crypto', snapshot.crypto)
  restoreGlobal('navigator', snapshot.navigator)
  restoreGlobal('window', snapshot.window)
}

const setupEnv = ({ createImpl, getImpl }: SetupOptions = {}) => {
  setGlobal('crypto', webcrypto)
  setGlobal('window', {
    location: { hostname: 'hardware.test', host: 'hardware.test' },
  })

  const state: {
    lastCreateOptions: CredentialCreationOptions | null
    lastGetOptions: CredentialRequestOptions | null
  } = {
    lastCreateOptions: null,
    lastGetOptions: null,
  }

  setGlobal('navigator', {
    credentials: {
      create: async (options: CredentialCreationOptions) => {
        state.lastCreateOptions = options
        if (createImpl) return createImpl(options)
        return {
          type: 'public-key',
          response: {
            getAuthenticatorData() {
              const bytes = new Uint8Array(37)
              bytes[32] = 0x05
              return bytes.buffer
            },
          },
        }
      },
      get: async (options: CredentialRequestOptions) => {
        state.lastGetOptions = options
        if (getImpl) return getImpl(options)
        return {
          response: { clientDataJSON: new Uint8Array(0) },
          rawId: makeBytes(32, 11).buffer,
          getClientExtensionResults() {
            return {
              prf: {
                results: {
                  first: makeBytes(32, 111).buffer,
                  second: makeBytes(32, 211).buffer,
                },
              },
            }
          },
        }
      },
    },
  })

  return state
}

afterEach(() => {
  restoreGlobals()
})

test('createDeviceBinding returns device-bound storage and passes expected create options', async () => {
  const state = setupEnv()
  const controller = new AbortController()

  const result = await createDeviceBinding('Alice', controller.signal)

  expect(result).toEqual([true, 'device-bound'])

  const { publicKey, signal } = state.lastCreateOptions!
  const authenticatorSelection = publicKey!.authenticatorSelection!
  expect(signal).toBe(controller.signal)
  expect(publicKey!.rp.id).toBe('hardware.test')
  expect(publicKey!.rp.name).toBe('hardware.test')
  expect(publicKey!.user.name).toBe('Alice')
  expect(publicKey!.user.displayName).toBe('Alice')
  expect(publicKey!.user.id.byteLength).toBe(32)
  expect(publicKey!.challenge.byteLength).toBe(32)
  expect(publicKey!.pubKeyCredParams.map((item) => item.alg)).toEqual([
    -7, -257,
  ])
  expect(authenticatorSelection.authenticatorAttachment).toBe('platform')
  expect(authenticatorSelection.residentKey).toBe('required')
  expect(authenticatorSelection.userVerification).toBe('required')
  expect(publicKey!.timeout).toBe(60_000)
  expect(publicKey!.attestation).toBe('none')
  expect(publicKey!.extensions!.prf!.eval!.first.byteLength).toBeGreaterThan(0)
  expect(publicKey!.extensions!.prf!.eval!.second!.byteLength).toBeGreaterThan(
    0
  )
})

test('createDeviceBinding returns synced storage', async () => {
  setupEnv({
    createImpl: async () => ({
      response: {
        getAuthenticatorData() {
          const bytes = new Uint8Array(37)
          bytes[32] = 0x1d
          return bytes.buffer
        },
      },
    }),
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'synced'])
})

test('createDeviceBinding returns sync-eligible storage', async () => {
  setupEnv({
    createImpl: async () => ({
      response: {
        getAuthenticatorData() {
          const bytes = new Uint8Array(37)
          bytes[32] = 0x0d
          return bytes.buffer
        },
      },
    }),
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'sync-eligible'])
})

test('createDeviceBinding returns unknown storage when authenticator data is unavailable', async () => {
  setupEnv({ createImpl: async () => ({ response: {} }) })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'unknown'])
})

test('createDeviceBinding returns unknown storage when authenticator data is malformed', async () => {
  setupEnv({
    createImpl: async () => ({
      response: {
        getAuthenticatorData() {
          throw new TypeError('malformed authenticator data')
        },
      },
    }),
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'unknown'])
})

test('createDeviceBinding returns unknown storage when authenticator data is too short', async () => {
  setupEnv({
    createImpl: async () => ({
      response: {
        getAuthenticatorData: () => new Uint8Array(32).buffer,
      },
    }),
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'unknown'])
})

test('createDeviceBinding returns unknown storage for inconsistent backup flags', async () => {
  setupEnv({
    createImpl: async () => ({
      response: {
        getAuthenticatorData() {
          const bytes = new Uint8Array(37)
          bytes[32] = 0x15
          return bytes.buffer
        },
      },
    }),
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([true, 'unknown'])
})

test('createDeviceBinding returns failure pair when creation returns null', async () => {
  setupEnv({ createImpl: async () => null })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([false, 'unknown'])
})

test('createDeviceBinding returns failure pair when navigator.credentials.create throws', async () => {
  setupEnv({
    createImpl: async () => {
      throw new Error('boom')
    },
  })

  const result = await createDeviceBinding('Alice')

  expect(result).toEqual([false, 'unknown'])
})

test('deriveDeviceEntropy returns concatenated rawId and PRF bytes', async () => {
  const state = setupEnv()
  const controller = new AbortController()

  const result = await deriveDeviceEntropy(controller.signal)

  expect(result).toBeInstanceOf(Uint8Array)
  if (result === false) return
  expect(Array.from(result)).toEqual(
    Array.from([
      ...makeBytes(32, 11),
      ...makeBytes(32, 111),
      ...makeBytes(32, 211),
    ])
  )

  const { publicKey, mediation, signal } = state.lastGetOptions!
  expect(signal).toBe(controller.signal)
  expect(mediation).toBe('required')
  expect(publicKey!.rpId).toBe('hardware.test')
  expect(publicKey!.allowCredentials).toHaveLength(0)
  expect(publicKey!.userVerification).toBe('required')
  expect(publicKey!.timeout).toBe(60_000)
  expect(publicKey!.challenge.byteLength).toBe(32)
  expect(publicKey!.extensions!.prf!.eval!.first.byteLength).toBeGreaterThan(0)
  expect(publicKey!.extensions!.prf!.eval!.second!.byteLength).toBeGreaterThan(
    0
  )
})

test('deriveDeviceEntropy returns false when rawId is missing', async () => {
  setupEnv({
    getImpl: async () => ({
      response: { clientDataJSON: new Uint8Array(0) },
      rawId: null,
      getClientExtensionResults() {
        return {
          prf: {
            results: {
              first: makeBytes(32, 111).buffer,
              second: makeBytes(32, 211).buffer,
            },
          },
        }
      },
    }),
  })

  const result = await deriveDeviceEntropy()

  expect(result).toBe(false)
})

test('deriveDeviceEntropy returns false when PRF results are missing', async () => {
  setupEnv({
    getImpl: async () => ({
      response: { clientDataJSON: new Uint8Array(0) },
      rawId: makeBytes(32, 11).buffer,
      getClientExtensionResults() {
        return {}
      },
    }),
  })

  const result = await deriveDeviceEntropy()

  expect(result).toBe(false)
})

test('deriveDeviceEntropy returns false when PRF result is incomplete', async () => {
  setupEnv({
    getImpl: async () => ({
      response: { clientDataJSON: new Uint8Array(0) },
      rawId: makeBytes(32, 11).buffer,
      getClientExtensionResults() {
        return {
          prf: {
            results: {
              first: makeBytes(32, 111).buffer,
            },
          },
        }
      },
    }),
  })

  const result = await deriveDeviceEntropy()

  expect(result).toBe(false)
})

test('deriveDeviceEntropy returns false when navigator.credentials.get throws', async () => {
  setupEnv({
    getImpl: async () => {
      throw new Error('boom')
    },
  })

  const result = await deriveDeviceEntropy()

  expect(result).toBe(false)
})
