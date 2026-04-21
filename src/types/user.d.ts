interface MeResponse {
  id: string;
  email: string;
  nickname: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
