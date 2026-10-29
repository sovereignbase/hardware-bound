import { expect, test } from '@playwright/test'
import type { DeviceBindingStorage } from '../../../dist/index.js'

type MockState = {
  lastCreateOptions: CredentialCreationOptions | null
  lastGetOptions: CredentialRequestOptions | null
  lastSignalOptions: UnknownCredentialOptions | null
  flags: number
  prfEnabled: boolean
  prfResults: boolean
  createResult: 'credential' | 'null' | 'reject'
  getResult: 'credential' | 'null' | 'reject'
  signalRejects: boolean
  extensionsThrow: boolean
}

declare global {
  var hardwareBound: typeof import('../../../dist/index.js')
  var __hardwareBoundState: MockState
}

// This function is serialized into each browser and must be self-contained.
const installMocks = (): void => {
  const state: MockState = {
    lastCreateOptions: null,
    lastGetOptions: null,
    lastSignalOptions: null,
    flags: 0x05,
    prfEnabled: true,
    prfResults: true,
    createResult: 'credential',
    getResult: 'credential',
    signalRejects: false,
    extensionsThrow: false,
  }

  const makeBytes = (seed: number): ArrayBuffer =>
    Uint8Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff).buffer

  const extensions = (): AuthenticationExtensionsClientOutputs => {
    if (state.extensionsThrow) throw new TypeError('Invalid extension data')
    return {
      prf: {
        enabled: state.prfEnabled,
        results: state.prfResults
          ? { first: makeBytes(101), second: makeBytes(151) }
          : undefined,
      },
    }
  }

  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: {
      create: async (options: CredentialCreationOptions) => {
        state.lastCreateOptions = options
        if (state.createResult === 'reject' || options.signal?.aborted) {
          throw new DOMException('Creation cancelled', 'NotAllowedError')
        }
        if (state.createResult === 'null') return null
        return {
          id: 'credential-id',
          type: 'public-key',
          getClientExtensionResults: extensions,
          response: {
            getAuthenticatorData: () => {
              const bytes = new Uint8Array(37)
              bytes[32] = state.flags
              return bytes.buffer
            },
          },
        }
      },
      get: async (options: CredentialRequestOptions) => {
        state.lastGetOptions = options
        if (state.getResult === 'reject' || options.signal?.aborted) {
          throw new DOMException('Access cancelled', 'NotAllowedError')
        }
        if (state.getResult === 'null') return null
        return {
          id: 'credential-id',
          rawId: makeBytes(7),
          getClientExtensionResults: extensions,
        }
      },
    },
  })

  const signalUnknownCredential = async (options: UnknownCredentialOptions) => {
    state.lastSignalOptions = options
    if (state.signalRejects) throw new Error('Signal rejected')
  }
  if (typeof PublicKeyCredential === 'undefined') {
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      configurable: true,
      value: { signalUnknownCredential },
    })
  } else {
    Object.defineProperty(PublicKeyCredential, 'signalUnknownCredential', {
      configurable: true,
      value: signalUnknownCredential,
    })
  }
  globalThis.__hardwareBoundState = state
}

const makeBytes = (seed: number): number[] =>
  Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMocks)
  await page.goto('/')
})

test('creates a binding with the expected WebAuthn options', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const controller = new AbortController()
    const binding = await hardwareBound.createDeviceBinding(
      'Alice',
      controller.signal
    )
    const options = __hardwareBoundState.lastCreateOptions!
    const publicKey = options.publicKey!
    return {
      binding,
      signalPassed: options.signal === controller.signal,
      rp: publicKey.rp,
      userName: publicKey.user.name,
      displayName: publicKey.user.displayName,
      userIdLength: publicKey.user.id.byteLength,
      challengeLength: publicKey.challenge.byteLength,
      selection: publicKey.authenticatorSelection,
      timeout: publicKey.timeout,
      attestation: publicKey.attestation,
      algorithms: publicKey.pubKeyCredParams,
      prf: {
        first: new TextDecoder().decode(publicKey.extensions!.prf!.eval!.first),
        second: new TextDecoder().decode(
          publicKey.extensions!.prf!.eval!.second
        ),
      },
    }
  })
  expect(result).toEqual({
    binding: [true, 'non-extractable'],
    signalPassed: true,
    rp: { id: '127.0.0.1', name: '127.0.0.1:4173' },
    userName: 'Alice',
    displayName: 'Alice',
    userIdLength: 32,
    challengeLength: 32,
    selection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 60_000,
    attestation: 'none',
    algorithms: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    prf: {
      first: 'INFO:ENTROPY_FROM_FIRST_PRF_RESULT',
      second: 'INFO:ENTROPY_FROM_SECOND_PRF_RESULT',
    },
  })
})

const storageCases: [number, DeviceBindingStorage][] = [
  [0x05, 'non-extractable'],
  [0x0d, 'sync-eligible'],
  [0x1d, 'synced'],
  [0x15, 'unknown'],
]
for (const [flags, storage] of storageCases) {
  test(`reports ${storage} storage`, async ({ page }) => {
    const result = await page.evaluate(async (flags) => {
      __hardwareBoundState.flags = flags
      return hardwareBound.createDeviceBinding('Alice')
    }, flags)
    expect(result).toEqual([true, storage])
  })
}

test('accesses the binding ID and entropy with the expected WebAuthn options', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const controller = new AbortController()
    const binding = await hardwareBound.accessDeviceBinding(controller.signal)
    if (!binding) throw new Error('Expected a binding')
    const options = __hardwareBoundState.lastGetOptions!
    return {
      id: binding[0],
      entropy: Array.from(binding[1]),
      signalPassed: options.signal === controller.signal,
      mediation: options.mediation,
      rpId: options.publicKey!.rpId,
      allowCredentials: options.publicKey!.allowCredentials,
      userVerification: options.publicKey!.userVerification,
      timeout: options.publicKey!.timeout,
      challengeLength: options.publicKey!.challenge.byteLength,
      prf: {
        first: new TextDecoder().decode(
          options.publicKey!.extensions!.prf!.eval!.first
        ),
        second: new TextDecoder().decode(
          options.publicKey!.extensions!.prf!.eval!.second
        ),
      },
    }
  })
  expect(result).toEqual({
    id: 'credential-id',
    entropy: [...makeBytes(7), ...makeBytes(101), ...makeBytes(151)],
    signalPassed: true,
    mediation: 'required',
    rpId: '127.0.0.1',
    allowCredentials: [],
    userVerification: 'required',
    timeout: 60_000,
    challengeLength: 32,
    prf: {
      first: 'INFO:ENTROPY_FROM_FIRST_PRF_RESULT',
      second: 'INFO:ENTROPY_FROM_SECOND_PRF_RESULT',
    },
  })
})

test('returns stable entropy across repeated access', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const first = await hardwareBound.accessDeviceBinding()
    const second = await hardwareBound.accessDeviceBinding()
    if (!first || !second) throw new Error('Expected bindings')
    return {
      first: [first[0], Array.from(first[1])],
      second: [second[0], Array.from(second[1])],
    }
  })
  expect(result.first).toEqual(result.second)
})

for (const outcome of ['null', 'reject'] as const) {
  test(`handles ${outcome} credential responses`, async ({ page }) => {
    const result = await page.evaluate(async (outcome) => {
      __hardwareBoundState.createResult = outcome
      __hardwareBoundState.getResult = outcome
      return {
        created: await hardwareBound.createDeviceBinding('Alice'),
        accessed: await hardwareBound.accessDeviceBinding(),
      }
    }, outcome)
    expect(result).toEqual({ created: [false, 'unknown'], accessed: false })
  })
}

test('passes aborted signals through to the credential API', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const controller = new AbortController()
    controller.abort()
    return {
      created: await hardwareBound.createDeviceBinding(
        'Alice',
        controller.signal
      ),
      accessed: await hardwareBound.accessDeviceBinding(controller.signal),
      createAborted: __hardwareBoundState.lastCreateOptions!.signal!.aborted,
      getAborted: __hardwareBoundState.lastGetOptions!.signal!.aborted,
    }
  })
  expect(result).toEqual({
    created: [false, 'unknown'],
    accessed: false,
    createAborted: true,
    getAborted: true,
  })
})

test('invalidates credentials that do not enable PRF', async ({ page }) => {
  const result = await page.evaluate(async () => {
    __hardwareBoundState.prfEnabled = false
    return {
      created: await hardwareBound.createDeviceBinding('Alice'),
      signal: __hardwareBoundState.lastSignalOptions,
    }
  })
  expect(result).toEqual({
    created: [false, 'unknown'],
    signal: { rpId: '127.0.0.1', credentialId: 'credential-id' },
  })
})

test('handles unsuccessful best-effort credential invalidation', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    __hardwareBoundState.prfEnabled = false
    __hardwareBoundState.signalRejects = true
    return hardwareBound.createDeviceBinding('Alice')
  })
  expect(result).toEqual([false, 'unknown'])
})

test('returns false when the credential lacks PRF results', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    __hardwareBoundState.prfResults = false
    return hardwareBound.accessDeviceBinding()
  })
  expect(result).toBe(false)
})

test('signals credential invalidation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    await hardwareBound.invalidateDeviceBinding('credential-id')
    return __hardwareBoundState.lastSignalOptions
  })
  expect(result).toEqual({ rpId: '127.0.0.1', credentialId: 'credential-id' })
})

for (const operation of [
  'createDeviceBinding',
  'accessDeviceBinding',
  'invalidateDeviceBinding',
] as const) {
  test(`preserves error details for ${operation}`, async ({ page }) => {
    const result = await page.evaluate(async (operation) => {
      __hardwareBoundState.extensionsThrow = true
      __hardwareBoundState.signalRejects = true
      try {
        if (operation === 'createDeviceBinding')
          await hardwareBound.createDeviceBinding('Alice')
        else if (operation === 'accessDeviceBinding')
          await hardwareBound.accessDeviceBinding()
        else await hardwareBound.invalidateDeviceBinding('credential-id')
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error)) throw error
        return {
          name: error.name,
          code: error.code,
          message: error.message,
          cause: error.cause instanceof Error ? error.cause.message : null,
        }
      }
      throw new Error('Expected a library error')
    }, operation)
    expect(result).toEqual({
      name: 'DeviceBoundError',
      code: 'UNKNOWN_ERROR',
      message: `{@sovereignbase/hardware-bound} DeviceBound.${operation}() failed.`,
      cause:
        operation === 'invalidateDeviceBinding'
          ? 'Signal rejected'
          : 'Invalid extension data',
    })
  })
}
