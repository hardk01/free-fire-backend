// Utility to convert relative image paths to full URLs
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Replace localhost URLs with IP address
  if (imagePath.includes('localhost:5000')) {
    return imagePath.replace('localhost:5000', '192.168.1.3:5000');
  }
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Get base URL from environment or default to IP address
  const baseUrl = 'http://192.168.1.2:5000';
  
  // Ensure the path starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${baseUrl}${normalizedPath}`;
};

// Convert banner object to include full URLs
const convertBannerToFullUrls = (banner) => {
  if (!banner) return null;
  
  const bannerObj = banner.toObject ? banner.toObject() : banner;
  
  return {
    ...bannerObj,
    backgroundImage: getFullImageUrl(bannerObj.backgroundImage),
    bannerImages: bannerObj.bannerImages?.map(img => getFullImageUrl(img)) || []
  };
};

// Convert array of banners to include full URLs
const convertBannersToFullUrls = (banners) => {
  if (!Array.isArray(banners)) return [];
  
  return banners.map(banner => convertBannerToFullUrls(banner));
};

module.exports = {
  getFullImageUrl,
  convertBannerToFullUrls,
  convertBannersToFullUrls
};
