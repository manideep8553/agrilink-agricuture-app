import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (image: string): Promise<string> => {
  try {
    const result = await cloudinary.v2.uploader.upload(image, {
      folder: 'agrilink/listings',
      quality: 'auto',
      fetch_format: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return image; // fallback to original
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.v2.uploader.destroy(publicId);
};
