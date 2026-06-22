const cloudinary = require("cloudinary").v2;

/*
 * WHAT IS CLOUDINARY?
 * A cloud service that stores files (images, PDFs, videos, etc.)
 * Instead of storing files on our server (bad — server storage fills up,
 * files lost on redeploy), we upload to Cloudinary and get back a URL.
 *
 * FLOW:
 * User selects file → Multer reads it from request
 * → multer-storage-cloudinary uploads to Cloudinary
 * → Cloudinary returns a secure URL
 * → We save that URL in our MongoDB contract document
 *
 * cloudinary.config() authenticates us with Cloudinary's servers.
 * Without this, uploads would be rejected.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;