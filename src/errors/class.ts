/**
 * Identifies a DeviceBound failure independently of its human-readable message.
 */
export type DeviceBoundErrorCode =
  /** An unexpected failure was wrapped with its original cause. */
  'UNKNOWN_ERROR'

/**
 * Represents a DeviceBound error with a machine-readable code and an optional cause.
 *
 * The message is prefixed with the library name. Use {@link code} to identify
 * the failure without parsing the message.
 */
export class DeviceBoundError extends Error {
  /** The machine-readable category of the failure. */
  readonly code: DeviceBoundErrorCode

  /**
   * Creates a DeviceBoundError.
   *
   * @param code The category of the failure.
   * @param message The error message. Defaults to the error code.
   * @param options Optional error options, including the original cause.
   */
  constructor(
    code: DeviceBoundErrorCode,
    message?: string,
    options?: ErrorOptions
  ) {
    super(`{@sovereignbase/hardware-bound} ${message ?? code}`, options)
    this.code = code
    this.name = 'DeviceBoundError'
  }
}
