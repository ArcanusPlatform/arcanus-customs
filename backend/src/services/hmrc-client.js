import fetch from 'node-fetch';
import db, { storage } from '../config/database.js';

/**
 * HMRC CDS API Client
 * Handles OAuth authentication and API calls
 */
export class HMRCClient {
  constructor(userId) {
    this.userId = userId;
    this.baseUrl = process.env.HMRC_API_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
    this.authUrl = process.env.HMRC_AUTH_URL || 'https://test-api.service.hmrc.gov.uk/oauth/token';
  }

  /**
   * Get user's HMRC credentials
   */
  getUserCredentials() {
    return Array.from(storage.credentials.values())
      .find(c => c.user_id === this.userId && c.is_active);
  }

  /**
   * Get or refresh access token
   */
  async getAccessToken() {
    // Check if we have a valid cached token
    const cachedToken = this.getCachedToken();
    if (cachedToken) {
      return cachedToken.access_token;
    }

    // Get user credentials
    const credentials = this.getUserCredentials();
    if (!credentials) {
      throw new Error('HMRC credentials not configured. Please add your credentials in Settings.');
    }

    // Request new token
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        scope: 'read:customs-declarations write:customs-declarations'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HMRC authentication failed: ${error}`);
    }

    const data = await response.json();
    
    // Cache the token
    this.cacheToken(data.access_token, data.expires_in || 14400);
    
    return data.access_token;
  }

  /**
   * Get cached token if still valid
   */
  getCachedToken() {
    const tokens = Array.from(storage.tokens.values())
      .filter(t => t.user_id === this.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (tokens.length === 0) return null;
    
    const token = tokens[0];
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (expiresAt > fiveMinutesFromNow) {
      return token;
    }
    
    return null;
  }

  /**
   * Cache access token
   */
  cacheToken(accessToken, expiresIn) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const id = `token-${Date.now()}`;
    
    storage.tokens.set(id, {
      id,
      user_id: this.userId,
      access_token: accessToken,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HMRC API error: ${response.status} - ${error}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * Get declaration by MRN
   */
  async getDeclaration(mrn) {
    return this.request(`/customs/declarations/${mrn}`);
  }

  /**
   * List declarations
   */
  async listDeclarations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/customs/declarations${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Submit declaration
   */
  async submitDeclaration(declaration) {
    return this.request('/customs/declarations', {
      method: 'POST',
      body: JSON.stringify(declaration)
    });
  }

  /**
   * Test connection with user's credentials
   */
  async testConnection() {
    try {
      const token = await this.getAccessToken();
      return {
        success: true,
        message: 'Successfully connected to HMRC API',
        hasToken: !!token
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

/**
 * Save user's HMRC credentials
 */
export function saveUserCredentials(userId, credentials) {
  // Deactivate existing credentials
  for (const [id, cred] of storage.credentials) {
    if (cred.user_id === userId) {
      cred.is_active = false;
    }
  }

  // Insert new credentials
  const id = `cred-${Date.now()}`;
  storage.credentials.set(id, {
    id,
    user_id: userId,
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    environment: credentials.environment || 'sandbox',
    is_active: true,
    created_at: new Date().toISOString()
  });

  return { success: true };
}

/**
 * Get user's HMRC credentials (masked)
 */
export function getUserCredentials(userId) {
  const creds = Array.from(storage.credentials.values())
    .find(c => c.user_id === userId && c.is_active);
  
  if (creds) {
    return {
      id: creds.id,
      client_id_masked: creds.client_id.substring(0, 8) + '...',
      environment: creds.environment,
      is_active: creds.is_active,
      created_at: creds.created_at
    };
  }
  
  return null;
}

/**
 * Delete user's HMRC credentials
 */
export function deleteUserCredentials(userId) {
  // Delete credentials
  for (const [id, cred] of storage.credentials) {
    if (cred.user_id === userId) {
      storage.credentials.delete(id);
    }
  }

  // Delete tokens
  for (const [id, token] of storage.tokens) {
    if (token.user_id === userId) {
      storage.tokens.delete(id);
    }
  }

  return { success: true };
}
