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
  ).toBe(false)

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

test('restricts access to the requested credential', async ({
  context,
  page,
}) => {
  const first = await context.credentials.create('127.0.0.1')
  const selected = await context.credentials.create('127.0.0.1')

  expect(
    await page.evaluate(
      (id) => hardwareBound.accessDeviceBinding(id),
      selected.id
    )
  ).toBe(false)
  expect(await context.credentials.get({ id: first.id })).toEqual([first])
  expect(await context.credentials.get({ id: selected.id })).toEqual([
    { ...selected, signCount: 1 },
  ])
})

test('does not fall back to another credential when the requested ID is unavailable', async ({
  context,
  page,
}) => {
  const missing = await context.credentials.create('127.0.0.1')
  const available = await context.credentials.create('127.0.0.1')
  await context.credentials.delete(missing.id)

  expect(
    await page.evaluate(
      (id) => hardwareBound.accessDeviceBinding(id),
      missing.id
    )
  ).toBe(false)
  expect(await context.credentials.get()).toEqual([available])
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
