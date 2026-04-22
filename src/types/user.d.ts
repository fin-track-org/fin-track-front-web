interface MeResponse {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserUpdateReq {
  nickname: string;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
