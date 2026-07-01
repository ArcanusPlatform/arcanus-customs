import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { setUserContext, clearUserContext } from './api-service';
import type { AuthUser, SignupFormData } from '@/types';

type AuthContextType = {
  user: AuthUser;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  register: (data: SignupFormData) => Promise<boolean>;
  enterDemoMode: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'mdr-current-user';
const CURRENT_AUTH_USER_KEY = 'mdr-current-auth-user';

const isBrowser = () => typeof window !== 'undefined';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isBrowser() || initializedRef.current) return;
    initializedRef.current = true;
    const storedAuthUser = localStorage.getItem(CURRENT_AUTH_USER_KEY);
    if (storedAuthUser) {
      try {
        const authUser = JSON.parse(storedAuthUser) as NonNullable<AuthUser>;
        const authUserId = authUser.id;
        const declarantName = authUser.declarant_name || authUser.email;
        if (!authUserId || !declarantName) {
          throw new Error('Stored auth user is incomplete');
        }
        setUser(authUser);
        setUserContext({
          user_id: authUserId,
          user_type: authUser.user_type || 'AGENT',
          entity_id: authUser.entity_id,
          declarant_name: declarantName,
          declarant_capacity: authUser.declarant_capacity || 'agent',
          declarant_organisation_name: authUser.declarant_organisation_name,
        });
      } catch {
        localStorage.removeItem(CURRENT_AUTH_USER_KEY);
      }
    }
  }, []);

  async function login(username: string, password: string) {
    try {
      // Use hybrid API for login
      const { login: hybridLogin } = await import('./hybrid-api');
      const result = await hybridLogin(username, password);

      if (!result.success) {
        throw new Error('Invalid credentials');
      }

      const authUser: AuthUser = {
        id: result.user.id,
        username: result.user.email,
        email: result.user.email,
        user_type: 'AGENT',
        declarant_name: `${result.user.first_name} ${result.user.last_name}`,
        declarant_capacity: 'agent',
        declarant_organisation_name: result.user.company_name,
      };

      setUser(authUser);
      const authUserId = authUser.id || result.user.id;
      const declarantName = authUser.declarant_name || authUser.email || result.user.email;

      // Set user context for API calls
      setUserContext({
        user_id: authUserId,
        user_type: authUser.user_type || 'AGENT',
        entity_id: authUser.entity_id,
        declarant_name: declarantName,
        declarant_capacity: authUser.declarant_capacity || 'agent',
        declarant_organisation_name: authUser.declarant_organisation_name,
      });

      if (isBrowser()) {
        localStorage.setItem(CURRENT_USER_KEY, authUserId);
        localStorage.setItem(CURRENT_AUTH_USER_KEY, JSON.stringify(authUser));
      }

      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Login failed');
    }
  }

  /**
   * Register a new user with identity information
   *
   * This function:
   * - Validates all required fields
   * - Creates user account with declarant information
   * - Sets declarant_locked flag to true
   * - Returns success/error
   *
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async function register(data: SignupFormData) {
    if (!data.first_name.trim() || !data.last_name.trim()) {
      throw new Error('First name and last name are required.');
    }
    if (!data.email.trim() || !data.email.includes('@')) {
      throw new Error('Valid email address is required.');
    }
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (data.password !== data.password_confirm) {
      throw new Error('Passwords do not match.');
    }
    if (!data.user_type) {
      throw new Error('User type is required.');
    }
    if (!data.declarant_name.trim()) {
      throw new Error('Declarant name is required.');
    }
    if (!data.declarant_capacity) {
      throw new Error('Declarant capacity is required.');
    }
    if (data.user_type === 'AGENT' && !data.declarant_organisation_name.trim()) {
      throw new Error('Organisation name is required for agent users.');
    }
    if (data.user_type === 'SELF' && !data.entity_type) {
      throw new Error('Entity type is required for self users.');
    }

    const { register: hybridRegister } = await import('./hybrid-api');
    await hybridRegister({
      company_name:
        data.user_type === 'AGENT' ? data.declarant_organisation_name : data.declarant_name,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password: data.password,
    });

    return login(data.email, data.password);
  }

  function logout() {
    // Use hybrid API logout
    import('./hybrid-api').then(({ logout: hybridLogout }) => {
      hybridLogout();
    });

    // Clear user context
    clearUserContext();

    setUser(null);
    if (isBrowser()) {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(CURRENT_AUTH_USER_KEY);
    }
  }

  async function enterDemoMode() {
    const demoEmail = (import.meta as any).env?.VITE_DEMO_EMAIL;
    const demoPassword = (import.meta as any).env?.VITE_DEMO_PASSWORD;
    if (!demoEmail || !demoPassword) {
      throw new Error('Demo credentials are not configured.');
    }
    await login(demoEmail, demoPassword);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
