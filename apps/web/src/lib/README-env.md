# Cloudinary Environment Variables

The following environment variables are required for the client-side Cloudinary upload feature to work correctly in the web app:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

Note: If these values already exist in your Vercel or local environment configuration, you do not need to duplicate them.
