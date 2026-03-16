import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload an image to Cloudinary
 * @param base64Image - Base64 encoded image string
 * @param folder - Folder to store the image in Cloudinary
 * @returns UploadResult with url and publicId
 */
export async function uploadImage(
  base64Image: string,
  folder: string = 'universe'
): Promise<UploadResult> {
  try {
    // Ensure the base64 string has the proper data URI prefix
    const dataUri = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    const result: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' }, // Automatic quality optimization
        { fetch_format: 'auto' }, // Automatic format selection (WebP, etc.)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw here - image deletion failure shouldn't break the operation
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns public ID or null
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\./);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
}

/**
 * Generate optimized URL for an image
 * @param url - Original Cloudinary URL
 * @param width - Desired width
 * @param height - Desired height
 * @returns Optimized URL
 */
export function getOptimizedUrl(
  url: string,
  width?: number,
  height?: number
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // If the URL already has transformations, return as-is
  if (url.includes('/upload/') && url.includes('w_')) {
    return url;
  }

  // Add transformation parameters
  const transformation = [];
  if (width) transformation.push(`w_${width}`);
  if (height) transformation.push(`h_${height}`);
  transformation.push('c_fill', 'q_auto', 'f_auto');

  const transformationStr = transformation.join(',');

  // Insert transformation into URL
  return url.replace('/upload/', `/upload/${transformationStr}/`);
}
