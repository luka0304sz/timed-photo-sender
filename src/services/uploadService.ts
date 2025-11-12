import axios from 'axios';

import type { UploadData, UploadResponse } from '@/types/upload';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const uploadPhoto = async (
  imageUri: string,
  uploadData: UploadData,
  apiUrl: string,
): Promise<UploadResponse> => {
  let lastError: Error | null = null;

  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      console.log(
        `[Upload] Attempt ${attempt + 1}/${MAX_RETRIES + 1} - Starting upload`,
      );
      console.log('[Upload] Request details:', {
        url: apiUrl,
        orderNumber: uploadData.orderNumber,
        warehouseId: uploadData.warehouseId,
        operator: uploadData.operator,
        notes: uploadData.notes || 'none',
        imageUri: `${imageUri.substring(0, 50)}...`,
      });

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

      const startTime = Date.now();

      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      const duration = Date.now() - startTime;

      console.log('[Upload] Success!', {
        attempt: attempt + 1,
        duration: `${duration}ms`,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      return {
        success: true,
        message: response.data?.message || 'Upload successful',
        responseTime: duration,
        responseData: response.data,
      };
    } catch (error) {
      lastError = error as Error;

      console.error(
        `[Upload] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      if (axios.isAxiosError(error)) {
        console.error('[Upload] Axios error details:', {
          code: error.code,
          message: error.message,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          responseStatus: error.response?.status,
          responseStatusText: error.response?.statusText,
          responseData: error.response?.data,
          responseHeaders: error.response?.headers,
        });

        // Don't retry on client errors (4xx) except for 408, 429
        if (
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500 &&
          error.response.status !== 408 &&
          error.response.status !== 429
        ) {
          console.error(
            '[Upload] Client error - not retrying:',
            error.response.status,
          );
          return {
            success: false,
            message:
              error.response?.data?.message ||
              error.message ||
              'Upload failed (client error)',
          };
        }
      }

      // If this was the last attempt, return error
      if (attempt === MAX_RETRIES) {
        console.error('[Upload] All retry attempts exhausted');
        break;
      }

      // Calculate exponential backoff delay
      const retryDelay = INITIAL_RETRY_DELAY * 2 ** attempt;
      console.log(
        `[Upload] Retrying in ${retryDelay}ms (exponential backoff)...`,
      );

      await sleep(retryDelay);
    }
  }
  /* eslint-enable no-await-in-loop */

  // Return final error
  if (axios.isAxiosError(lastError)) {
    return {
      success: false,
      message:
        lastError.response?.data?.message ||
        lastError.message ||
        'Upload failed after retries',
    };
  }

  return {
    success: false,
    message: lastError?.message || 'Unknown error occurred after retries',
  };
};
