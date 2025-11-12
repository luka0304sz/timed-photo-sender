import { Camera } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';

export const useCamera = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async (): Promise<string | null> => {
    if (!hasPermission) {
      console.error('[Camera] Permission not granted');
      return null;
    }

    if (!isCameraReady || !cameraRef.current) {
      console.error(
        '[Camera] Not ready - camera ref:',
        !!cameraRef.current,
        'ready:',
        isCameraReady,
      );
      return null;
    }

    try {
      setIsLoading(true);
      console.log('[Camera] Taking picture...');

      const startTime = Date.now();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      const duration = Date.now() - startTime;

      console.log('[Camera] Picture taken successfully:', {
        uri: `${photo.uri.substring(0, 50)}...`,
        width: photo.width,
        height: photo.height,
        duration: `${duration}ms`,
      });

      return photo.uri;
    } catch (error) {
      console.error('[Camera] Error taking picture:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const onCameraReady = () => {
    console.log('[Camera] Camera is ready!');
    setIsCameraReady(true);
  };

  return {
    hasPermission,
    isLoading,
    isCameraReady,
    cameraRef,
    takePicture,
    onCameraReady,
  };
};
