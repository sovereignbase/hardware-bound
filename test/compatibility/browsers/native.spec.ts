import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openNativePage(
  page: Page,
  options: {
    hasPrf?: boolean
    defaultBackupEligibility?: boolean
    defaultBackupState?: boolean
  } = {}
) {
  const session = await page.context().newCDPSession(page)
  await session.send('WebAuthn.enable', { enableUI: false })
  const { authenticatorId } = await session.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        ctap2Version: 'ctap2_1',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
        hasPrf: true,
        ...options,
      },
    }
  )
  await page.goto('http://localhost:4173')
  const native = await page.evaluate(() => ({
    create: navigator.credentials.create.toString().includes('[native code]'),
    get: navigator.credentials.get.toString().includes('[native code]'),
  }))
  expect(native).toEqual({ create: true, get: true })
  return { session, authenticatorId }
}

test('native WebAuthn creates, accesses and invalidates a PRF binding', async ({
  page,
}) => {
  const { session, authenticatorId } = await openNativePage(page)
  const result = await page.evaluate(async () => {
    const created = await hardwareBound.createDeviceBinding(
      'Native test',
      AbortSignal.timeout(5000)
    )
    if (!created) throw new Error('Expected a native PRF binding')
    const first = await hardwareBound.accessDeviceBinding(
      created[0],
      AbortSignal.timeout(5000)
    )
    const second = await hardwareBound.accessDeviceBinding(
      undefined,
      AbortSignal.timeout(5000)
    )
    if (!first || !second) throw new Error('Expected a native PRF binding')
    await hardwareBound.invalidateDeviceBinding(first[0])
    return {
      created,
      first: [first[0], Array.from(first[1])],
      second: [second[0], Array.from(second[1])],
      entropyLength: first[1].length,
    }
  })
  expect(result.created).toEqual([result.first[0], 'non-extractable'])
  expect(result.entropyLength).toBe(96)
  expect(result.first).toEqual(result.second)
  const { credentials } = await session.send('WebAuthn.getCredentials', {
    authenticatorId,
  })
  expect(credentials).toHaveLength(0)
})

for (const [eligible, backedUp, storage] of [
  [false, false, 'non-extractable'],
  [true, false, 'sync-eligible'],
  [true, true, 'synced'],
] as const) {
  test(`native WebAuthn reports ${storage} storage`, async ({ page }) => {
    await openNativePage(page, {
      defaultBackupEligibility: eligible,
      defaultBackupState: backedUp,
    })
    expect(
      await page.evaluate(() =>
        hardwareBound.createDeviceBinding(
          'Storage test',
          AbortSignal.timeout(5000)
        )
      )
    ).toEqual([expect.any(String), storage])
  })
}

test('native WebAuthn rejects and invalidates a credential without PRF', async ({
  page,
}) => {
  const { session, authenticatorId } = await openNativePage(page, {
    hasPrf: false,
  })
  expect(
    await page.evaluate(() =>
      hardwareBound.createDeviceBinding('No PRF', AbortSignal.timeout(5000))
    )
  ).toBe(false)
  const { credentials } = await session.send('WebAuthn.getCredentials', {
    authenticatorId,
  })
  expect(credentials).toHaveLength(0)
})

test('native WebAuthn respects cancelled credential requests', async ({
  page,
}) => {
  const { session, authenticatorId } = await openNativePage(page)
  const result = await page.evaluate(async () => {
    const controller = new AbortController()
    controller.abort()
    return {
      created: await hardwareBound.createDeviceBinding(
        'Cancelled',
        controller.signal
      ),
      accessed: await hardwareBound.accessDeviceBinding(
        undefined,
        controller.signal
      ),
    }
  })
  expect(result).toEqual({ created: false, accessed: false })
  const { credentials } = await session.send('WebAuthn.getCredentials', {
    authenticatorId,
  })
  expect(credentials).toHaveLength(0)
})

test('native WebAuthn selects the requested binding among multiple credentials', async ({
  page,
}) => {
  await openNativePage(page)
  const result = await page.evaluate(async () => {
    const first = await hardwareBound.createDeviceBinding(
      'First binding',
      AbortSignal.timeout(5000)
    )
    const second = await hardwareBound.createDeviceBinding(
      'Second binding',
      AbortSignal.timeout(5000)
    )
    if (!first || !second) throw new Error('Expected two native PRF bindings')
    const selected = await hardwareBound.accessDeviceBinding(
      second[0],
      AbortSignal.timeout(5000)
    )
    const other = await hardwareBound.accessDeviceBinding(
      first[0],
      AbortSignal.timeout(5000)
    )
    const repeated = await hardwareBound.accessDeviceBinding(
      second[0],
      AbortSignal.timeout(5000)
    )
    if (!selected || !other || !repeated)
      throw new Error('Expected access to the requested bindings')
    const missing = await hardwareBound.accessDeviceBinding(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      AbortSignal.timeout(1000)
    )
    return {
      firstId: first[0],
      secondId: second[0],
      selected: [selected[0], Array.from(selected[1])],
      other: [other[0], Array.from(other[1])],
      repeated: [repeated[0], Array.from(repeated[1])],
      missing,
    }
  })
  expect(result.firstId).not.toBe(result.secondId)
  expect(result.selected[0]).toBe(result.secondId)
  expect(result.other[0]).toBe(result.firstId)
  expect(result.repeated).toEqual(result.selected)
  expect(result.other[1]).not.toEqual(result.selected[1])
  expect(result.missing).toBe(false)
})
