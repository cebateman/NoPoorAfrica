import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, secondaryAuth, db, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

/**
 * Roles:
 *  - 'admin': Full access — upload data, manage users, control dashboard visibility
 *  - 'viewer': Read-only — sees dashboard with sections admin has made visible
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // Firebase Auth user
  const [profile, setProfile] = useState(null); // { role, email, displayName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // If Firebase isn't configured, run in local-only mode (no auth required)
  const authEnabled = isFirebaseConfigured;

  // Listen for auth state changes
  useEffect(() => {
    if (!authEnabled) {
      setLoading(false);
      setProfile({ role: 'admin', email: 'local', displayName: 'Local Admin' });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data());
          } else {
            // First-ever user becomes admin
            const usersSnap = await getDocs(collection(db, 'users'));
            const role = usersSnap.empty ? 'admin' : 'viewer';
            const newProfile = {
              role,
              email: firebaseUser.email,
              displayName: firebaseUser.email.split('@')[0],
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile({ ...newProfile, createdAt: new Date() });
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setProfile({ role: 'viewer', email: firebaseUser.email, displayName: firebaseUser.email });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [authEnabled]);

  const isAdmin = profile?.role === 'admin';
  const isViewer = profile?.role === 'viewer';

  // Sign in
  const login = useCallback(async (email, password) => {
    if (!authEnabled) return;
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : err.message;
      setError(msg);
      throw err;
    }
  }, [authEnabled]);

  // Register (only used for initial admin setup)
  const register = useCallback(async (email, password) => {
    if (!authEnabled) return;
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : err.message;
      setError(msg);
      throw err;
    }
  }, [authEnabled]);

  // Sign out
  const logout = useCallback(async () => {
    if (!authEnabled) return;
    await firebaseSignOut(auth);
    setProfile(null);
  }, [authEnabled]);

  // Admin: create a new viewer account
  const createViewerAccount = useCallback(async (email, password, displayName) => {
    if (!authEnabled || !isAdmin) throw new Error('Unauthorized');
    try {
      // Use secondary auth instance so the admin stays logged in
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newProfile = {
        role: 'viewer',
        email,
        displayName: displayName || email.split('@')[0],
        allowedPages: ['dashboard', 'donors'],
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      // Sign out the secondary auth instance
      await firebaseSignOut(secondaryAuth);
      return { uid: cred.user.uid, ...newProfile };
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : err.message;
      throw new Error(msg);
    }
  }, [authEnabled, isAdmin]);

  // Admin: list all users
  const listUsers = useCallback(async () => {
    if (!authEnabled || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error listing users:', err);
      return [];
    }
  }, [authEnabled]);

  // Admin: delete a viewer account (removes profile only — Firebase Auth user stays but can't access data)
  const removeUser = useCallback(async (uid) => {
    if (!authEnabled || !isAdmin) throw new Error('Unauthorized');
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error('Error removing user:', err);
      throw err;
    }
  }, [authEnabled, isAdmin]);

  // Admin: update a user's role
  const updateUserRole = useCallback(async (uid, newRole) => {
    if (!authEnabled || !isAdmin) throw new Error('Unauthorized');
    await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
  }, [authEnabled, isAdmin]);

  // Admin: update which pages a user can access
  const updateUserPages = useCallback(async (uid, allowedPages) => {
    if (!authEnabled || !isAdmin) throw new Error('Unauthorized');
    await setDoc(doc(db, 'users', uid), { allowedPages }, { merge: true });
  }, [authEnabled, isAdmin]);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    profile,
    loading,
    error,
    authEnabled,
    isAdmin,
    isViewer,
    login,
    register,
    logout,
    createViewerAccount,
    listUsers,
    removeUser,
    updateUserRole,
    updateUserPages,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
