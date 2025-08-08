const Banner = require('../models/Banner');
const { convertBannerToFullUrls, convertBannersToFullUrls, getFullImageUrl } = require('../utils/imageUrl');

// Get active banner
exports.getBanner = async (req, res) => {
  try {
    // Get the active banner or create default if none exists
    let banner = await Banner.findOne({ isActive: true });
    
    if (!banner) {
      // Create default banner if none exists
      banner = new Banner({
        title: 'BOOK YOUR SPOT.\nDOMINATE THE ARENA.',
        description: 'Join daily Free Fire & Squad Tournaments.\nCompete, Win, Get Rewarded.',
        buttonText: 'VIEW TOURNAMENTS',
        backgroundImage: '/assets/banner/banner.jpg',
        isActive: true
      });
      await banner.save();
    }

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json(bannerWithFullUrls);
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ msg: 'Server error while fetching banner' });
  }
};

// Update banner (Admin only)
exports.updateBanner = async (req, res) => {
  try {
    const { title, description, buttonText, backgroundImage, bannerImages } = req.body;

    // Validate required fields
    if (!title || !description || !buttonText) {
      return res.status(400).json({ 
        msg: 'Missing required fields: title, description, buttonText' 
      });
    }

    // Find existing active banner or create new one
    let banner = await Banner.findOne({ isActive: true });
    
    if (banner) {
      // Update existing banner
      banner.title = title;
      banner.description = description;
      banner.buttonText = buttonText;
      if (backgroundImage) {
        banner.backgroundImage = backgroundImage;
      }
      if (bannerImages && Array.isArray(bannerImages)) {
        banner.bannerImages = bannerImages;
      }
      banner.updatedAt = Date.now();
    } else {
      // Create new banner
      banner = new Banner({
        title,
        description,
        buttonText,
        backgroundImage: backgroundImage || '/assets/banner/banner.jpg',
        bannerImages: bannerImages || [],
        isActive: true
      });
    }

    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json({
      msg: 'Banner updated successfully',
      banner: bannerWithFullUrls
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ msg: 'Server error while updating banner' });
  }
};

// Upload banner image (Admin only)
exports.uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No image file uploaded' });
    }

    // Return the full URL for the uploaded image
    const imagePath = `/uploads/banners/${req.file.filename}`;
    const fullImageUrl = getFullImageUrl(imagePath);
    
    // Find the active banner or create one if none exists
    let banner = await Banner.findOne({ isActive: true });
    
    if (!banner) {
      // Create a new banner if none exists
      banner = new Banner({
        title: 'Default Banner',
        description: 'Default banner description',
        buttonText: 'VIEW TOURNAMENTS',
        bannerImages: [],
        isActive: true
      });
    }

    // Add new image to the bannerImages array
    banner.bannerImages.push(imagePath);
    banner.updatedAt = Date.now();
    
    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    
    res.json({
      msg: 'Image uploaded and added to banner successfully',
      imagePath: fullImageUrl,
      relativePath: imagePath, // Keep relative path for database storage
      banner: bannerWithFullUrls,
      totalBannerImages: banner.bannerImages.length
    });
  } catch (error) {
    console.error('Error uploading banner image:', error);
    res.status(500).json({ msg: 'Server error while uploading image' });
  }
};

// Upload multiple banner images (Admin only)
exports.uploadMultipleBannerImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No image files uploaded' });
    }

    // Process multiple uploaded files
    const relativePaths = req.files.map(file => `/uploads/banners/${file.filename}`);
    const fullImageUrls = relativePaths.map(path => getFullImageUrl(path));
    
    // Find the active banner or create one if none exists
    let banner = await Banner.findOne({ isActive: true });
    
    if (!banner) {
      // Create a new banner if none exists
      banner = new Banner({
        title: 'Default Banner',
        description: 'Default banner description',
        buttonText: 'VIEW TOURNAMENTS',
        bannerImages: [],
        isActive: true
      });
    }

    // Add new images to the bannerImages array
    banner.bannerImages.push(...relativePaths);
    banner.updatedAt = Date.now();
    
    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    
    res.json({
      msg: `${req.files.length} images uploaded and added to banner successfully`,
      imagePaths: fullImageUrls, // Full URLs for frontend use
      relativePaths: relativePaths, // Relative paths for database storage
      totalUploaded: req.files.length,
      banner: bannerWithFullUrls,
      totalBannerImages: banner.bannerImages.length
    });
  } catch (error) {
    console.error('Error uploading multiple banner images:', error);
    res.status(500).json({ msg: 'Server error while uploading images' });
  }
};

// Add multiple images to banner (Admin only)
exports.addImagesToBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { imagePaths } = req.body; // Array of relative image paths

    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return res.status(400).json({ msg: 'No image paths provided' });
    }

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ msg: 'Banner not found' });
    }

    // Add new images to the bannerImages array
    banner.bannerImages.push(...imagePaths);
    banner.updatedAt = Date.now();
    
    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json({
      msg: `${imagePaths.length} images added to banner successfully`,
      banner: bannerWithFullUrls,
      addedImages: imagePaths.length
    });
  } catch (error) {
    console.error('Error adding images to banner:', error);
    res.status(500).json({ msg: 'Server error while adding images to banner' });
  }
};

// Remove image from banner (Admin only)
exports.removeImageFromBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({ msg: 'Image path is required' });
    }

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ msg: 'Banner not found' });
    }

    // Remove the image from bannerImages array
    const initialLength = banner.bannerImages.length;
    banner.bannerImages = banner.bannerImages.filter(img => img !== imagePath);
    
    if (banner.bannerImages.length === initialLength) {
      return res.status(404).json({ msg: 'Image not found in banner images' });
    }

    banner.updatedAt = Date.now();
    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json({
      msg: 'Image removed from banner successfully',
      banner: bannerWithFullUrls
    });
  } catch (error) {
    console.error('Error removing image from banner:', error);
    res.status(500).json({ msg: 'Server error while removing image from banner' });
  }
};

// Update banner images array (Admin only)
exports.updateBannerImages = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { bannerImages } = req.body;

    if (!bannerImages || !Array.isArray(bannerImages)) {
      return res.status(400).json({ msg: 'Banner images must be an array' });
    }

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ msg: 'Banner not found' });
    }

    banner.bannerImages = bannerImages;
    banner.updatedAt = Date.now();
    await banner.save();

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json({
      msg: 'Banner images updated successfully',
      banner: bannerWithFullUrls
    });
  } catch (error) {
    console.error('Error updating banner images:', error);
    res.status(500).json({ msg: 'Server error while updating banner images' });
  }
};

// Get all banners (Admin only)
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    
    // Convert all banners to include full URLs
    const bannersWithFullUrls = convertBannersToFullUrls(banners);
    res.json(bannersWithFullUrls);
  } catch (error) {
    console.error('Error fetching all banners:', error);
    res.status(500).json({ msg: 'Server error while fetching banners' });
  }
};

// Set active banner (Admin only)
exports.setActiveBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    // Deactivate all banners
    await Banner.updateMany({}, { isActive: false });

    // Activate the selected banner
    const banner = await Banner.findByIdAndUpdate(
      bannerId,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ msg: 'Banner not found' });
    }

    // Convert to full URLs before sending response
    const bannerWithFullUrls = convertBannerToFullUrls(banner);
    res.json({
      msg: 'Banner activated successfully',
      banner: bannerWithFullUrls
    });
  } catch (error) {
    console.error('Error setting active banner:', error);
    res.status(500).json({ msg: 'Server error while setting active banner' });
  }
};

// Delete banner (Admin only)
exports.deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ msg: 'Banner not found' });
    }

    // Don't allow deletion of active banner
    if (banner.isActive) {
      return res.status(400).json({ 
        msg: 'Cannot delete active banner. Please activate another banner first.' 
      });
    }

    await Banner.findByIdAndDelete(bannerId);

    res.json({ msg: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ msg: 'Server error while deleting banner' });
  }
};
