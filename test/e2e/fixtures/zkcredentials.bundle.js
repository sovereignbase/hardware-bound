'use strict'
var HardwareBoundBundle = (() => {
  var __defProp = Object.defineProperty
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor
  var __getOwnPropNames = Object.getOwnPropertyNames
  var __hasOwnProp = Object.prototype.hasOwnProperty
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true })
  }
  var __copyProps = (to, from, except, desc) => {
    if ((from && typeof from === 'object') || typeof from === 'function') {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          })
    }
    return to
  }
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, '__esModule', { value: true }), mod)

  // test/e2e/fixtures/entry.js
  var entry_exports = {}
  __export(entry_exports, {
    createDeviceBinding: () => createDeviceBinding,
    deriveDeviceEntropy: () => deriveDeviceEntropy,
  })

  // node_modules/@sovereignbase/bytecodec/dist/index.js
  var BytecodecError = class extends Error {
    /**
     * Machine-readable error code for programmatic handling.
     */
    code
    /**
     * Creates a new bytecodec error with a package-prefixed message.
     *
     * @param code Stable error code describing the failure category.
     * @param message Optional human-readable detail appended to the package prefix.
     */
    constructor(code, message) {
      const detail = message ?? code
      super(`{@sovereignbase/bytecodec} ${detail}`)
      this.code = code
      this.name = 'BytecodecError'
    }
  }
  var textEncoder =
    typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
  var textDecoder =
    typeof TextDecoder !== 'undefined' ? new TextDecoder() : null
  var HEX_PAIRS = Array.from({ length: 256 }, (_, value) =>
    value.toString(16).padStart(2, '0')
  )
  var HEX_VALUES = (() => {
    const table = new Int16Array(128).fill(-1)
    for (let index = 0; index < 10; index++)
      table['0'.charCodeAt(0) + index] = index
    for (let index = 0; index < 6; index++) {
      table['A'.charCodeAt(0) + index] = index + 10
      table['a'.charCodeAt(0) + index] = index + 10
    }
    return table
  })()
  var Z85_CHARS =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#'
  var Z85_VALUES = (() => {
    const table = new Int16Array(128).fill(-1)
    for (let i = 0; i < Z85_CHARS.length; i++) {
      table[Z85_CHARS.charCodeAt(i)] = i
    }
    return table
  })()
  function fromString(text) {
    if (typeof text !== 'string')
      throw new BytecodecError(
        'STRING_INPUT_EXPECTED',
        'fromString expects a string input'
      )
    if (textEncoder) return textEncoder.encode(text)
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
      return new Uint8Array(Buffer.from(text, 'utf8'))
    throw new BytecodecError(
      'UTF8_ENCODER_UNAVAILABLE',
      'No UTF-8 encoder available in this environment.'
    )
  }
  function toUint8Array(input) {
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input.slice(0))
    }
    if (
      typeof SharedArrayBuffer !== 'undefined' &&
      input instanceof SharedArrayBuffer
    ) {
      return new Uint8Array(input).slice()
    }
    if (ArrayBuffer.isView(input)) {
      const view = new Uint8Array(
        input.buffer,
        input.byteOffset,
        input.byteLength
      )
      return new Uint8Array(view)
    }
    if (Array.isArray(input)) {
      return new Uint8Array(input)
    }
    throw new BytecodecError(
      'BYTE_SOURCE_EXPECTED',
      'Expected a Uint8Array, ArrayBuffer, SharedArrayBuffer, ArrayBufferView, or number[]'
    )
  }
  function toBufferSource(bytes) {
    return toUint8Array(bytes)
  }
  function concat(sources) {
    if (!Array.isArray(sources))
      throw new BytecodecError(
        'CONCAT_INVALID_INPUT',
        'concat expects an array of ByteSource items'
      )
    if (sources.length === 0) return new Uint8Array(0)
    const arrays = sources.map((source, index) => {
      try {
        return toUint8Array(source)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new BytecodecError(
          'CONCAT_NORMALIZE_FAILED',
          `concat failed to normalize input at index ${index}: ${message}`
        )
      }
    })
    const totalLength = arrays.reduce((sum, array) => sum + array.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const array of arrays) {
      if (array.length === 0) continue
      result.set(array, offset)
      offset += array.length
    }
    return result
  }

  // dist/index.js
  var timeout = 6e4
  var mediation = 'required'
  var userVerification = 'required'
  var prfInput1 = toBufferSource(
    fromString('INFO:ENTROPY_FROM_FIRST_PRF_RESULT')
  )
  var prfInput2 = toBufferSource(
    fromString('INFO:ENTROPY_FROM_SECOND_PRF_RESULT')
  )
  async function createDeviceBinding(usersDisplayName, signal) {
    const publicKey = {
      rp: { id: window.location.hostname, name: window.location.host },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: usersDisplayName,
        displayName: usersDisplayName,
      },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification,
      },
      timeout,
      attestation: 'none',
      extensions: {
        prf: {
          eval: {
            first: prfInput1,
            second: prfInput2,
          },
        },
      },
    }
    try {
      await navigator.credentials.create({ publicKey, signal })
      return true
    } catch {
      return false
    }
  }
  async function deriveDeviceEntropy(signal) {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          rpId: window.location.hostname,
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [],
          userVerification,
          timeout,
          extensions: {
            prf: {
              eval: {
                first: prfInput1,
                second: prfInput2,
              },
            },
          },
        },
        mediation,
        signal,
      })
      credential.response.clientDataJSON
      const rawId = credential.rawId
      if (rawId) {
        const prf = credential.getClientExtensionResults().prf
        if (prf && prf?.results) {
          const { first, second } = prf.results
          if (first && second) {
            return concat([rawId, first, second])
          }
        }
      }
      return false
    } catch {
      return false
    }
  }
  return __toCommonJS(entry_exports)
})()
