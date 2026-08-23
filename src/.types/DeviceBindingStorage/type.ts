/**
 * The authenticator-reported portability of a newly created credential.
 *
 * This describes WebAuthn backup state, not whether the credential's key is
 * protected by hardware.
 */
export type DeviceBindingStorage =
  /** The credential stays on this device and cannot be backed up or synced. */
  | 'device-bound'
  /** The credential can be backed up or synced, but has not been yet. */
  | 'sync-eligible'
  /** The credential has been backed up and may be available on other devices. */
  | 'synced'
  /** Portability could not be determined; applications should not assume it. */
  | 'unknown'
