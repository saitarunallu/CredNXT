// Firebase Auth handles all authentication operations
// No additional auth service needed since Firebase provides:
// - Token generation and verification
// - OTP for phone authentication  
// - Password hashing and verification
// - Session management

export class AuthService {
  // All authentication operations handled by Firebase Auth
  // This service is kept for any future non-Firebase auth utilities
}

export const authService = new AuthService();
