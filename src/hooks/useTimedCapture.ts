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
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [lastServerResponse, setLastServerResponse] = useState<any>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref to store uploadData to avoid recreating captureAndUpload on every render
  const uploadDataRef = useRef(uploadData);
  const apiUrlRef = useRef(apiUrl);

  // Date-based timing to fix Android setInterval issues
  const nextCaptureTimeRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);

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

      // Store the photo URI
      setLastPhotoUri(imageUri);

      const result = await uploadPhoto(
        imageUri,
        uploadDataRef.current,
        apiUrlRef.current,
      );

      // Store server response and timing
      setLastServerResponse(result.responseData);
      setLastResponseTime(result.responseTime || null);

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
      const intervalMs = intervalSeconds * 1000;
      const now = Date.now();

      console.log(
        `[Timer] Starting with ${intervalSeconds}s interval (${intervalMs}ms)`,
      );
      console.log('[Timer] Current time:', new Date(now).toISOString());

      // Set initial countdown
      setNextCaptureIn(intervalSeconds);

      // Set next capture time
      nextCaptureTimeRef.current = now + intervalMs;
      lastCaptureTimeRef.current = now;

      // Start countdown - check every 100ms for accuracy
      countdownRef.current = setInterval(() => {
        const currentTime = Date.now();
        const timeUntilNextCapture = nextCaptureTimeRef.current - currentTime;
        const secondsRemaining = Math.ceil(timeUntilNextCapture / 1000);

        setNextCaptureIn(secondsRemaining > 0 ? secondsRemaining : 0);

        // Log countdown every 5 seconds
        if (secondsRemaining % 5 === 0 && secondsRemaining > 0) {
          console.log(
            `[Timer] Countdown: ${secondsRemaining}s remaining (actual: ${Math.round(
              timeUntilNextCapture,
            )}ms)`,
          );
        }
      }, 100); // Check every 100ms for smoother countdown

      // Check for capture trigger every 500ms using Date-based validation
      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const timeSinceLastCapture = currentTime - lastCaptureTimeRef.current;

        // Only trigger if enough time has actually passed (with 100ms tolerance)
        if (timeSinceLastCapture >= intervalMs - 100) {
          console.log('[Timer] Trigger detected:', {
            intervalMs,
            timeSinceLastCapture: `${timeSinceLastCapture}ms`,
            expectedTime: new Date(nextCaptureTimeRef.current).toISOString(),
            actualTime: new Date(currentTime).toISOString(),
            drift: `${currentTime - nextCaptureTimeRef.current}ms`,
          });

          // Update timing references
          lastCaptureTimeRef.current = currentTime;
          nextCaptureTimeRef.current = currentTime + intervalMs;

          console.log('[Timer] Capturing photo...');
          captureAndUpload();
        }
      }, 500); // Check every 500ms

      // Immediate first capture
      console.log('[Timer] Taking first photo immediately');
      captureAndUpload();
    } else {
      setNextCaptureIn(0);
      console.log('[Timer] Stopped');
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
    lastPhotoUri,
    lastServerResponse,
    lastResponseTime,
    clearHistory,
    manualCapture: captureAndUpload,
  };
};
