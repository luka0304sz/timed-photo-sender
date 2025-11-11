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

  // Use ref to store uploadData to avoid recreating captureAndUpload on every render
  const uploadDataRef = useRef(uploadData);
  const apiUrlRef = useRef(apiUrl);

  // Update refs when values change
  useEffect(() => {
    uploadDataRef.current = uploadData;
    apiUrlRef.current = apiUrl;
  }, [uploadData, apiUrl]);

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

      const result = await uploadPhoto(
        imageUri,
        uploadDataRef.current,
        apiUrlRef.current,
      );

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
  }, [onCapture, onUploadSuccess, onUploadError]);

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
      console.log(`Starting timer with ${intervalSeconds} second interval`);

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
        console.log('Interval trigger: capturing photo');
        captureAndUpload();
      }, intervalSeconds * 1000);

      // Immediate first capture
      console.log('Taking first photo immediately');
      captureAndUpload();
    } else {
      setNextCaptureIn(0);
      console.log('Timer stopped');
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
