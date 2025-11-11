import axios from 'axios';

import type { UploadData, UploadResponse } from '@/types/upload';

export const uploadPhoto = async (
  imageUri: string,
  uploadData: UploadData,
  apiUrl: string,
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();

    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'photo.jpg';

    // Create file object for the image
    const imageFile = {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename,
    } as any;

    formData.append('image', imageFile);
    formData.append('orderNumber', uploadData.orderNumber);
    formData.append('warehouseId', uploadData.warehouseId);
    formData.append('operator', uploadData.operator);

    if (uploadData.notes) {
      formData.append('notes', uploadData.notes);
    }

    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout
    });

    return {
      success: true,
      message: response.data?.message || 'Upload successful',
    };
  } catch (error) {
    console.error('Upload error:', error);

    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || 'Upload failed',
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred',
    };
  }
};
