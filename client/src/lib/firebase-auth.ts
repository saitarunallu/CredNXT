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
        const parsedUser = JSON.parse(userData);
        
        // Validate and clean the parsed user data
        if (parsedUser && typeof parsedUser === 'object') {
          this.user = {
            ...parsedUser,
            name: parsedUser.name ? String(parsedUser.name) : undefined,
            email: parsedUser.email ? String(parsedUser.email) : undefined,
            phone: parsedUser.phone ? String(parsedUser.phone) : parsedUser.phone
          };
          
          // Ensure we have a valid Firebase token
          this.refreshToken().catch(error => {
            console.warn('Could not refresh Firebase token on startup:', error);
          });
        }
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
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('reCAPTCHA clear failed:', e);
        }
        window.recaptchaVerifier = undefined;
      }
      
      // Reinitialize reCAPTCHA
      const freshRecaptcha = initializeRecaptcha();
      
      // Store phone number for verification step
      localStorage.setItem('pending_phone', cleanPhone);
      
      // Send OTP - check if auth is available
      if (!auth) {
        return { success: false, error: 'Authentication service not available. Please refresh the page and try again.' };
      }
      
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, freshRecaptcha);
      
      console.log('OTP sent successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/argument-error') {
        return { 
          success: false, 
          error: 'Invalid phone number format. Please enter a valid Indian mobile number.' 
        };
      }
      
      if (error.code === 'auth/invalid-phone-number') {
        return { 
          success: false, 
          error: 'Invalid phone number format. Please check your number and try again.' 
        };
      }
      
      if (error.code === 'auth/too-many-requests') {
        return { 
          success: false, 
          error: 'Too many SMS requests. Please wait a few minutes before requesting another OTP.' 
        };
      }
      
      if (error.code === 'auth/app-not-authorized') {
        return { 
          success: false, 
          error: 'This domain is not authorized. Please contact support or try again later.' 
        };
      }
      
      if (error.code === 'auth/quota-exceeded') {
        return { 
          success: false, 
          error: 'SMS quota exceeded. Please try again later or contact support.' 
        };
      }
      
      if (error.message?.includes('reCAPTCHA') || error.code === 'auth/captcha-check-failed') {
        return { 
          success: false, 
          error: 'Security verification failed. Please refresh the page and try again.' 
        };
      }
      
      if (error.code === 'auth/missing-app-credential') {
        return { 
          success: false, 
          error: 'Authentication configuration error. Please contact support.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Failed to send OTP. Please try again.' 
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
      if (!db) {
        return { success: false, error: 'Database service not available. Please refresh the page and try again.' };
      }
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        // User exists, log them in
        const userData = userDoc.data() as User;
        await this.setUser(userData);
        const needsProfile = !userData.name || !userData.name.trim();
        console.log('Existing user login:', { userData, needsProfile, hasName: !!userData.name });
        return { success: true, user: userData, needsProfile };
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
        await this.setUser(newUser);
        return { success: true, user: newUser, needsProfile: true };
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-verification-code') {
        return { 
          success: false, 
          error: 'Invalid OTP code. Please check the code and try again.' 
        };
      }
      
      if (error.code === 'auth/code-expired') {
        return { 
          success: false, 
          error: 'OTP code has expired. Please request a new code.' 
        };
      }
      
      if (error.code === 'auth/session-expired') {
        return { 
          success: false, 
          error: 'Verification session expired. Please start over.' 
        };
      }
      
      if (error.code === 'auth/too-many-requests') {
        return { 
          success: false, 
          error: 'Too many failed attempts. Please wait before trying again.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Failed to verify OTP. Please check the code and try again.' 
      };
    }
  }

  async completeProfile(name: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!auth || !auth.currentUser || !this.user) {
        return { success: false, error: 'User not authenticated. Please log in again.' };
      }
      
      if (!db) {
        return { success: false, error: 'Database service not available. Please refresh the page and try again.' };
      }
      
      // Validate name
      if (!name || name.trim().length < 2) {
        return { success: false, error: 'Please provide a valid name (at least 2 characters).' };
      }

      // Ensure name and email are stored as strings, not objects
      const updateData: any = {
        name: String(name), // Force string conversion
        updatedAt: Timestamp.now(),
      };
      
      // Only add email if it has a value, and ensure it's a string
      if (email && email.trim() !== '') {
        updateData.email = String(email);
      }

      await updateDoc(doc(db, 'users', this.user.id), updateData);

      // Create clean user data object
      const userData = {
        ...this.user,
        name: String(name),
        email: email && email.trim() !== '' ? String(email) : this.user.email,
        updatedAt: Timestamp.now() as any,
      };

      await this.setUser(userData);
      console.log('Profile completion: Updated user data:', userData);
      return { success: true };
    } catch (error) {
      console.error('Error completing profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete profile' 
      };
    }
  }

  getUser(): User | null {
    return this.user;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!auth || !db) return null;
    
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const rawUserData = userDoc.data();
        
        // Fix corrupted name field if it's an object instead of string
        let userData = rawUserData as User;
        
        console.log('Raw user data from Firestore:', JSON.stringify(rawUserData));
        console.log('Name field type:', typeof rawUserData.name, 'Value:', rawUserData.name);
        
        if (rawUserData.name && typeof rawUserData.name === 'object') {
          console.log('🔧 Fixing corrupted name field for user:', firebaseUser.uid);
          console.log('Corrupted name object:', JSON.stringify(rawUserData.name));
          
          // Extract the actual name from the nested object
          const nameValue = rawUserData.name.name || rawUserData.name.email || rawUserData.name.displayName || 'Unknown User';
          const emailValue = rawUserData.name.email;
          
          // Update the document in Firestore to fix the corruption
          const updateData: any = {
            name: String(nameValue),
            updatedAt: Timestamp.now()
          };
          
          if (emailValue && !rawUserData.email) {
            updateData.email = String(emailValue);
          }
          
          await updateDoc(doc(db, 'users', firebaseUser.uid), updateData);
          
          // Return the corrected user data
          userData = {
            ...rawUserData,
            name: String(nameValue),
            email: emailValue && !rawUserData.email ? String(emailValue) : rawUserData.email
          } as User;
        } else {
          // Even for non-corrupted data, ensure all string fields are properly converted
          userData = {
            ...rawUserData,
            name: rawUserData.name ? String(rawUserData.name) : 'Unknown User',
            email: rawUserData.email ? String(rawUserData.email) : '',
            phone: rawUserData.phone ? String(rawUserData.phone) : ''
          } as User;
        }
        
        console.log('Final cleaned user data:', JSON.stringify(userData));
        this.setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  setUser(user: User) {
    // Ensure string fields are properly serialized
    const cleanUser = {
      ...user,
      name: user.name ? String(user.name) : undefined,
      email: user.email ? String(user.email) : undefined,
      phone: user.phone ? String(user.phone) : user.phone
    };
    
    this.user = cleanUser;
    
    try {
      localStorage.setItem('user_data', JSON.stringify(cleanUser));
    } catch (error) {
      console.error('Failed to save user data to localStorage:', error);
    }
    
    // Get Firebase ID token and store it (async but don't await)
    this.refreshToken().catch(error => {
      console.error('Failed to refresh token in setUser:', error);
    });
  }

  async refreshToken() {
    if (!auth) return null;
    
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken(true); // Force refresh
        localStorage.setItem('firebase_auth_token', idToken);
        console.log('Firebase token refreshed and stored');
        return idToken;
      } catch (error) {
        console.error('Error getting Firebase ID token:', error);
        // Don't re-throw the error to prevent unhandled rejections
        return null;
      }
    }
    return null;
  }

  async logout() {
    this.user = null;
    this.confirmationResult = null;
    localStorage.removeItem('user_data');
    localStorage.removeItem('firebase_auth_token');
    localStorage.removeItem('pending_phone');
    
    try {
      if (auth) {
        await auth.signOut();
      }
    } catch (error) {
      console.error('Error during Firebase logout:', error);
      // Don't re-throw to prevent unhandled rejections
    }
  }

  isAuthenticated(): boolean {
    return !!(auth && auth.currentUser);
  }

  requiresProfile(): boolean {
    const isAuth = this.isAuthenticated();
    const hasName = !!this.user?.name;
    const userName = this.user?.name;
    
    console.log('requiresProfile check:', {
      isAuthenticated: isAuth,
      hasName,
      userName,
      user: this.user,
      needsProfile: isAuth && !hasName
    });
    
    return isAuth && !hasName;
  }
}

export const firebaseAuthService = new FirebaseAuthService();