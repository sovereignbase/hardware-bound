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
    const first = await hardwareBound.accessDeviceBinding(
      AbortSignal.timeout(5000)
    )
    const second = await hardwareBound.accessDeviceBinding(
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
  expect(result.created).toEqual([true, 'non-extractable'])
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
    ).toEqual([true, storage])
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
  ).toEqual([false, 'unknown'])
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
      accessed: await hardwareBound.accessDeviceBinding(controller.signal),
    }
  })
  expect(result).toEqual({ created: [false, 'unknown'], accessed: false })
  const { credentials } = await session.send('WebAuthn.getCredentials', {
    authenticatorId,
  })
  expect(credentials).toHaveLength(0)
})
