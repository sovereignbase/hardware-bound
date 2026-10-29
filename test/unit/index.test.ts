import { expect, test } from 'vitest'
import { createRequire } from 'node:module'
import * as hardwareBound from '../../dist/index.js'

const require = createRequire(import.meta.url)

test.each([
  ['ESM', hardwareBound],
  ['CommonJS', require('../../dist/index.cjs') as typeof hardwareBound],
])('%s package exports the browser API', (_, api) => {
  expect(Object.keys(api).sort()).toEqual([
    'accessDeviceBinding',
    'createDeviceBinding',
    'invalidateDeviceBinding',
  ])
  expect(api.createDeviceBinding).toBeTypeOf('function')
  expect(api.accessDeviceBinding).toBeTypeOf('function')
  expect(api.invalidateDeviceBinding).toBeTypeOf('function')
})
