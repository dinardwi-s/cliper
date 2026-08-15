export const API_VERSION = 'v1';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}
