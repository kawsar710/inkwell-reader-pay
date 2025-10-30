import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dfmxhjxae',
  api_key: '789344839928643',
  api_secret: 'JNw-XUBgDVH81OVVb8u4GCougR0',
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
}

export class CloudinaryService {
  /**
   * Upload a file to Cloudinary
   * @param file - The file to upload
   * @param folder - The folder to upload to (e.g., 'book-covers', 'books')
   * @param publicId - Optional public ID for the file
   * @returns Promise<UploadResult>
   */
  static async uploadFile(
    file: File,
    folder: string,
    publicId?: string
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
              url: result.url,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      // Convert File to buffer and upload
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          uploadStream.end(Buffer.from(reader.result));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId - The public ID of the file to delete
   * @returns Promise<any>
   */
  static async deleteFile(publicId: string): Promise<{ result: string }> {
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
  static getFileUrl(publicId: string, options: Record<string, unknown> = {}): string {
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
  static extractPublicId(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const fileNameWithExtension = urlParts[urlParts.length - 1];
      const publicIdWithFolder = urlParts.slice(-2).join('/');
      return publicIdWithFolder.split('.')[0]; // Remove extension
    } catch {
      return null;
    }
  }
}

export default CloudinaryService;