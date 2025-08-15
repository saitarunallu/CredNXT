import { signInWithPhoneNumber, signInWithCredential, PhoneAuthProvider, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, initializeRecaptcha } from './firebase-config';
import { apiRequest } from './queryClient';
import type { LoginRequest, VerifyOtpRequest, CompleteProfileRequest, User } from "@shared/firestore-schema";

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Initialize from localStorage
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        this.logout();
      }
    }
  }

  async login(data: LoginRequest) {
    const response = await apiRequest('POST', '/api/auth/login', data);
    return response.json();
  }

  async verifyOtp(data: VerifyOtpRequest) {
    const response = await apiRequest('POST', '/api/auth/verify-otp', data);
    const result = await response.json();
    
    if (result.token) {
      this.setAuth(result.token, result.user);
    }
    
    return result;
  }

  async completeProfile(data: CompleteProfileRequest) {
    if (!this.token) {
      throw new Error('No authentication token available');
    }
    
    const response = await apiRequest('POST', '/api/auth/complete-profile', data, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    const result = await response.json();
    
    if (result.user) {
      this.setUser(result.user);
    }
    
    return result;
  }

  async getCurrentUser() {
    if (!this.token) return null;
    
    try {
      const response = await apiRequest('GET', '/api/auth/me', undefined, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      const result = await response.json();
      
      if (result.user) {
        this.setUser(result.user);
      }
      
      return result.user;
    } catch (error) {
      console.error('getCurrentUser error:', error);
      // Only logout if it's a 401 error, not network issues
      if (error instanceof Error && error.message.includes('401')) {
        this.logout();
      }
      return null;
    }
  }

  // Method to validate current authentication state
  async validateAuth(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }

  setAuth(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  setUser(user: User) {
    this.user = user;
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  requiresProfile(): boolean {
    return this.isAuthenticated() && (!this.user?.name || !this.user?.isVerified);
  }
}

export const authService = new AuthService();
