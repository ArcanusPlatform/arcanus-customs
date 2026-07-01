import { verifyToken } from '../services/auth-service.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    req.userId = decoded.user_id;
    req.userEmail = decoded.email;
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      company_id: decoded.company_id,
      role: decoded.role
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication
 * Doesn't fail if no auth provided
 */
export function optionalAuth(req, res, next) {
  try {
    authenticate(req, res, next);
  } catch (error) {
    req.userId = null;
    next();
  }
}
