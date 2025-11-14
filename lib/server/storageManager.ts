import { supabaseAdmin } from '@/lib/supabaseAdmin'

const STORAGE_BUCKET = 'censored-images'
const SIGNED_URL_EXPIRY_SECONDS = 86400 // 1 day
const CLEANUP_AGE_SECONDS = 86400 // 1 day

/**
 * Ensure the storage bucket exists
 */
export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()

    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET)

    if (!bucketExists) {
      // Create bucket with private access
      await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      })
      console.log(`[Storage] Created bucket: ${STORAGE_BUCKET}`)
    }
  } catch (error) {
    console.error('[Storage] Error ensuring bucket:', error)
  }
}

/**
 * Clean up old censored images (older than 1 day)
 * Can be called by a cron job or scheduled function
 */
export async function cleanupExpiredImages() {
  try {
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      })

    if (listError) {
      console.error('[Storage] List error:', listError)
      return { deleted: 0, error: listError.message }
    }

    if (!files || files.length === 0) {
      return { deleted: 0 }
    }

    const now = Date.now()
    const filesToDelete: string[] = []

    for (const file of files) {
      const fileAge = now - new Date(file.created_at).getTime()

      // Delete if older than 1 day
      if (fileAge > CLEANUP_AGE_SECONDS * 1000) {
        filesToDelete.push(file.name)
      }
    }

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove(filesToDelete)

      if (deleteError) {
        console.error('[Storage] Delete error:', deleteError)
        return { deleted: 0, error: deleteError.message }
      }

      console.log(`[Storage] Cleaned up ${filesToDelete.length} expired images`)
      return { deleted: filesToDelete.length }
    }

    return { deleted: 0 }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Storage] Cleanup error:', errorMessage)
    return { deleted: 0, error: errorMessage }
  }
}

/**
 * Delete a specific image file
 */
export async function deleteImageFile(fileName: string) {
  try {
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([fileName])

    if (error) {
      console.error('[Storage] Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Storage] Delete error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

export { STORAGE_BUCKET, SIGNED_URL_EXPIRY_SECONDS }
