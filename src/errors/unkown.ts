import { DeviceBoundError } from './class.js'

/**
 * Converts an unknown failure into a DeviceBoundError.
 *
 * Preserves existing DeviceBoundError instances without wrapping them again.
 *
 * @param cause The original failure.
 * @param operation The name of the failed operation.
 * @returns The original DeviceBoundError or a new error retaining the cause.
 */
export function unknownError(
  cause: unknown,
  operation: string
): DeviceBoundError {
  return cause instanceof DeviceBoundError
    ? cause
    : new DeviceBoundError('UNKNOWN_ERROR', `${operation} failed.`, { cause })
}
