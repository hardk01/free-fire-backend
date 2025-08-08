const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bannerController = require('../controllers/bannerController');
const authentication = require('../middleware/adminAuth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/banners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for banner image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public route - Get active banner
router.get('/', bannerController.getBanner);

// Admin routes - Require admin authentication
router.get('/admin/banners', bannerController.getAllBanners);
router.put('/admin/update', authentication, bannerController.updateBanner);
router.post('/admin/upload-image', authentication, upload.single('banner'), bannerController.uploadBannerImage);
router.post('/admin/upload-multiple', authentication, upload.array('bannerImages', 10), bannerController.uploadMultipleBannerImages);
router.post('/admin/:bannerId/add-images', authentication, bannerController.addImagesToBanner);
router.delete('/admin/:bannerId/remove-image', authentication, bannerController.removeImageFromBanner);
router.put('/admin/:bannerId/images', authentication, bannerController.updateBannerImages);
router.put('/admin/:bannerId/activate', authentication, bannerController.setActiveBanner);
router.delete('/admin/:bannerId', authentication, bannerController.deleteBanner);

module.exports = router;
