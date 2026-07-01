// Hybrid Auth Wrapper
// Integrates hybrid API with existing auth system

import {
  login as hybridLogin,
  register as hybridRegister,
  logout as hybridLogout,
  isDemoMode,
  getCurrentMode,
} from './hybrid-api';

// Enhanced login that uses hybrid API
export async function loginWithHybrid(email: string, password: string) {
  try {
    const result = await hybridLogin(email, password);

    if (result.mode === 'demo') {
      // Demo mode: Mark as demo user
      localStorage.setItem('user_mode', 'demo');
      return {
        success: true,
        user: result.user,
        mode: 'demo',
      };
    } else {
      // Production mode: Real user from backend
      localStorage.setItem('user_mode', 'production');
      return {
        success: true,
        user: result.user,
        token: result.token,
        mode: 'production',
      };
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Enhanced register that always uses backend
export async function registerWithHybrid(data: {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}) {
  try {
    const result = await hybridRegister(data);
    localStorage.setItem('user_mode', 'production');
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

// Logout
export function logoutHybrid() {
  hybridLogout();
  localStorage.removeItem('user_mode');
}

// Check current mode
export function getUserMode(): 'demo' | 'production' | null {
  return getCurrentMode();
}

// Check if demo
export function isDemo(): boolean {
  return isDemoMode();
}
