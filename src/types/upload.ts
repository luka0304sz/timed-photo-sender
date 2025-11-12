// Dynamic key-value pairs for upload metadata
export type UploadData = Record<string, string>;

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface PhotoUploadConfig {
  apiUrl: string;
  intervalSeconds: number;
  isActive: boolean;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  responseTime?: number; // Time in milliseconds from request to response
  responseData?: any; // Full server response data
}
