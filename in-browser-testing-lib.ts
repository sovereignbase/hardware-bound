import { Bytes } from '@sovereignbase/bytecodec'
import * as hardware from './dist/index.js'
import type { DeviceBindingStorage } from './dist/index.js'

Object.assign(globalThis, { hardware })

const credentialNameInput = document.getElementById(
  'credential-name'
) as HTMLInputElement
const createButton = document.getElementById('create') as HTMLButtonElement
const deriveButton = document.getElementById('derive') as HTMLButtonElement
const status = document.getElementById('status') as HTMLParagraphElement
const bindingExplanation = document.getElementById(
  'binding-explanation'
) as HTMLParagraphElement
const resultOutput = document.getElementById('result') as HTMLOutputElement

const storageExplanations: Record<DeviceBindingStorage, string> = {
  'device-bound':
    'The credential backing this entropy stays on this device and cannot be synced.',
  'sync-eligible':
    'The credential backing this entropy can be synced, but is not currently backed up.',
  synced:
    'The credential backing this entropy is backed up and may be available on your other devices.',
  unknown:
    'The browser did not reveal whether the credential backing this entropy is device-bound or synced.',
}

createButton.addEventListener('click', async () => {
  status.textContent = 'Waiting for the authenticator…'
  const [created, storage] = await hardware.createDeviceBinding(
    credentialNameInput.value
  )
  status.textContent = created
    ? 'Device binding created.'
    : 'Device binding could not be created.'
  bindingExplanation.textContent = storageExplanations[storage]
})

deriveButton.addEventListener('click', async () => {
  status.textContent = 'Waiting for the authenticator…'
  const entropy = await hardware.deriveDeviceEntropy()

  if (entropy === false) {
    status.textContent = 'Entropy could not be derived.'
    resultOutput.textContent = 'Not available.'
    return
  }

  status.textContent = 'Entropy derived.'
  resultOutput.textContent = Bytes.base64url.encode(entropy)
})
