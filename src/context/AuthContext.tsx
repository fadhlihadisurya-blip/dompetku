import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    if (signingIn) return;
    
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Popup terblokir. Mohon izinkan popup untuk masuk.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored, user just closed it
      } else {
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Email sign in error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email atau password salah.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Format email tidak valid.");
      } else {
        setError("Gagal masuk. Silakan coba lagi.");
      }
      throw err;
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setSigningIn(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Email sign up error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email sudah terdaftar.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password terlalu lemah.");
      } else {
        setError("Gagal mendaftar. Silakan coba lagi.");
      }
      throw err;
    } finally {
      setSigningIn(false);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError("Gagal mengirim email reset password.");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signingIn, 
      error, 
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      resetPassword, 
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
