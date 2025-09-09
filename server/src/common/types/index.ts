export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
  errors?: any[];
}

export interface FilterOptions {
  search?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}
