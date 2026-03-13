export class AuthError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "AuthError";
  }
}
