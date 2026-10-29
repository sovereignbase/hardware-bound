import { expect, test } from 'vitest'
import { DeviceBoundError } from '../../src/errors/class.js'
import { unknownError } from '../../src/errors/unkown.js'

test('DeviceBoundError defaults its message to the machine-readable code', () => {
  const error = new DeviceBoundError('UNKNOWN_ERROR')
  expect(error).toBeInstanceOf(Error)
  expect(error.name).toBe('DeviceBoundError')
  expect(error.code).toBe('UNKNOWN_ERROR')
  expect(error.message).toBe('{@sovereignbase/hardware-bound} UNKNOWN_ERROR')
  expect(error.cause).toBeUndefined()
})

test('DeviceBoundError preserves the supplied message and cause', () => {
  const cause = new TypeError('Invalid credential')
  const error = new DeviceBoundError('UNKNOWN_ERROR', 'Access failed', {
    cause,
  })
  expect(error.message).toBe('{@sovereignbase/hardware-bound} Access failed')
  expect(error.cause).toBe(cause)
})

test('DeviceBoundError preserves an explicitly empty message', () => {
  expect(new DeviceBoundError('UNKNOWN_ERROR', '').message).toBe(
    '{@sovereignbase/hardware-bound} '
  )
})

test.each([new Error('Original failure'), 'failure', undefined, null])(
  'unknownError wraps an arbitrary cause: %j',
  (cause) => {
    const error = unknownError(cause, 'operation')
    expect(error).toBeInstanceOf(DeviceBoundError)
    expect(error.code).toBe('UNKNOWN_ERROR')
    expect(error.message).toBe(
      '{@sovereignbase/hardware-bound} operation failed.'
    )
    expect(error.cause).toBe(cause)
  }
)

test('unknownError preserves an existing DeviceBoundError instance', () => {
  const original = new DeviceBoundError('UNKNOWN_ERROR', 'Original failure')
  expect(unknownError(original, 'operation')).toBe(original)
})
