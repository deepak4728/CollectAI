import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, UserRole } from '../types';
import { api } from '../lib/api';
import { auth, loginWithGoogle, logoutUser, testFirestoreConnection } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  organization: Organization | null;
  role: UserRole;
  allUsers: User[];
  allOrgs: Organization[];
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => void;
  setCustomerView: () => void;
  refreshOrgs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole>('org_admin');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrgs = async () => {
    try {
      const res = await api.getOrganizations();
      setAllOrgs(res.organizations || []);
    } catch (e) {
      console.error('Failed to load organizations', e);
    }
  };

  useEffect(() => {
    testFirestoreConnection();

    // Listen to real-time Firebase Authentication
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setUser({
          id: fbUser.uid,
          email: fbUser.email || 'user@example.com',
          displayName: fbUser.displayName || 'Google User',
          platformRole: fbUser.email?.includes('admin') ? 'super_admin' : 'user',
          createdAt: new Date().toISOString(),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [usersRes, orgsRes] = await Promise.all([
          api.getUsers(),
          api.getOrganizations(),
        ]);
        setAllUsers(usersRes.users || []);
        setAllOrgs(orgsRes.organizations || []);

        // Default initial setup
        if (!firebaseUser) {
          const defaultUser = usersRes.users.find(u => u.id === 'user_csc_admin') || usersRes.users[0];
          if (defaultUser) {
            const loginData = await api.login(defaultUser.id);
            setUser(loginData.user);
            setRole(loginData.role as UserRole);
            const activeOrg = orgsRes.organizations.find(o => o.id === loginData.activeOrgId) || orgsRes.organizations[0];
            setOrganization(activeOrg || null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [firebaseUser]);

  const handleSignInGoogle = async () => {
    try {
      const userRes = await loginWithGoogle();
      if (userRes) {
        setRole('org_admin');
      }
    } catch (e) {
      console.error('Sign-in failed:', e);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setFirebaseUser(null);
  };

  const switchDemoUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const loginData = await api.login(userId);
      setUser(loginData.user);
      setRole(loginData.role as UserRole);

      let matchedOrg = allOrgs.find(o => o.id === loginData.activeOrgId);
      if (!matchedOrg && allOrgs.length > 0) {
        matchedOrg = allOrgs[0];
      }
      setOrganization(matchedOrg || null);
    } catch (err) {
      console.error('Switch user error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = (orgId: string) => {
    const target = allOrgs.find(o => o.id === orgId);
    if (target) {
      setOrganization(target);
    }
  };

  const setCustomerView = () => {
    setRole('customer');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        organization,
        role,
        allUsers,
        allOrgs,
        isLoading,
        signInWithGoogle: handleSignInGoogle,
        signOut: handleSignOut,
        switchDemoUser,
        switchOrganization,
        setCustomerView,
        refreshOrgs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
