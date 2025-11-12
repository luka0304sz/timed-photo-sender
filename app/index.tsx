import { Camera, CameraType } from 'expo-camera';
import { Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCamera } from '@/hooks/useCamera';
import { useTimedCapture } from '@/hooks/useTimedCapture';
import type { UploadData } from '@/types/upload';

const Home = () => {
  // Form state
  const [apiUrl, setApiUrl] = useState('http://192.168.0.199:3005/api/upload');
  const [orderNumber, setOrderNumber] = useState('ORD-123');
  const [warehouseId, setWarehouseId] = useState('WH-01');
  const [operator, setOperator] = useState('Jan Kowalski');
  const [notes, setNotes] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState('60');
  const [isActive, setIsActive] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  // Camera hook
  const {
    hasPermission,
    isLoading,
    isCameraReady,
    cameraRef,
    takePicture,
    onCameraReady,
  } = useCamera();

  // Prepare upload data - CRITICAL: use useMemo to prevent recreation on every render
  const uploadData: UploadData = useMemo(
    () => ({
      orderNumber,
      warehouseId,
      operator,
      notes: notes || undefined,
    }),
    [orderNumber, warehouseId, operator, notes],
  );

  // CRITICAL: useCallback for callbacks to prevent timer restarts
  const handleUploadSuccess = useCallback((message: string) => {
    console.log('Upload success:', message);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
    Alert.alert('Upload Error', error);
  }, []);

  // Timed capture hook
  const {
    uploadHistory,
    nextCaptureIn,
    lastPhotoUri,
    lastServerResponse,
    lastResponseTime,
    clearHistory,
    manualCapture,
  } = useTimedCapture({
    intervalSeconds: parseInt(intervalSeconds, 10) || 60,
    isActive,
    apiUrl,
    uploadData,
    onCapture: takePicture,
    onUploadSuccess: handleUploadSuccess,
    onUploadError: handleUploadError,
  });

  const handleToggleActive = () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to use this feature',
      );
      return;
    }

    if (!isActive) {
      // Check if camera is ready
      if (!isCameraReady) {
        Alert.alert(
          'Camera Not Ready',
          'Please wait for the camera to initialize',
        );
        return;
      }

      // Validate form before starting
      if (!orderNumber || !warehouseId || !operator) {
        Alert.alert(
          'Missing Information',
          'Please fill in Order Number, Warehouse ID, and Operator',
        );
        return;
      }

      const interval = parseInt(intervalSeconds, 10);
      if (Number.isNaN(interval) || interval < 5) {
        Alert.alert('Invalid Interval', 'Interval must be at least 5 seconds');
        return;
      }
    }

    setIsActive(!isActive);
  };

  const handleManualCapture = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to use this feature',
      );
      return;
    }

    if (!isCameraReady) {
      Alert.alert(
        'Camera Not Ready',
        'Please wait for the camera to initialize',
      );
      return;
    }

    if (!orderNumber || !warehouseId || !operator) {
      Alert.alert(
        'Missing Information',
        'Please fill in Order Number, Warehouse ID, and Operator',
      );
      return;
    }

    await manualCapture();
  };

  if (hasPermission === null) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Timed Photo Sender',
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg">Requesting camera permission...</Text>
        </View>
      </>
    );
  }

  if (hasPermission === false) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Timed Photo Sender',
          }}
        />
        <View className="flex-1 items-center justify-center bg-white p-4">
          <Text className="mb-4 text-center text-lg">
            Camera permission is required to use this app
          </Text>
          <Text className="text-center text-sm text-gray-600">
            Please enable camera access in your device settings
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Timed Photo Sender',
        }}
      />
      <ScrollView className="flex-1 bg-white">
        <View className="p-4">
          {/* Camera Preview - Hidden by default, visible when toggled */}
          {showCameraPreview ? (
            <View className="mb-4 overflow-hidden rounded-lg">
              <Camera
                ref={cameraRef}
                style={{ width: '100%', height: 400 }}
                type={CameraType.back}
                onCameraReady={onCameraReady}
              />
            </View>
          ) : (
            <View className="absolute right-2 top-2 h-1 w-1 overflow-hidden opacity-0">
              <Camera
                ref={cameraRef}
                style={{ width: 1, height: 1 }}
                type={CameraType.back}
                onCameraReady={onCameraReady}
              />
            </View>
          )}

          {/* Camera Preview Toggle Button */}
          <TouchableOpacity
            className="mb-4 rounded-lg bg-gray-600 p-3"
            onPress={() => setShowCameraPreview(!showCameraPreview)}
          >
            <Text className="text-center font-bold text-white">
              {showCameraPreview
                ? '📷 Ukryj podgląd kamery'
                : '📷 Pokaż podgląd kamery'}
            </Text>
          </TouchableOpacity>

          {/* Status Section */}
          <View className="mb-6 rounded-lg bg-gray-100 p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold">Status</Text>
              <View className="flex-row items-center">
                <Text className="mr-2 font-semibold">
                  {isActive ? '🟢 Active' : '⚫ Inactive'}
                </Text>
                <Switch value={isActive} onValueChange={handleToggleActive} />
              </View>
            </View>
            {isActive && (
              <Text className="text-sm text-gray-600">
                Next capture in: {nextCaptureIn} seconds
              </Text>
            )}
            {!isCameraReady && (
              <Text className="text-xs text-yellow-600">
                Camera initializing...
              </Text>
            )}
          </View>

          {/* Configuration Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-bold">Configuration</Text>

            <Text className="mb-1 text-sm font-semibold">API URL</Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.0.199:3005/api/upload"
              editable={!isActive}
              autoCapitalize="none"
            />

            <Text className="mb-1 text-sm font-semibold">
              Interval (seconds)
            </Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={intervalSeconds}
              onChangeText={setIntervalSeconds}
              placeholder="60"
              keyboardType="numeric"
              editable={!isActive}
            />

            <Text className="mb-1 text-sm font-semibold">Order Number *</Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={orderNumber}
              onChangeText={setOrderNumber}
              placeholder="ORD-123"
              editable={!isActive}
            />

            <Text className="mb-1 text-sm font-semibold">Warehouse ID *</Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={warehouseId}
              onChangeText={setWarehouseId}
              placeholder="WH-01"
              editable={!isActive}
            />

            <Text className="mb-1 text-sm font-semibold">Operator *</Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={operator}
              onChangeText={setOperator}
              placeholder="Jan Kowalski"
              editable={!isActive}
            />

            <Text className="mb-1 text-sm font-semibold">Notes (optional)</Text>
            <TextInput
              className="mb-3 rounded border border-gray-300 p-2"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes"
              multiline
              numberOfLines={3}
              editable={!isActive}
            />
          </View>

          {/* Manual Capture Button */}
          <TouchableOpacity
            className={`mb-6 rounded-lg p-4 ${
              isActive || isLoading ? 'bg-gray-400' : 'bg-blue-500'
            }`}
            onPress={handleManualCapture}
            disabled={isActive || isLoading}
          >
            <Text className="text-center font-bold text-white">
              {isLoading ? 'Processing...' : 'Manual Capture & Upload'}
            </Text>
          </TouchableOpacity>

          {/* Last Photo and Server Response Section */}
          {lastPhotoUri && (
            <View className="mb-6 rounded-lg bg-gray-100 p-4">
              <Text className="mb-3 text-lg font-bold">
                Ostatnie zdjęcie i odpowiedź
              </Text>

              {/* Last Photo Preview */}
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold">
                  Ostatnie wysłane zdjęcie:
                </Text>
                <Image
                  source={{ uri: lastPhotoUri }}
                  style={{ width: 120, height: 120 }}
                  className="rounded"
                  resizeMode="cover"
                />
              </View>

              {/* Server Response */}
              {lastServerResponse && (
                <View className="mb-3">
                  <Text className="mb-2 text-sm font-semibold">
                    Odpowiedź serwera:
                  </Text>
                  <View className="rounded bg-white p-2">
                    <Text className="font-mono text-xs text-gray-700">
                      {JSON.stringify(lastServerResponse, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Response Time */}
              {lastResponseTime !== null && (
                <View>
                  <Text className="text-sm">
                    <Text className="font-semibold">Czas odpowiedzi: </Text>
                    <Text className="text-green-700">{lastResponseTime}ms</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Upload History */}
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xl font-bold">Upload History</Text>
              {uploadHistory.length > 0 && (
                <TouchableOpacity onPress={clearHistory}>
                  <Text className="text-blue-500">Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadHistory.length === 0 ? (
              <Text className="py-4 text-center text-gray-500">
                No uploads yet
              </Text>
            ) : (
              <View>
                {uploadHistory
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <View
                      key={entry.timestamp.getTime()}
                      className={`mb-2 rounded p-3 ${
                        entry.success ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <View className="mb-1 flex-row justify-between">
                        <Text
                          className={`font-bold ${
                            entry.success ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {entry.success ? '✓ Success' : '✗ Failed'}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {entry.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text className="text-sm">{entry.message}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default Home;
