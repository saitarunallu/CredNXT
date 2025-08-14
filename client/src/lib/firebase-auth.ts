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
      // Initialize reCAPTCHA
      const recaptcha = initializeRecaptcha();
      
      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      // Send OTP
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptcha);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send OTP' 
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