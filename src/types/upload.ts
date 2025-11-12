export interface UploadData {
  orderNumber: string;
  warehouseId: string;
  operator: string;
  notes?: string;
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
