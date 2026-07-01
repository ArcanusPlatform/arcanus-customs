import { verifyToken } from '../services/auth-service.js';
import { getTenantDatabase } from '../config/tenant-database.js';

// Middleware to extract JWT and attach tenant database to request
export function tenantMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify and decode token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      company_id: decoded.company_id,
      role: decoded.role
    };

    // Attach tenant database connection
    try {
      req.tenantDb = getTenantDatabase(decoded.company_id);
    } catch (error) {
      console.error('Failed to get tenant database:', error);
      return res.status(500).json({ error: 'Failed to access company database' });
    }

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to check if user is admin
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
