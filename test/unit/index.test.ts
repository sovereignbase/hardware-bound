import { expect, test } from 'vitest'
import { createDeviceBinding, deriveDeviceEntropy } from '../../dist/index.js'

test('dist index exports browser helpers', () => {
  expect(createDeviceBinding).toBeTypeOf('function')
  expect(deriveDeviceEntropy).toBeTypeOf('function')
})
