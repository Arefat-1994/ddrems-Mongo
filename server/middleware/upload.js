const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mime type
    let resource_type = 'auto';
    if (file.mimetype.startsWith('video/')) {
      resource_type = 'video';
    } else if (file.mimetype.startsWith('image/')) {
      resource_type = 'image';
    } else {
      resource_type = 'raw';
    }
    
    // Use unique ID to avoid collisions with concurrent uploads
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    
    return {
      folder: 'ddrems_uploads',
      resource_type: resource_type,
      public_id: file.fieldname + '-' + uniqueId,
      timeout: 120000, // 2 minute timeout for large files
    };
  },
});

// A robust upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

module.exports = { upload, cloudinary };
