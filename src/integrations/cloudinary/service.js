import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dfmxhjxae',
  api_key: '789344839928643',
  api_secret: 'JNw-XUBgDVH81OVVb8u4GCougR0',
});

export class CloudinaryService {
  /**
   * Upload a file to Cloudinary
   * @param file - The file to upload (File object from browser or multer file object)
   * @param folder - The folder to upload to (e.g., 'book-covers', 'books')
   * @param publicId - Optional public ID for the file
   * @returns Promise<UploadResult>
   */
  static async uploadFile(file, folder, publicId) {
    return new Promise((resolve, reject) => {
      // Determine resource type based on folder
      const resourceType = folder === 'books' ? 'raw' : 'auto'; // PDFs should be 'raw'

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          access_mode: 'public', // Ensure files are publicly accessible
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            // For raw files (PDFs), we need to construct the correct URL
            let finalUrl = result.secure_url;
            if (resourceType === 'raw') {
              // Replace /image/upload/ with /raw/upload/ for PDFs
              finalUrl = result.secure_url.replace('/image/upload/', '/raw/upload/');
            }

            resolve({
              public_id: result.public_id,
              secure_url: finalUrl,
              url: result.url.replace('/image/upload/', '/raw/upload/'),
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      // Handle different file types
      if (file.buffer) {
        // Multer file object (server-side)
        uploadStream.end(file.buffer);
      } else if (file instanceof File) {
        // Browser File object
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            uploadStream.end(Buffer.from(reader.result));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type'));
      }
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId - The public ID of the file to delete
   * @returns Promise<any>
   */
  static async deleteFile(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Get the URL for a file
   * @param publicId - The public ID of the file
   * @param options - Additional options for the URL
   * @returns string
   */
  static getFileUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...options,
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - The Cloudinary URL
   * @returns string | null
   */
  static extractPublicId(url) {
    try {
      // Handle different Cloudinary URL formats
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // Find the upload part
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1) {
        return null;
      }

      // Skip 'upload' and version (v{number}), then take everything until the file extension
      const publicIdParts = pathParts.slice(uploadIndex + 2); // Skip 'upload' and version
      if (publicIdParts.length === 0) {
        return null;
      }

      const fullPublicId = publicIdParts.join('/');
      // Remove file extension
      const lastDotIndex = fullPublicId.lastIndexOf('.');
      return lastDotIndex > 0 ? fullPublicId.substring(0, lastDotIndex) : fullPublicId;
    } catch (error) {
      console.warn('Error extracting public ID from URL:', url, error);
      return null;
    }
  }
}