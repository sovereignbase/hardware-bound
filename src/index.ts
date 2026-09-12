import { Bytes } from '@sovereignbase/bytecodec'
import type { DeviceBindingStorage } from './.types/DeviceBindingStorage/type.js'

export type { DeviceBindingStorage } from './.types/DeviceBindingStorage/type.js'

const timeout = 60_000
const mediation: CredentialRequestOptions['mediation'] = 'required'
const userVerification: AuthenticatorSelectionCriteria['userVerification'] =
  'required'

const prfInput1: BufferSource = Bytes.utf8.decode(
  'INFO:ENTROPY_FROM_FIRST_PRF_RESULT'
) as BufferSource

const prfInput2: BufferSource = Bytes.utf8.decode(
  'INFO:ENTROPY_FROM_SECOND_PRF_RESULT'
) as BufferSource

/**
 * Creates a device-bound credential for the current origin.
 *
 * The created credential is configured for a platform authenticator, requires
 * user verification, and evaluates two fixed PRF inputs that can later be used
 * to derive deterministic entropy with {@link deriveDeviceEntropy}.
 *
 * @param credentialName Human-readable name stored in the created credential.
 * @param signal An optional abort signal that can be used to cancel the request.
 * @returns A promise that resolves to a pair containing the creation status and
 * the credential storage signal. Failures return `[false, 'unknown']`.
 */
export async function createDeviceBinding(
  credentialName: string,
  signal?: AbortSignal
): Promise<[created: boolean, storage: DeviceBindingStorage]> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    rp: { id: window.location.hostname, name: window.location.host },
    user: {
      id: crypto.getRandomValues(new Uint8Array(32)),
      name: credentialName,
      displayName: credentialName,
    },
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: userVerification,
    },
    timeout: timeout,
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

  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({
      publicKey,
      signal,
    })) as PublicKeyCredential | null
  } catch {
    return [false, 'unknown']
  }

  if (!credential) return [false, 'unknown']

  try {
    const response = credential.response as AuthenticatorAttestationResponse
    if (!response || typeof response.getAuthenticatorData !== 'function') {
      return [true, 'unknown']
    }

    const authenticatorData = new Uint8Array(response.getAuthenticatorData())
    if (authenticatorData.length < 33) return [true, 'unknown']

    const flags = authenticatorData[32]
    const backupEligible = (flags & 0x08) !== 0
    const backedUp = (flags & 0x10) !== 0

    if (!backupEligible && backedUp) return [true, 'unknown']
    if (!backupEligible) return [true, 'device-bound']
    return [true, backedUp ? 'synced' : 'sync-eligible']
  } catch {
    return [true, 'unknown']
  }
}

/**
 * Derives deterministic entropy bytes from an existing device-bound credential.
 *
 * The returned value is the concatenation of the credential raw identifier and
 * the two PRF outputs requested by this library. This function returns `false`
 * when no suitable credential is available or when entropy derivation fails.
 *
 * @param signal An optional abort signal that can be used to cancel the request.
 * @returns A promise that resolves to the derived entropy bytes, or `false` if
 * derivation is unavailable or fails.
 */
export async function deriveDeviceEntropy(
  signal?: AbortSignal
): Promise<Uint8Array | false> {
  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        rpId: window.location.hostname,
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [],
        userVerification: userVerification,
        timeout: timeout,
        extensions: {
          prf: {
            eval: {
              first: prfInput1,
              second: prfInput2,
            },
          },
        },
      },
      mediation: mediation,
      signal,
    })) as PublicKeyCredential
    credential.response.clientDataJSON
    const rawId = credential.rawId
    if (rawId) {
      const prf = credential.getClientExtensionResults().prf
      if (prf && prf?.results) {
        const { first, second } = prf.results
        if (first && second) {
          return Bytes.concat([rawId, first, second])
        }
      }
    }
    return false
  } catch {
    return false
  }
}
