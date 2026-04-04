import test from 'node:test'
import assert from 'node:assert/strict'
import { createDeviceBinding, deriveDeviceEntropy } from '../../dist/index.js'

test('dist index exports browser helpers', () => {
  assert.equal(typeof createDeviceBinding, 'function')
  assert.equal(typeof deriveDeviceEntropy, 'function')
})
