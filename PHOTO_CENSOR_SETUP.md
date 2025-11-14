# Photo Censor API Setup Guide

## Overview

The Photo Censor tool now uses **server-side image processing with Sharp** for production-ready image censoring. Processed images are stored in Supabase Storage with auto-expiring signed URLs.

## How It Works

1. **Client uploads image** → API receives base64 image
2. **Server processes with Sharp** → Applies pixelation, blur, or black bars
3. **Uploads to Supabase Storage** → Stores the processed image
4. **Returns signed URL** → Expires after 1 day, image auto-deletes
5. **Client downloads** → From the signed URL

## Setup Steps

### 1. Create Storage Bucket

Initialize the bucket on app startup:

```bash
# Call once to set up the bucket
curl http://localhost:3000/api/maintenance/init-storage
```

Or it will be created automatically on first image upload.

**Bucket details:**
- Name: `censored-images`
- Privacy: Private (images only accessible via signed URLs)
- Max file size: 5MB

### 2. Configure Auto-Cleanup (Optional but Recommended)

Images are auto-deleted after 1 day. To enable automatic cleanup, set up a cron job:

#### Option A: Using EasyCron

1. Go to https://www.easycron.com/
2. Create a new cron job
3. Set URL: `https://yourapp.com/api/maintenance/cleanup-images`
4. Set headers: `Authorization: Bearer <CLEANUP_SECRET>`
5. Run frequency: Every day (or more frequently)

#### Option B: Using GitHub Actions

Create `.github/workflows/cleanup-images.yml`:

```yaml
name: Cleanup Expired Images

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup expired images
        run: |
          curl -X POST https://yourapp.com/api/maintenance/cleanup-images \
            -H "Authorization: Bearer ${{ secrets.CLEANUP_SECRET }}"
```

#### Option C: Using Vercel Cron (if available)

See Vercel documentation for serverless functions with cron.

### 3. Environment Variables

Set the cleanup secret in your `.env.local`:

```env
CLEANUP_SECRET=your-secure-random-string-here
```

**Generate a secure secret:**
```bash
openssl rand -hex 32
```

## API Response Format

### Request
```json
{
  "imageData": "data:image/png;base64,...",
  "regions": [
    {
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 200,
      "type": "pixelate",
      "intensity": 5
    }
  ]
}
```

### Response (Success)
```json
{
  "data": {
    "censoredImageUrl": "https://..../censored-image.png?token=xxx",
    "regionsApplied": 1,
    "imageWidth": 1920,
    "imageHeight": 1080,
    "expiresIn": 86400
  },
  "meta": {
    "remaining": 9950,
    "balance": 9950,
    "costThisCall": 1,
    "requestsPerSecond": 10
  }
}
```

### Response (Error)
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance to perform this action"
  }
}
```

## Features

✅ **Server-side Processing** - Efficient image processing with Sharp  
✅ **Signed URLs** - Secure, time-limited download links  
✅ **Auto-cleanup** - Images deleted after 1 day  
✅ **Supports Multiple Effects** - Pixelate, blur, black bars  
✅ **Region-based** - Can censor multiple regions per image  
✅ **Size Limits** - Max 5MB per image, up to 50 regions per request  

## Security Notes

- **Storage bucket is private** - Only accessible via signed URLs
- **Cleanup secret should be strong** - Use `openssl rand -hex 32`
- **Signed URLs expire after 1 day** - Users must download within this window
- **Images auto-delete** - No manual cleanup needed if using cron job

## Testing

### Initialize bucket:
```bash
curl http://localhost:3000/api/maintenance/init-storage
```

### Test cleanup (if CLEANUP_SECRET is set):
```bash
curl -X POST http://localhost:3000/api/maintenance/cleanup-images \
  -H "Authorization: Bearer $CLEANUP_SECRET"
```

### Test image upload/processing:
Use the Photo Censor tool UI at `/tools/photo-censor` to upload and process images.

## Troubleshooting

**"Failed to generate download URL"**
- Ensure bucket exists: `curl http://localhost:3000/api/maintenance/init-storage`
- Check Supabase credentials in `.env.local`

**"Cleanup images endpoint returning 401"**
- Verify `CLEANUP_SECRET` env var is set
- Check Authorization header in cron job configuration

**Images not auto-deleting**
- Set up cron job to call `/api/maintenance/cleanup-images`
- Cleanup runs on-demand, not automatic

## Configuration

To adjust settings, edit `/lib/server/storageManager.ts`:

```typescript
const STORAGE_BUCKET = 'censored-images'           // Bucket name
const SIGNED_URL_EXPIRY_SECONDS = 86400            // 1 day
const CLEANUP_AGE_SECONDS = 86400                  // 1 day
```

## File Structure

```
app/api/
├── tools/
│   └── photo-censor/
│       └── route.ts                    # Main API endpoint with Sharp processing
└── maintenance/
    ├── init-storage/route.ts           # Initialize bucket
    └── cleanup-images/route.ts         # Clean up expired images

lib/server/
├── storageManager.ts                   # Storage utilities
└── photo-censor.ts                     # Type definitions

app/tools/
└── photo-censor/
    └── page.tsx                        # UI with signed URL download
```
