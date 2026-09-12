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

  // node_modules/@sovereignbase/bytecodec/dist/util-RpyYklz7.js
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
      super(`{@sovereignbase/bytecodec} ${message ?? code}`)
      this.code = code
      this.name = 'BytecodecError'
    }
  }
  function concatBytes(sources) {
    if (!Array.isArray(sources))
      throw new BytecodecError(
        'CONCAT_INVALID_INPUT',
        'concatBytes expects an array of ByteSource items'
      )
    if (sources.length === 0) return /* @__PURE__ */ new Uint8Array(0)
    const arrays = sources.map((source, index) => {
      try {
        return normalizeBytes(source)
      } catch (error) {
        throw new BytecodecError(
          'CONCAT_NORMALIZE_FAILED',
          `concatBytes failed to normalize input at index ${index}: ${error instanceof Error ? error.message : String(error)}`
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
  function equalBytes(x, y) {
    const a = normalizeBytes(x)
    const b = normalizeBytes(y)
    if (a.byteLength !== b.byteLength) return false
    let diff = 0
    for (let index = 0; index < a.length; index++) diff |= a[index] ^ b[index]
    return diff === 0
  }
  function normalizeBytes(input) {
    if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0))
    if (
      typeof SharedArrayBuffer !== 'undefined' &&
      input instanceof SharedArrayBuffer
    )
      return new Uint8Array(input).slice()
    if (ArrayBuffer.isView(input)) {
      const view = new Uint8Array(
        input.buffer,
        input.byteOffset,
        input.byteLength
      )
      return new Uint8Array(view)
    }
    if (Array.isArray(input)) return new Uint8Array(input)
    throw new BytecodecError(
      'BYTE_SOURCE_EXPECTED',
      'Expected a Uint8Array, ArrayBuffer, SharedArrayBuffer, ArrayBufferView, or number[]'
    )
  }
  var ikm
  async function deriveBytes(base, domain, byteLength) {
    if (!ikm)
      ikm = await crypto.subtle.importKey(
        'raw',
        new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        'HKDF',
        false,
        ['deriveBits']
      )
    return normalizeBytes(
      await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: normalizeBytes(base),
          info: normalizeBytes(domain),
        },
        ikm,
        byteLength * 8
      )
    )
  }
  function generateBytes(byteLength) {
    const buffer = new Uint8Array(byteLength)
    crypto.getRandomValues(buffer)
    return buffer
  }

  // node_modules/@sovereignbase/bytecodec/dist/base45/index.js
  var base45Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
  var base45Values
  function bytesToBase45String(bytes) {
    const view = normalizeBytes(bytes)
    let base45String = ''
    for (let offset = 0; offset + 1 < view.length; offset += 2) {
      let value = view[offset] * 256 + view[offset + 1]
      base45String += base45Chars[value % 45]
      value = Math.floor(value / 45)
      base45String += base45Chars[value % 45]
      base45String += base45Chars[Math.floor(value / 45)]
    }
    if (view.length % 2 === 1) {
      const value = view[view.length - 1]
      base45String += base45Chars[value % 45]
      base45String += base45Chars[Math.floor(value / 45)]
    }
    return base45String
  }
  function bytesFromBase45String(base45String) {
    if (typeof base45String !== 'string')
      throw new BytecodecError(
        'BASE45_INPUT_EXPECTED',
        'bytesFromBase45String expects a string input'
      )
    if (base45String.length % 3 === 1)
      throw new BytecodecError(
        'BASE45_INVALID_LENGTH',
        'Base45 string length must not leave a trailing single character'
      )
    const bytes = new Uint8Array(
      Math.floor(base45String.length / 3) * 2 +
        (base45String.length % 3 === 2 ? 1 : 0)
    )
    let byteOffset = 0
    for (let stringOffset = 0; stringOffset < base45String.length;) {
      const remaining = base45String.length - stringOffset
      const digit0 = toBase45Digit(base45String, stringOffset)
      const digit1 = toBase45Digit(base45String, stringOffset + 1)
      if (remaining === 2) {
        const value2 = digit0 + digit1 * 45
        if (value2 > 255)
          throw new BytecodecError(
            'BASE45_INVALID_CHUNK',
            `Invalid base45 chunk at index ${stringOffset}`
          )
        bytes[byteOffset++] = value2
        stringOffset += 2
        continue
      }
      const digit2 = toBase45Digit(base45String, stringOffset + 2)
      const value = digit0 + digit1 * 45 + digit2 * 2025
      if (value > 65535)
        throw new BytecodecError(
          'BASE45_INVALID_CHUNK',
          `Invalid base45 chunk at index ${stringOffset}`
        )
      bytes[byteOffset++] = value >>> 8
      bytes[byteOffset++] = value & 255
      stringOffset += 3
    }
    return bytes
  }
  function toBase45Digit(base45String, stringOffset) {
    if (!base45Values) base45Values = prepareBase45Values()
    const code = base45String.charCodeAt(stringOffset)
    const digit = code < 128 ? base45Values[code] : -1
    if (digit === -1)
      throw new BytecodecError(
        'BASE45_INVALID_CHARACTER',
        `Invalid base45 character at index ${stringOffset}`
      )
    return digit
  }
  function prepareBase45Values() {
    const table = /* @__PURE__ */ new Int16Array(128).fill(-1)
    for (let i = 0; i < 45; i++) table[base45Chars.charCodeAt(i)] = i
    return table
  }

  // node_modules/@sovereignbase/bytecodec/dist/base64/index.js
  function bytesToBase64String(bytes) {
    const view = normalizeBytes(bytes)
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
      return Buffer.from(view).toString('base64')
    let binaryString = ''
    const chunkSize = 32768
    for (let offset = 0; offset < view.length; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, view.length)
      let chunkString = ''
      for (let index = offset; index < end; index++)
        chunkString += String.fromCharCode(view[index])
      binaryString += chunkString
    }
    if (typeof btoa !== 'function')
      throw new BytecodecError(
        'BASE64_ENCODER_UNAVAILABLE',
        'No base64 encoder available in this environment.'
      )
    return btoa(binaryString)
  }
  function bytesFromBase64String(base64String) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
      return new Uint8Array(Buffer.from(base64String, 'base64'))
    if (typeof atob !== 'function')
      throw new BytecodecError(
        'BASE64_DECODER_UNAVAILABLE',
        'No base64 decoder available in this environment.'
      )
    const binaryString = atob(base64String)
    const bytes = new Uint8Array(binaryString.length)
    for (let index = 0; index < binaryString.length; index++)
      bytes[index] = binaryString.charCodeAt(index)
    return bytes
  }
  function bytesFromBase64UrlString(base64UrlString) {
    return bytesFromBase64String(base64UrlbytesToBase64String(base64UrlString))
  }
  function bytesToBase64UrlString(bytes) {
    return bytesToBase64String(bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }
  function base64UrlbytesToBase64String(base64UrlString) {
    let base64String = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
    const mod = base64String.length & 3
    if (mod === 2) base64String += '=='
    else if (mod === 3) base64String += '='
    else if (mod !== 0)
      throw new BytecodecError(
        'BASE64URL_INVALID_LENGTH',
        'Invalid base64url length'
      )
    return base64String
  }

  // node_modules/@sovereignbase/bytecodec/dist/gzip-CyS4S98z.js
  function isNodeRuntime() {
    return typeof process !== 'undefined' && !!process.versions?.node
  }
  async function importNodeBuiltin(specifier) {
    return import(specifier)
  }
  async function bytesToGzipBytes(bytes) {
    const view = normalizeBytes(bytes)
    if (isNodeRuntime()) {
      const { gzip } = await importNodeBuiltin('node:zlib')
      const { promisify } = await importNodeBuiltin('node:util')
      const compressed = await promisify(gzip)(view)
      return normalizeBytes(compressed)
    }
    if (typeof CompressionStream === 'undefined')
      throw new BytecodecError(
        'GZIP_COMPRESSION_UNAVAILABLE',
        'gzip compression not available in this environment.'
      )
    return compressWithStream(view, 'gzip')
  }
  async function compressWithStream(bytes, format) {
    const compressedStream = new Blob([bytes])
      .stream()
      .pipeThrough(new CompressionStream(format))
    const arrayBuffer = await new Response(compressedStream).arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }
  async function bytesFromGzipBytes(bytes) {
    const view = normalizeBytes(bytes)
    if (isNodeRuntime()) {
      const { gunzip } = await importNodeBuiltin('node:zlib')
      const { promisify } = await importNodeBuiltin('node:util')
      const decompressed = await promisify(gunzip)(view)
      return normalizeBytes(decompressed)
    }
    if (typeof DecompressionStream === 'undefined')
      throw new BytecodecError(
        'GZIP_DECOMPRESSION_UNAVAILABLE',
        'gzip decompression not available in this environment.'
      )
    return decompressWithStream(view, 'gzip')
  }
  async function decompressWithStream(bytes, format) {
    const decompressedStream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream(format))
    const arrayBuffer = await new Response(decompressedStream).arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  // node_modules/@sovereignbase/bytecodec/dist/utf8/index.js
  var textEncoder
  var textDecoder
  function bytesToUTF8String(bytes) {
    const view = normalizeBytes(bytes)
    if (typeof TextDecoder !== 'undefined') {
      if (!textDecoder) textDecoder = new TextDecoder()
      return textDecoder.decode(view)
    }
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
      return Buffer.from(view).toString('utf8')
    throw new BytecodecError(
      'UTF8_DECODER_UNAVAILABLE',
      'No UTF-8 decoder available in this environment.'
    )
  }
  function bytesFromUTF8String(text) {
    if (typeof text !== 'string')
      throw new BytecodecError(
        'STRING_INPUT_EXPECTED',
        'bytesFromUTF8String expects a string input'
      )
    if (typeof TextEncoder !== 'undefined') {
      if (!textEncoder) textEncoder = new TextEncoder()
      return textEncoder.encode(text)
    }
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
      return new Uint8Array(Buffer.from(text, 'utf8'))
    throw new BytecodecError(
      'UTF8_ENCODER_UNAVAILABLE',
      'No UTF-8 encoder available in this environment.'
    )
  }

  // node_modules/@sovereignbase/bytecodec/dist/index.js
  var Bytes = class {
    static base45 = {
      encode: bytesToBase45String,
      decode: bytesFromBase45String,
    }
    static base64 = {
      encode: bytesToBase64String,
      decode: bytesFromBase64String,
    }
    static base64url = {
      encode: bytesToBase64UrlString,
      decode: bytesFromBase64UrlString,
    }
    static utf8 = {
      encode: bytesToUTF8String,
      decode: bytesFromUTF8String,
    }
    static gzip = {
      encode: bytesToGzipBytes,
      decode: bytesFromGzipBytes,
    }
    static concat(sources) {
      return concatBytes(sources)
    }
    static equals(a, b) {
      return equalBytes(a, b)
    }
    static derive(base, domain, byteLength) {
      return deriveBytes(base, domain, byteLength)
    }
    static generate(byteLength) {
      return generateBytes(byteLength)
    }
    static normalize(bytes) {
      return normalizeBytes(bytes)
    }
  }

  // dist/index.js
  var timeout = 6e4
  var mediation = 'required'
  var userVerification = 'required'
  var prfInput1 = Bytes.utf8.decode('INFO:ENTROPY_FROM_FIRST_PRF_RESULT')
  var prfInput2 = Bytes.utf8.decode('INFO:ENTROPY_FROM_SECOND_PRF_RESULT')
  async function createDeviceBinding(credentialName, signal) {
    const publicKey = {
      rp: {
        id: window.location.hostname,
        name: window.location.host,
      },
      user: {
        id: crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)),
        name: credentialName,
        displayName: credentialName,
      },
      challenge: crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)),
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7,
        },
        {
          type: 'public-key',
          alg: -257,
        },
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
    let credential
    try {
      credential = await navigator.credentials.create({
        publicKey,
        signal,
      })
    } catch {
      return [false, 'unknown']
    }
    if (!credential) return [false, 'unknown']
    try {
      const response = credential.response
      if (!response || typeof response.getAuthenticatorData !== 'function')
        return [true, 'unknown']
      const authenticatorData = new Uint8Array(response.getAuthenticatorData())
      if (authenticatorData.length < 33) return [true, 'unknown']
      const flags = authenticatorData[32]
      const backupEligible = (flags & 8) !== 0
      const backedUp = (flags & 16) !== 0
      if (!backupEligible && backedUp) return [true, 'unknown']
      if (!backupEligible) return [true, 'device-bound']
      return [true, backedUp ? 'synced' : 'sync-eligible']
    } catch {
      return [true, 'unknown']
    }
  }
  async function deriveDeviceEntropy(signal) {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          rpId: window.location.hostname,
          challenge: crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)),
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
          if (first && second) return Bytes.concat([rawId, first, second])
        }
      }
      return false
    } catch {
      return false
    }
  }
  return __toCommonJS(entry_exports)
})()
