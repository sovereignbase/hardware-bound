import { expect, test } from '@playwright/test'

declare global {
  var hardwareBound: typeof import('../../../dist/index.js')
}

test.beforeEach(async ({ context, page }) => {
  await context.credentials.install()
  await page.goto('/')
})

// Playwright currently returns no extension results. Successful PRF ceremonies
// are covered by native.spec.ts; detailed response and error cases use Vitest.
test('rejects a registered credential without PRF support', async ({
  context,
  page,
}) => {
  expect(
    await page.evaluate(() => hardwareBound.createDeviceBinding('Alice'))
  ).toEqual([false, 'unknown'])

  const credentials = await context.credentials.get()
  expect(credentials).toHaveLength(1)
  expect(credentials[0]).toMatchObject({ rpId: '127.0.0.1', signCount: 0 })
})

test('rejects assertions without PRF outputs on repeated access', async ({
  context,
  page,
}) => {
  const credential = await context.credentials.create('127.0.0.1')
  for (const signCount of [1, 2]) {
    expect(await page.evaluate(() => hardwareBound.accessDeviceBinding())).toBe(
      false
    )
    // The counter proves Playwright answered the request with the seeded key.
    expect(await context.credentials.get({ id: credential.id })).toEqual([
      { ...credential, signCount },
    ])
  }
})

for (const state of ['missing', 'different RP', 'deleted'] as const) {
  test(`returns false for a ${state} credential`, async ({ context, page }) => {
    if (state === 'different RP') {
      await context.credentials.create('other.example')
    } else if (state === 'deleted') {
      const credential = await context.credentials.create('127.0.0.1')
      await context.credentials.delete(credential.id)
    }

    expect(await page.evaluate(() => hardwareBound.accessDeviceBinding())).toBe(
      false
    )
    expect(await context.credentials.get({ rpId: '127.0.0.1' })).toHaveLength(0)
  })
}
