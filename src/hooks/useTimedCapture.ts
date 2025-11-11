import { useCallback, useEffect, useRef, useState } from 'react';

import { uploadPhoto } from '@/services/uploadService';
import type { UploadData } from '@/types/upload';

interface UseTimedCaptureProps {
  intervalSeconds: number;
  isActive: boolean;
  apiUrl: string;
  uploadData: UploadData;
  onCapture: () => Promise<string | null>;
  onUploadSuccess?: (message: string) => void;
  onUploadError?: (error: string) => void;
}

export const useTimedCapture = ({
  intervalSeconds,
  isActive,
  apiUrl,
  uploadData,
  onCapture,
  onUploadSuccess,
  onUploadError,
}: UseTimedCaptureProps) => {
  const [uploadHistory, setUploadHistory] = useState<
    Array<{ timestamp: Date; success: boolean; message: string }>
  >([]);
  const [nextCaptureIn, setNextCaptureIn] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const captureAndUpload = useCallback(async () => {
    try {
      const imageUri = await onCapture();

      if (!imageUri) {
        const errorMsg = 'Failed to capture photo';
        onUploadError?.(errorMsg);
        setUploadHistory((prev) => [
          ...prev,
          { timestamp: new Date(), success: false, message: errorMsg },
        ]);
        return;
      }

      const result = await uploadPhoto(imageUri, uploadData, apiUrl);

      setUploadHistory((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          success: result.success,
          message: result.message || 'Unknown result',
        },
      ]);

      if (result.success) {
        onUploadSuccess?.(result.message || 'Upload successful');
      } else {
        onUploadError?.(result.message || 'Upload failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onUploadError?.(errorMsg);
      setUploadHistory((prev) => [
        ...prev,
        { timestamp: new Date(), success: false, message: errorMsg },
      ]);
    }
  }, [onCapture, uploadData, apiUrl, onUploadSuccess, onUploadError]);

  useEffect(() => {
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (isActive && intervalSeconds > 0) {
      // Set initial countdown
      setNextCaptureIn(intervalSeconds);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setNextCaptureIn((prev) => {
          if (prev <= 1) {
            return intervalSeconds;
          }
          return prev - 1;
        });
      }, 1000);

      // Start capture interval
      intervalRef.current = setInterval(() => {
        captureAndUpload();
      }, intervalSeconds * 1000);

      // Immediate first capture
      captureAndUpload();
    } else {
      setNextCaptureIn(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isActive, intervalSeconds, captureAndUpload]);

  const clearHistory = useCallback(() => {
    setUploadHistory([]);
  }, []);

  return {
    uploadHistory,
    nextCaptureIn,
    clearHistory,
    manualCapture: captureAndUpload,
  };
};
