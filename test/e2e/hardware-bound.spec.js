import { expect, test } from '@playwright/test'

const installMocks = () => {
  const state = {
    lastCreateOptions: null,
    lastGetOptions: null,
    rawIdSeed: 7,
    prfFirstSeed: 101,
    prfSecondSeed: 151,
  }

  const makeBytes = (size, seed) => {
    const bytes = new Uint8Array(size)
    for (let index = 0; index < size; index += 1) {
      bytes[index] = (seed + index) & 0xff
    }
    return bytes
  }

  const create = async (options) => {
    state.lastCreateOptions = options
    return { type: 'public-key' }
  }

  const get = async (options) => {
    state.lastGetOptions = options
    return {
      response: { clientDataJSON: new Uint8Array(0) },
      rawId: makeBytes(32, state.rawIdSeed).buffer,
      getClientExtensionResults() {
        return {
          prf: {
            results: {
              first: makeBytes(32, state.prfFirstSeed).buffer,
              second: makeBytes(32, state.prfSecondSeed).buffer,
            },
          },
        }
      },
    }
  }

  if (navigator.credentials) {
    Object.defineProperty(navigator.credentials, 'create', {
      value: create,
      configurable: true,
    })
    Object.defineProperty(navigator.credentials, 'get', {
      value: get,
      configurable: true,
    })
  } else {
    Object.defineProperty(navigator, 'credentials', {
      value: { create, get },
      configurable: true,
    })
  }

  globalThis.__hardwareBoundState = state
}

const makeBytes = (size, seed) => {
  const bytes = []
  for (let index = 0; index < size; index += 1) {
    bytes.push((seed + index) & 0xff)
  }
  return bytes
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMocks)
  await page.goto('/')
})

test('createDeviceBinding works in browsers', async ({ page }) => {
  const ok = await page.evaluate(async () => {
    return globalThis.hardwareBound.createDeviceBinding('Alice')
  })

  expect(ok).toBe(true)

  const details = await page.evaluate(() => {
    const { publicKey } = globalThis.__hardwareBoundState.lastCreateOptions
    return {
      rpId: publicKey.rp.id,
      rpName: publicKey.rp.name,
      userName: publicKey.user.name,
      userDisplayName: publicKey.user.displayName,
      userIdLength: publicKey.user.id.byteLength ?? publicKey.user.id.length,
      challengeLength:
        publicKey.challenge.byteLength ?? publicKey.challenge.length,
      attachment: publicKey.authenticatorSelection.authenticatorAttachment,
      residentKey: publicKey.authenticatorSelection.residentKey,
      userVerification: publicKey.authenticatorSelection.userVerification,
      timeout: publicKey.timeout,
      attestation: publicKey.attestation,
      algs: publicKey.pubKeyCredParams.map((item) => item.alg),
      prfFirstLength: publicKey.extensions?.prf?.eval?.first?.byteLength ?? 0,
      prfSecondLength: publicKey.extensions?.prf?.eval?.second?.byteLength ?? 0,
    }
  })

  expect(details.rpId).toBeTruthy()
  expect(details.rpName).toBeTruthy()
  expect(details.userName).toBe('Alice')
  expect(details.userDisplayName).toBe('Alice')
  expect(details.userIdLength).toBe(32)
  expect(details.challengeLength).toBe(32)
  expect(details.attachment).toBe('platform')
  expect(details.residentKey).toBe('required')
  expect(details.userVerification).toBe('required')
  expect(details.timeout).toBe(60_000)
  expect(details.attestation).toBe('none')
  expect(details.algs).toEqual([-7, -257])
  expect(details.prfFirstLength).toBeGreaterThan(0)
  expect(details.prfSecondLength).toBeGreaterThan(0)
})

test('deriveDeviceEntropy works in browsers', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const bytes = await globalThis.hardwareBound.deriveDeviceEntropy()
    return Array.from(bytes)
  })

  expect(result).toEqual([
    ...makeBytes(32, 7),
    ...makeBytes(32, 101),
    ...makeBytes(32, 151),
  ])

  const details = await page.evaluate(() => {
    const state = globalThis.__hardwareBoundState
    const { publicKey } = state.lastGetOptions
    return {
      rpId: publicKey.rpId,
      allowCredentialsLength: publicKey.allowCredentials.length,
      userVerification: publicKey.userVerification,
      timeout: publicKey.timeout,
      mediation: state.lastGetOptions.mediation,
      prfFirstLength: publicKey.extensions?.prf?.eval?.first?.byteLength ?? 0,
      prfSecondLength: publicKey.extensions?.prf?.eval?.second?.byteLength ?? 0,
    }
  })

  expect(details.rpId).toBeTruthy()
  expect(details.allowCredentialsLength).toBe(0)
  expect(details.userVerification).toBe('required')
  expect(details.timeout).toBe(60_000)
  expect(details.mediation).toBe('required')
  expect(details.prfFirstLength).toBeGreaterThan(0)
  expect(details.prfSecondLength).toBeGreaterThan(0)
})
