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
      console.error('Camera permission not granted');
      return null;
    }

    if (!isCameraReady || !cameraRef.current) {
      console.error('Camera not ready');
      return null;
    }

    try {
      setIsLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      return photo.uri;
    } catch (error) {
      console.error('Error taking picture:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const onCameraReady = () => {
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
