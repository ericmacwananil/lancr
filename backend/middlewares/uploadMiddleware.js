const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

/*
 * WHAT IS MULTER?
 * Express can't read file uploads by default.
 * Multer is middleware that reads multipart/form-data
 * (the format browsers use to send files).
 *
 * Without Multer: req.file = undefined
 * With Multer:    req.file = { path, filename, size, mimetype, ... }
 *
 * WHAT IS multer-storage-cloudinary?
 * Normally Multer saves files to your server's disk.
 * multer-storage-cloudinary is a "storage engine" that tells
 * Multer to upload directly to Cloudinary instead of disk.
 *
 * FLOW:
 * Request arrives → Multer intercepts the file
 * → CloudinaryStorage uploads it to Cloudinary
 * → Cloudinary returns URL
 * → Multer puts URL in req.file.path
 * → Our controller reads req.file.path and saves to DB
 */

// ─── Cloudinary Storage Engine ────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // our configured cloudinary instance

  params: {
    /*
     * folder: where files are stored in your Cloudinary account.
     * Like a folder on Google Drive.
     * All work submissions go into "freelance-marketplace/submissions"
     */
    folder: "freelance-marketplace/submissions",

    /*
     * allowed_formats: only allow these file types.
     * This prevents uploading .exe, .sh, or other dangerous files.
     * Add more formats if needed (e.g. "mp4", "zip")
     */
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "doc", "docx", "zip"],

    /*
     * resource_type: "auto" lets Cloudinary detect the file type.
     * "image" → only images
     * "raw"   → any file type (needed for PDF, ZIP, DOC)
     * "auto"  → auto-detect (handles both images and raw files)
     */
    resource_type: "auto",
  },
});

// ─── File Size & Type Validation ──────────────────────────────
/*
 * fileFilter runs before the file is uploaded.
 * We can reject files here before wasting bandwidth uploading them.
 *
 * cb(null, true)  → accept the file
 * cb(error, false) → reject the file with an error
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // accept
  } else {
    cb(
      new Error("Invalid file type. Allowed: JPG, PNG, PDF, DOC, DOCX, ZIP"),
      false // reject
    );
  }
};

// ─── Create Multer Upload Instance ───────────────────────────
const upload = multer({
  storage: storage,   // use Cloudinary storage
  fileFilter,         // validate file type
  limits: {
    /*
     * fileSize: max file size in bytes.
     * 10 * 1024 * 1024 = 10MB
     * Prevents users from uploading huge files that slow the app.
     */
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/*
 * upload.single("workFile") → middleware that processes ONE file
 * "workFile" must match the field name in the frontend form.
 *
 * Usage in routes:
 * router.post("/submit", protect, upload.single("workFile"), submitWork)
 *
 * After this middleware runs:
 * req.file = {
 *   path: "https://res.cloudinary.com/...",  ← the Cloudinary URL
 *   filename: "freelance-marketplace/submissions/abc123",
 *   size: 245000,
 *   mimetype: "application/pdf"
 * }
 */
module.exports = { upload };