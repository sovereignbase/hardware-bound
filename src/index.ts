import { Bytes } from '@sovereignbase/bytecodec'
import { unknownError } from './errors/unkown.js'

/**
 * Describes the storage characteristics of a device binding.
 */
export type DeviceBindingStorage =
  /** The credential is not eligible for backup or synchronization. */
  | 'non-extractable'
  /** The credential is eligible for backup but has not been backed up. */
  | 'sync-eligible'
  /** The credential has been backed up and may be available on other devices. */
  | 'synced'
  /** The credential's storage characteristics could not be determined. */
  | 'unknown'

const timeout = 60_000
const mediation: CredentialRequestOptions['mediation'] = 'required'
const userVerification: AuthenticatorSelectionCriteria['userVerification'] =
  'required'

const first: BufferSource = Bytes.utf8.decode(
  'INFO:ENTROPY_FROM_FIRST_PRF_RESULT'
) as BufferSource

const second: BufferSource = Bytes.utf8.decode(
  'INFO:ENTROPY_FROM_SECOND_PRF_RESULT'
) as BufferSource

/**
 * Creates a device binding for the current origin.
 *
 * @param credentialName The display name assigned to the credential.
 * @param signal An optional signal used to abort the operation.
 * @returns The credential identifier and binding storage characteristics,
 * or `false` if creation fails.
 */
export async function createDeviceBinding(
  credentialName: string,
  signal?: AbortSignal
): Promise<
  false | [credentialId: string, bindingStorage: DeviceBindingStorage]
> {
  try {
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
        userVerification,
      },
      timeout,
      attestation: 'none',
      extensions: {
        prf: {
          eval: {
            first,
            second,
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
      return false
    }

    if (!credential) return false

    if (credential.getClientExtensionResults().prf?.enabled !== true) {
      try {
        void (await invalidateDeviceBinding(credential.id))
      } catch {
        // Credential removal is best-effort.
      }
      return false
    }

    try {
      const response = credential.response as AuthenticatorAttestationResponse
      if (!response || typeof response.getAuthenticatorData !== 'function') {
        return [credential.id, 'unknown']
      }

      const authenticatorData = new Uint8Array(response.getAuthenticatorData())
      if (authenticatorData.length < 33) return [credential.id, 'unknown']

      const flags = authenticatorData[32]
      const backupEligible = (flags & 0x08) !== 0
      const backedUp = (flags & 0x10) !== 0

      if (!backupEligible && backedUp) return [credential.id, 'unknown']
      if (!backupEligible) return [credential.id, 'non-extractable']
      return [credential.id, backedUp ? 'synced' : 'sync-eligible']
    } catch {
      return [credential.id, 'unknown']
    }
  } catch (cause) {
    throw unknownError(cause, 'DeviceBound.createDeviceBinding()')
  }
}

/**
 * Accesses an existing device binding.
 *
 * @param credentialId An optional credential identifier used to restrict credential selection.
 * @param signal An optional signal used to abort the operation.
 * @returns The credential identifier and associated entropy, or `false`
 * if the binding cannot be accessed.
 */
export async function accessDeviceBinding(
  credentialId?: string,
  signal?: AbortSignal
): Promise<false | [credentialId: string, entropy: Uint8Array]> {
  try {
    let credential: PublicKeyCredential | null
    try {
      credential = (await navigator.credentials.get({
        publicKey: {
          rpId: window.location.hostname,
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials:
            typeof credentialId === 'string'
              ? [
                  {
                    id: Bytes.base64url.decode(credentialId) as BufferSource,
                    type: 'public-key',
                  },
                ]
              : [],
          userVerification,
          timeout,
          extensions: {
            prf: {
              eval: {
                first,
                second,
              },
            },
          },
        },
        mediation,
        signal,
      })) as PublicKeyCredential | null
    } catch {
      return false
    }

    if (!credential) return false

    const rawId = credential.rawId
    if (rawId) {
      const prf = credential.getClientExtensionResults().prf
      if (prf?.results) {
        const { first, second } = prf.results
        if (first && second) {
          return [credential.id, Bytes.concat([rawId, first, second])]
        }
      }
    }

    return false
  } catch (cause) {
    throw unknownError(cause, 'DeviceBound.accessDeviceBinding()')
  }
}

/**
 * Requests invalidation of a device binding.
 *
 * Invalidation does not guarantee removal of the credential.
 *
 * @param credentialId The identifier of the credential to invalidate.
 * @returns A promise that resolves when the request completes.
 */
export async function invalidateDeviceBinding(
  credentialId: string
): Promise<void> {
  try {
    return void (await PublicKeyCredential.signalUnknownCredential({
      rpId: window.location.hostname,
      credentialId,
    }))
  } catch (cause) {
    throw unknownError(cause, 'DeviceBound.invalidateDeviceBinding()')
  }
}
