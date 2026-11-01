/** Future integration seam only. No upload or pretend claim QR is performed. */
export interface PhotoClaim {
  /** Cryptographically unguessable bearer token; never visitor or sequential IDs. */
  token: string
  claimUrl: string
  expiresAt: string
}
export interface PhotoCollectionService {
  /** Must only be called after explicit informed upload consent. */
  upload(photo: Blob, consent: { granted: true; acceptedAt: string }, signal: AbortSignal): Promise<PhotoClaim>
  revoke(token: string): Promise<void>
}
/** Disabled until a real expiring object store, claim page and cleanup job exist. */
export const photoCollectionService: PhotoCollectionService | null = null
