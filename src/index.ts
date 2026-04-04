import { concat, fromString, toBufferSource } from '@sovereignbase/bytecodec'

const timeout = 60_000
const mediation: CredentialRequestOptions['mediation'] = 'required'
const userVerification: AuthenticatorSelectionCriteria['userVerification'] =
  'required'

const prfInput1: BufferSource = toBufferSource(
  fromString('INFO:ENTROPY_FROM_FIRST_PRF_RESULT')
)
const prfInput2: BufferSource = toBufferSource(
  fromString('INFO:ENTROPY_FROM_SECOND_PRF_RESULT')
)

export async function createDeviceBinding(
  usersDisplayName: string,
  signal?: AbortSignal
): Promise<boolean> {
  const publicKey: PublicKeyCredentialCreationOptions = {
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

  try {
    await navigator.credentials.create({ publicKey, signal })
    return true
  } catch {
    return false
  }
}

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
          return concat([rawId, first, second])
        }
      }
    }
    return false
  } catch {
    return false
  }
}
