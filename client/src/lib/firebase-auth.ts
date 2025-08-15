import { signInWithPhoneNumber, signInWithCredential, PhoneAuthProvider, ConfirmationResult, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db, initializeRecaptcha } from './firebase-config';
import type { User } from "@shared/firestore-schema";

export class FirebaseAuthService {
  private confirmationResult: ConfirmationResult | null = null;
  private user: User | null = null;

  constructor() {
    // Initialize from localStorage
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

  async sendOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate phone number format
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        return { success: false, error: 'Phone number is required' };
      }

      // Clean and validate phone number
      const cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
      
      // Check if it's a valid Indian phone number (10 digits, starting with 6-9)
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return { success: false, error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9' };
      }
      
      // Initialize reCAPTCHA
      const recaptcha = initializeRecaptcha();
      
      // Format phone number with country code
      const formattedPhone = `+91${cleanPhone}`;
      
      console.log('Attempting to send OTP to:', formattedPhone);
      console.log('Current domain:', window.location.hostname);
      
      // Clear any existing verification
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
        initializeRecaptcha(); // Reinitialize
      }
      
      // Send OTP
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptcha);
      
      console.log('OTP sent successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/argument-error') {
        return { 
          success: false, 
          error: 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number.'
        };
      }
      
      if (error.code === 'auth/invalid-phone-number') {
        return { 
          success: false, 
          error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.'
        };
      }
      
      if (error.code === 'auth/invalid-app-credential' || 
          error.code === 'auth/unauthorized-domain' ||
          error.message?.includes('not authorized') ||
          error.message?.includes('domain')) {
        return { 
          success: false, 
          error: `Domain authorization required. Please add ${window.location.hostname} to Firebase Console > Authentication > Settings > Authorized domains.`
        };
      }
      
      if (error.code === 'auth/quota-exceeded') {
        return { 
          success: false, 
          error: 'SMS quota exceeded. Please try again later.'
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send OTP. Please try again.' 
      };
    }
  }

  async verifyOTP(code: string): Promise<{ success: boolean; user?: User; needsProfile?: boolean; error?: string }> {
    try {
      if (!this.confirmationResult) {
        return { success: false, error: 'No OTP request found. Please request OTP first.' };
      }

      // Verify the code
      const result = await this.confirmationResult.confirm(code);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        // User exists, log them in
        const userData = userDoc.data() as User;
        this.setUser(userData);
        return { success: true, user: userData, needsProfile: !userData.name };
      } else {
        // New user, create profile
        const newUser: User = {
          id: firebaseUser.uid,
          phone: firebaseUser.phoneNumber || '',
          isVerified: true,
          createdAt: Timestamp.now() as any,
          updatedAt: Timestamp.now() as any,
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        this.setUser(newUser);
        return { success: true, user: newUser, needsProfile: true };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify OTP' 
      };
    }
  }

  async completeProfile(data: { name: string; email?: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        return { success: false, error: 'No authenticated user found' };
      }

      const updates = {
        name: data.name,
        email: data.email,
        updatedAt: Timestamp.now() as any,
      };

      await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
      
      // Update local user data
      const updatedUser = { ...this.user!, ...updates };
      this.setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Error completing profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete profile' 
      };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        this.setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  setUser(user: User) {
    this.user = user;
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  logout() {
    this.user = null;
    this.confirmationResult = null;
    localStorage.removeItem('user_data');
    auth.signOut();
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  requiresProfile(): boolean {
    return this.isAuthenticated() && (!this.user?.name || !this.user?.isVerified);
  }
}

export const firebaseAuthService = new FirebaseAuthService();