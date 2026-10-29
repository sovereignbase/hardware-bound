import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  accessDeviceBinding,
  createDeviceBinding,
  invalidateDeviceBinding,
} from '../../src/index.js'
import { DeviceBoundError } from '../../src/errors/class.js'

type MockCredential = {
  id: string
  rawId: ArrayBuffer | null
  response?: { getAuthenticatorData?: () => ArrayBuffer } | null
  getClientExtensionResults: () => AuthenticationExtensionsClientOutputs
}

const makeBytes = (size: number, seed = 1): Uint8Array<ArrayBuffer> =>
  Uint8Array.from({ length: size }, (_, index) => (seed + index) & 0xff)

const authenticatorData = (flags: number, length = 37): ArrayBuffer => {
  const bytes = new Uint8Array(length)
  bytes[32] = flags
  return bytes.buffer
}

const credential = (): MockCredential => ({
  id: 'credential-id',
  rawId: makeBytes(32, 11).buffer,
  response: { getAuthenticatorData: () => authenticatorData(0x05) },
  getClientExtensionResults: () => ({
    prf: {
      enabled: true,
      results: {
        first: makeBytes(32, 111).buffer,
        second: makeBytes(32, 211).buffer,
      },
    },
  }),
})

let createdCredential: MockCredential
let accessedCredential: MockCredential

const create =
  vi.fn<
    (options: CredentialCreationOptions) => Promise<MockCredential | null>
  >()
const get =
  vi.fn<(options: CredentialRequestOptions) => Promise<MockCredential | null>>()
const signalUnknownCredential =
  vi.fn<(options: UnknownCredentialOptions) => Promise<void>>()

beforeEach(() => {
  createdCredential = credential()
  accessedCredential = credential()
  create.mockReset().mockImplementation(async () => createdCredential)
  get.mockReset().mockImplementation(async () => accessedCredential)
  signalUnknownCredential.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('window', {
    location: { hostname: 'hardware.test', host: 'hardware.test:4173' },
  })
  vi.stubGlobal('navigator', { credentials: { create, get } })
  vi.stubGlobal('PublicKeyCredential', { signalUnknownCredential })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createDeviceBinding', () => {
  test('creates a non-extractable binding with the expected WebAuthn options', async () => {
    const controller = new AbortController()

    await expect(
      createDeviceBinding('Alice', controller.signal)
    ).resolves.toEqual([createdCredential.id, 'non-extractable'])

    expect(create).toHaveBeenCalledOnce()
    const options = create.mock.calls[0]![0]
    expect(options.signal).toBe(controller.signal)
    expect(options.publicKey).toMatchObject({
      rp: { id: 'hardware.test', name: 'hardware.test:4173' },
      user: { name: 'Alice', displayName: 'Alice' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: 60_000,
      attestation: 'none',
    })
    expect(options.publicKey!.user.id.byteLength).toBe(32)
    expect(options.publicKey!.challenge.byteLength).toBe(32)
    expect(options.publicKey!.extensions!.prf!.eval).toEqual({
      first: new TextEncoder().encode('INFO:ENTROPY_FROM_FIRST_PRF_RESULT'),
      second: new TextEncoder().encode('INFO:ENTROPY_FROM_SECOND_PRF_RESULT'),
    })
    expect(signalUnknownCredential).not.toHaveBeenCalled()
  })

  test.each([
    [0x05, 'non-extractable'],
    [0x0d, 'sync-eligible'],
    [0x1d, 'synced'],
    [0x15, 'unknown'],
  ] as const)('interprets backup flags %i as %s', async (flags, storage) => {
    createdCredential.response = {
      getAuthenticatorData: () => authenticatorData(flags),
    }
    await expect(createDeviceBinding('Alice')).resolves.toEqual([
      createdCredential.id,
      storage,
    ])
    expect(create.mock.calls[0]![0].signal).toBeUndefined()
  })

  test.each([undefined, null, {}])(
    'returns unknown storage for an unavailable attestation response: %j',
    async (response) => {
      createdCredential.response = response
      await expect(createDeviceBinding('Alice')).resolves.toEqual([
        createdCredential.id,
        'unknown',
      ])
    }
  )

  test('returns unknown storage for truncated authenticator data', async () => {
    createdCredential.response = {
      getAuthenticatorData: () => authenticatorData(0x05, 32),
    }
    await expect(createDeviceBinding('Alice')).resolves.toEqual([
      createdCredential.id,
      'unknown',
    ])
  })

  test('returns unknown storage when the authenticator data reader throws', async () => {
    createdCredential.response = {
      getAuthenticatorData: () => {
        throw new TypeError('Malformed attestation')
      },
    }
    await expect(createDeviceBinding('Alice')).resolves.toEqual([
      createdCredential.id,
      'unknown',
    ])
  })

  test('returns false when creation returns null', async () => {
    create.mockResolvedValue(null)
    await expect(createDeviceBinding('Alice')).resolves.toBe(false)
    expect(signalUnknownCredential).not.toHaveBeenCalled()
  })

  test.each(['NotAllowedError', 'AbortError', 'NotSupportedError'])(
    'returns false when creation rejects with %s',
    async (name) => {
      create.mockRejectedValue(new DOMException('Creation failed', name))
      await expect(createDeviceBinding('Alice')).resolves.toBe(false)
    }
  )

  test.each([{}, { prf: {} }, { prf: { enabled: false } }])(
    'invalidates credentials without enabled PRF: %j',
    async (extensions) => {
      createdCredential.getClientExtensionResults = () => extensions
      await expect(createDeviceBinding('Alice')).resolves.toBe(false)
      expect(signalUnknownCredential).toHaveBeenCalledExactlyOnceWith({
        rpId: 'hardware.test',
        credentialId: 'credential-id',
      })
    }
  )

  test('returns false even when best-effort invalidation fails', async () => {
    createdCredential.getClientExtensionResults = () => ({})
    signalUnknownCredential.mockRejectedValue(new Error('Removal unavailable'))
    await expect(createDeviceBinding('Alice')).resolves.toBe(false)
    expect(signalUnknownCredential).toHaveBeenCalledOnce()
  })

  test('wraps unexpected setup failures with the operation and original cause', async () => {
    const cause = new Error('Randomness unavailable')
    vi.stubGlobal('crypto', {
      getRandomValues: () => {
        throw cause
      },
    })
    await expect(createDeviceBinding('Alice')).rejects.toMatchObject({
      name: 'DeviceBoundError',
      code: 'UNKNOWN_ERROR',
      message: expect.stringContaining(
        'DeviceBound.createDeviceBinding() failed.'
      ),
      cause,
    })
    expect(create).not.toHaveBeenCalled()
  })

  test('preserves an existing library error from extension processing', async () => {
    const cause = new DeviceBoundError('UNKNOWN_ERROR', 'Extension unavailable')
    createdCredential.getClientExtensionResults = () => {
      throw cause
    }
    await expect(createDeviceBinding('Alice')).rejects.toBe(cause)
  })
})

describe('accessDeviceBinding', () => {
  test('returns the credential ID and concatenated raw ID and PRF entropy', async () => {
    const controller = new AbortController()
    const result = await accessDeviceBinding(undefined, controller.signal)

    expect(result).toEqual([
      'credential-id',
      new Uint8Array([
        ...makeBytes(32, 11),
        ...makeBytes(32, 111),
        ...makeBytes(32, 211),
      ]),
    ])
    expect(get).toHaveBeenCalledOnce()
    const options = get.mock.calls[0]![0]
    expect(options.signal).toBe(controller.signal)
    expect(options).toMatchObject({
      mediation: 'required',
      publicKey: {
        rpId: 'hardware.test',
        allowCredentials: [],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    expect(options.publicKey!.challenge.byteLength).toBe(32)
    expect(options.publicKey!.extensions!.prf!.eval).toEqual({
      first: new TextEncoder().encode('INFO:ENTROPY_FROM_FIRST_PRF_RESULT'),
      second: new TextEncoder().encode('INFO:ENTROPY_FROM_SECOND_PRF_RESULT'),
    })
  })

  test('returns the same entropy on repeated access to the same credential', async () => {
    const first = await accessDeviceBinding()
    const second = await accessDeviceBinding()
    expect(first).not.toBe(false)
    expect(second).toEqual(first)
    expect(get.mock.calls[0]![0].signal).toBeUndefined()
    expect(get.mock.calls[0]![0].publicKey!.challenge).not.toEqual(
      get.mock.calls[1]![0].publicKey!.challenge
    )
  })

  test('restricts access to the decoded credential ID and forwards the abort signal', async () => {
    const id = '-_8A'
    const controller = new AbortController()
    accessedCredential.id = id

    await expect(accessDeviceBinding(id, controller.signal)).resolves.toEqual([
      id,
      expect.any(Uint8Array),
    ])
    expect(get).toHaveBeenCalledOnce()
    const options = get.mock.calls[0]![0]
    expect(options.signal).toBe(controller.signal)
    expect(options.publicKey!.allowCredentials).toEqual([
      { id: new Uint8Array([0xfb, 0xff, 0x00]), type: 'public-key' },
    ])
  })

  test('returns false when no credential is returned', async () => {
    get.mockResolvedValue(null)
    await expect(accessDeviceBinding()).resolves.toBe(false)
  })

  test('returns false when the raw credential ID is missing', async () => {
    accessedCredential.rawId = null
    const extensions = vi.fn(accessedCredential.getClientExtensionResults)
    accessedCredential.getClientExtensionResults = extensions
    await expect(accessDeviceBinding()).resolves.toBe(false)
    expect(extensions).not.toHaveBeenCalled()
  })

  test.each([
    {},
    { prf: {} },
    { prf: { results: { first: makeBytes(32).buffer } } },
  ])(
    'returns false for missing or incomplete PRF results: %j',
    async (extensions) => {
      accessedCredential.getClientExtensionResults = () => extensions
      await expect(accessDeviceBinding()).resolves.toBe(false)
    }
  )

  test('returns false when the first PRF result is absent', async () => {
    // A malformed browser response can violate the DOM type requiring first.
    accessedCredential.getClientExtensionResults = () =>
      ({
        prf: { results: { second: makeBytes(32).buffer } },
      }) as AuthenticationExtensionsClientOutputs
    await expect(accessDeviceBinding()).resolves.toBe(false)
  })

  test.each(['NotAllowedError', 'AbortError', 'NotSupportedError'])(
    'returns false when access rejects with %s',
    async (name) => {
      get.mockRejectedValue(new DOMException('Access failed', name))
      await expect(accessDeviceBinding()).resolves.toBe(false)
    }
  )

  test('returns false when the browser credential API is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    await expect(accessDeviceBinding()).resolves.toBe(false)
  })

  test('wraps unexpected extension failures with the original cause', async () => {
    const cause = new TypeError('Invalid extension data')
    accessedCredential.getClientExtensionResults = () => {
      throw cause
    }
    await expect(accessDeviceBinding()).rejects.toMatchObject({
      name: 'DeviceBoundError',
      code: 'UNKNOWN_ERROR',
      message: expect.stringContaining(
        'DeviceBound.accessDeviceBinding() failed.'
      ),
      cause,
    })
  })
})

describe('invalidateDeviceBinding', () => {
  test('signals the current relying party and credential ID', async () => {
    await expect(
      invalidateDeviceBinding('credential-id')
    ).resolves.toBeUndefined()
    expect(signalUnknownCredential).toHaveBeenCalledExactlyOnceWith({
      rpId: 'hardware.test',
      credentialId: 'credential-id',
    })
  })

  test('wraps invalidation failures with the operation and original cause', async () => {
    const cause = new Error('Signal rejected')
    signalUnknownCredential.mockRejectedValue(cause)
    await expect(
      invalidateDeviceBinding('credential-id')
    ).rejects.toMatchObject({
      name: 'DeviceBoundError',
      code: 'UNKNOWN_ERROR',
      message: expect.stringContaining(
        'DeviceBound.invalidateDeviceBinding() failed.'
      ),
      cause,
    })
  })

  test('wraps an unsupported signaling API', async () => {
    vi.stubGlobal('PublicKeyCredential', {})
    await expect(
      invalidateDeviceBinding('credential-id')
    ).rejects.toMatchObject({
      name: 'DeviceBoundError',
      code: 'UNKNOWN_ERROR',
      cause: expect.any(TypeError),
    })
  })
})
