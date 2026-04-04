import { toBase64UrlString } from '@sovereignbase/bytecodec'
import * as hardware from './dist/index.js'

globalThis.hardware = hardware

const nameInput = document.getElementById('name')

const createButton = document.getElementById('create')

const deriveButton = document.getElementById('derive')

const resultOutput = document.getElementById('result')

createButton.addEventListener('click', async () => {
  void (await hardware.createDeviceBinding(nameInput.value ?? ''))
})

deriveButton.addEventListener('click', async () => {
  const result = await hardware.deriveDeviceEntropy()
  resultOutput.textContent = toBase64UrlString(result)
})
