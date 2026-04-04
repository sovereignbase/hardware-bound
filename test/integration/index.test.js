import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { createDeviceBinding, deriveDeviceEntropy } from '../../dist/index.js'

const snapshot = {
  crypto: Object.getOwnPropertyDescriptor(globalThis, 'crypto'),
  navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
}

const makeBytes = (size, seed = 1) => {
  const bytes = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) {
    bytes[index] = (seed + index) & 0xff
  }
  return bytes
}

const setGlobal = (name, value) => {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

const restoreGlobal = (name, descriptor) => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
    return
  }

  delete globalThis[name]
}

const restoreGlobals = () => {
  restoreGlobal('crypto', snapshot.crypto)
  restoreGlobal('navigator', snapshot.navigator)
  restoreGlobal('window', snapshot.window)
}

const setupEnv = ({ createImpl, getImpl } = {}) => {
  setGlobal('crypto', webcrypto)
  setGlobal('window', {
    location: { hostname: 'hardware.test', host: 'hardware.test' },
  })

  const state = {
    lastCreateOptions: null,
    lastGetOptions: null,
  }

  setGlobal('navigator', {
    credentials: {
      create: async (options) => {
        state.lastCreateOptions = options
        if (createImpl) return createImpl(options)
        return { type: 'public-key' }
      },
      get: async (options) => {
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

test.afterEach(() => {
  restoreGlobals()
})

test('createDeviceBinding returns true and passes expected create options', async () => {
  const state = setupEnv()
  const controller = new AbortController()

  const ok = await createDeviceBinding('Alice', controller.signal)

  assert.equal(ok, true)

  const { publicKey, signal } = state.lastCreateOptions
  assert.equal(signal, controller.signal)
  assert.equal(publicKey.rp.id, 'hardware.test')
  assert.equal(publicKey.rp.name, 'hardware.test')
  assert.equal(publicKey.user.name, 'Alice')
  assert.equal(publicKey.user.displayName, 'Alice')
  assert.equal(publicKey.user.id.byteLength ?? publicKey.user.id.length, 32)
  assert.equal(publicKey.challenge.byteLength ?? publicKey.challenge.length, 32)
  assert.deepEqual(
    publicKey.pubKeyCredParams.map((item) => item.alg),
    [-7, -257]
  )
  assert.equal(
    publicKey.authenticatorSelection.authenticatorAttachment,
    'platform'
  )
  assert.equal(publicKey.authenticatorSelection.residentKey, 'required')
  assert.equal(publicKey.authenticatorSelection.userVerification, 'required')
  assert.equal(publicKey.timeout, 60_000)
  assert.equal(publicKey.attestation, 'none')
  assert.ok(publicKey.extensions.prf.eval.first.byteLength > 0)
  assert.ok(publicKey.extensions.prf.eval.second.byteLength > 0)
})

test('createDeviceBinding returns false when navigator.credentials.create throws', async () => {
  setupEnv({
    createImpl: async () => {
      throw new Error('boom')
    },
  })

  const ok = await createDeviceBinding('Alice')

  assert.equal(ok, false)
})

test('deriveDeviceEntropy returns concatenated rawId and PRF bytes', async () => {
  const state = setupEnv()
  const controller = new AbortController()

  const result = await deriveDeviceEntropy(controller.signal)

  assert.ok(result instanceof Uint8Array)
  assert.deepEqual(
    Array.from(result),
    Array.from([
      ...makeBytes(32, 11),
      ...makeBytes(32, 111),
      ...makeBytes(32, 211),
    ])
  )

  const { publicKey, mediation, signal } = state.lastGetOptions
  assert.equal(signal, controller.signal)
  assert.equal(mediation, 'required')
  assert.equal(publicKey.rpId, 'hardware.test')
  assert.equal(publicKey.allowCredentials.length, 0)
  assert.equal(publicKey.userVerification, 'required')
  assert.equal(publicKey.timeout, 60_000)
  assert.ok(publicKey.challenge.byteLength ?? publicKey.challenge.length)
  assert.ok(publicKey.extensions.prf.eval.first.byteLength > 0)
  assert.ok(publicKey.extensions.prf.eval.second.byteLength > 0)
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

  assert.equal(result, false)
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

  assert.equal(result, false)
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

  assert.equal(result, false)
})

test('deriveDeviceEntropy returns false when navigator.credentials.get throws', async () => {
  setupEnv({
    getImpl: async () => {
      throw new Error('boom')
    },
  })

  const result = await deriveDeviceEntropy()

  assert.equal(result, false)
})
