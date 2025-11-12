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
import type { KeyValuePair, UploadData } from '@/types/upload';

const Home = () => {
  // Form state
  const [apiUrl, setApiUrl] = useState('http://192.168.0.199:3005/api/upload');
  const [intervalSeconds, setIntervalSeconds] = useState('60');
  const [isActive, setIsActive] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  // Dynamic key-value pairs for upload metadata
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([
    { key: 'orderNumber', value: 'ORD-123' },
    { key: 'warehouseId', value: 'WH-01' },
  ]);

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
  const uploadData: UploadData = useMemo(() => {
    const data: UploadData = {};
    keyValuePairs.forEach((pair) => {
      if (pair.key && pair.value) {
        data[pair.key] = pair.value;
      }
    });
    return data;
  }, [keyValuePairs]);

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

  // Key-value pair management
  const addKeyValuePair = () => {
    setKeyValuePairs([...keyValuePairs, { key: '', value: '' }]);
  };

  const removeKeyValuePair = (index: number) => {
    setKeyValuePairs(keyValuePairs.filter((_, i) => i !== index));
  };

  const updateKey = (index: number, newKey: string) => {
    const updated = [...keyValuePairs];
    updated[index] = { key: newKey, value: updated[index]?.value || '' };
    setKeyValuePairs(updated);
  };

  const updateValue = (index: number, newValue: string) => {
    const updated = [...keyValuePairs];
    updated[index] = { key: updated[index]?.key || '', value: newValue };
    setKeyValuePairs(updated);
  };

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
      const hasValidPairs = keyValuePairs.some(
        (pair) => pair.key && pair.value,
      );
      if (!hasValidPairs) {
        Alert.alert(
          'Missing Information',
          'Please add at least one key-value pair',
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

    const hasValidPairs = keyValuePairs.some((pair) => pair.key && pair.value);
    if (!hasValidPairs) {
      Alert.alert(
        'Missing Information',
        'Please add at least one key-value pair',
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
        <View className="flex-1 items-center justify-center bg-gray-900">
          <Text className="text-lg text-white">
            Requesting camera permission...
          </Text>
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
        <View className="flex-1 items-center justify-center bg-gray-900 p-4">
          <Text className="mb-4 text-center text-lg text-white">
            Camera permission is required to use this app
          </Text>
          <Text className="text-center text-sm text-gray-400">
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
      <ScrollView className="flex-1 bg-gray-900">
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
            className="mb-4 rounded-lg bg-gray-700 p-3"
            onPress={() => setShowCameraPreview(!showCameraPreview)}
          >
            <Text className="text-center font-bold text-white">
              {showCameraPreview
                ? '📷 Hide Camera Preview'
                : '📷 Show Camera Preview'}
            </Text>
          </TouchableOpacity>

          {/* Status Section */}
          <View className="mb-6 rounded-lg bg-gray-800 p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Status</Text>
              <View className="flex-row items-center">
                <Text className="mr-2 font-semibold text-white">
                  {isActive ? '🟢 Active' : '⚫ Inactive'}
                </Text>
                <Switch value={isActive} onValueChange={handleToggleActive} />
              </View>
            </View>
            {isActive && (
              <Text className="text-sm text-gray-400">
                Next capture in: {nextCaptureIn} seconds
              </Text>
            )}
            {!isCameraReady && (
              <Text className="text-xs text-yellow-500">
                Camera initializing...
              </Text>
            )}
          </View>

          {/* Configuration Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-bold text-white">
              Configuration
            </Text>

            <Text className="mb-1 text-sm font-semibold text-gray-300">
              API URL
            </Text>
            <TextInput
              className="mb-3 rounded border border-gray-600 bg-gray-800 p-2 text-white"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.0.199:3005/api/upload"
              placeholderTextColor="#9CA3AF"
              editable={!isActive}
              autoCapitalize="none"
            />

            <Text className="mb-1 text-sm font-semibold text-gray-300">
              Interval (seconds)
            </Text>
            <TextInput
              className="mb-3 rounded border border-gray-600 bg-gray-800 p-2 text-white"
              value={intervalSeconds}
              onChangeText={setIntervalSeconds}
              placeholder="60"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              editable={!isActive}
            />

            {/* Dynamic Key-Value Pairs */}
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-300">
                Upload Metadata
              </Text>
              <TouchableOpacity
                className="rounded-lg bg-green-600 px-3 py-1"
                onPress={addKeyValuePair}
                disabled={isActive}
              >
                <Text className="font-bold text-white">+ Add Field</Text>
              </TouchableOpacity>
            </View>

            {keyValuePairs.map((pair, index) => (
              <View
                // eslint-disable-next-line react/no-array-index-key
                key={`field-${index}-${pair.key}`}
                className="mb-3 rounded-lg bg-gray-800 p-3"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-gray-400">
                    Field {index + 1}
                  </Text>
                  {keyValuePairs.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeKeyValuePair(index)}
                      disabled={isActive}
                    >
                      <Text className="font-bold text-red-500">✕ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text className="mb-1 text-xs text-gray-400">Key</Text>
                <TextInput
                  className="mb-2 rounded border border-gray-600 bg-gray-700 p-2 text-white"
                  value={pair.key}
                  onChangeText={(text) => updateKey(index, text)}
                  placeholder="e.g., orderNumber"
                  placeholderTextColor="#6B7280"
                  editable={!isActive}
                  autoCapitalize="none"
                />

                <Text className="mb-1 text-xs text-gray-400">Value</Text>
                <TextInput
                  className="rounded border border-gray-600 bg-gray-700 p-2 text-white"
                  value={pair.value}
                  onChangeText={(text) => updateValue(index, text)}
                  placeholder="e.g., ORD-123"
                  placeholderTextColor="#6B7280"
                  editable={!isActive}
                />
              </View>
            ))}
          </View>

          {/* Manual Capture Button */}
          <TouchableOpacity
            className={`mb-6 rounded-lg p-4 ${
              isActive || isLoading ? 'bg-gray-600' : 'bg-blue-600'
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
            <View className="mb-6 rounded-lg bg-gray-800 p-4">
              <Text className="mb-3 text-lg font-bold text-white">
                Last Photo & Response
              </Text>

              {/* Last Photo Preview */}
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold text-gray-300">
                  Last uploaded photo:
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
                  <Text className="mb-2 text-sm font-semibold text-gray-300">
                    Server response:
                  </Text>
                  <View className="rounded bg-gray-700 p-2">
                    <Text className="font-mono text-xs text-gray-300">
                      {JSON.stringify(lastServerResponse, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Response Time */}
              {lastResponseTime !== null && (
                <View>
                  <Text className="text-sm text-gray-300">
                    <Text className="font-semibold">Response time: </Text>
                    <Text className="text-green-400">{lastResponseTime}ms</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Upload History */}
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">
                Upload History
              </Text>
              {uploadHistory.length > 0 && (
                <TouchableOpacity onPress={clearHistory}>
                  <Text className="text-blue-400">Clear</Text>
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
                        entry.success ? 'bg-green-900' : 'bg-red-900'
                      }`}
                    >
                      <View className="mb-1 flex-row justify-between">
                        <Text
                          className={`font-bold ${
                            entry.success ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          {entry.success ? '✓ Success' : '✗ Failed'}
                        </Text>
                        <Text className="text-sm text-gray-400">
                          {entry.timestamp.toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-200">
                        {entry.message}
                      </Text>
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
