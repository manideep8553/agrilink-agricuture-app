import { v2 as cloudinary } from 'cloudinary';

const isConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
    process.env.CLOUDINARY_API_KEY !== 'your-api-key' &&
    process.env.CLOUDINARY_API_SECRET !== 'your-api-secret'
  );
};

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(image: string): Promise<string> {
  if (!isConfigured()) {
    console.warn('Cloudinary not configured, storing image as-is');
    return image;
  }
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'agrilink/listings',
      quality: 'auto',
      fetch_format: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

export async function uploadMultipleToCloudinary(images: string[]): Promise<string[]> {
  return Promise.all(images.map(img => uploadToCloudinary(img)));
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!isConfigured()) return;
  await cloudinary.uploader.destroy(publicId);
}

export async function extractPublicId(url: string): Promise<string | null> {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}
