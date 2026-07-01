import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { queryAuth, getAuthDb } from '../config/auth-database.js';
import { createTenantDatabase } from '../config/tenant-database.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const JWT_EXPIRES_IN = '24h';

// Helper to create slug from company name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// Helper to ensure slug is unique
async function ensureUniqueSlug(baseSlug) {
  const { useSQLite } = getAuthDb();
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const checkSql = useSQLite
      ? 'SELECT id FROM companies WHERE slug = ?'
      : 'SELECT id FROM companies WHERE slug = $1';
    
    const result = await queryAuth(checkSql, [slug]);
    const exists = useSQLite ? result.length > 0 : result.rows.length > 0;

    if (!exists) {
      return slug;
    }

    // Append counter to make it unique
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Register new company and admin user
export async function registerCompany(data) {
  const { company_name, first_name, last_name, email, password } = data;

  // Validate input
  if (!company_name || !email || !password || !first_name || !last_name) {
    throw new Error('All fields are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const { useSQLite } = getAuthDb();

  // Check if email already exists
  const existingUserSql = useSQLite
    ? 'SELECT id FROM users WHERE email = ?'
    : 'SELECT id FROM users WHERE email = $1';
  
  const existingUsers = await queryAuth(existingUserSql, [email]);
  const userExists = useSQLite ? existingUsers.length > 0 : existingUsers.rows.length > 0;

  if (userExists) {
    throw new Error('Email already registered');
  }

  // Generate IDs
  const companyId = randomUUID();
  const userId = randomUUID();
  const baseSlug = createSlug(company_name);
  const slug = await ensureUniqueSlug(baseSlug);
  const databaseName = `tenant_${companyId}`;

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    // Create company
    const createCompanySql = useSQLite
      ? 'INSERT INTO companies (id, name, slug, database_name) VALUES (?, ?, ?, ?)'
      : 'INSERT INTO companies (id, name, slug, database_name) VALUES ($1, $2, $3, $4)';
    
    await queryAuth(createCompanySql, [companyId, company_name, slug, databaseName]);

    // Create tenant database
    createTenantDatabase(companyId);

    // Create admin user
    const createUserSql = useSQLite
      ? 'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
      : 'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    
    await queryAuth(createUserSql, [
      userId,
      companyId,
      email,
      passwordHash,
      first_name,
      last_name,
      'admin'
    ]);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: userId,
        company_id: companyId,
        email,
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      company_id: companyId,
      user_id: userId,
      token,
      user: {
        id: userId,
        email,
        first_name,
        last_name,
        company_id: companyId,
        company_name,
        role: 'admin'
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    // Provide user-friendly error messages
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')) {
      throw new Error('Email already registered or company name already exists');
    }
    throw new Error('Failed to register company: ' + error.message);
  }
}

// Login user
export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const { useSQLite } = getAuthDb();

  // Get user with company info
  const getUserSql = useSQLite
    ? `SELECT u.*, c.name as company_name, c.is_active as company_active
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = ?`
    : `SELECT u.*, c.name as company_name, c.is_active as company_active
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`;

  const result = await queryAuth(getUserSql, [email]);
  const user = useSQLite ? result[0] : result.rows[0];

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.is_active || !user.company_active) {
    throw new Error('Account is inactive');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  const updateLoginSql = useSQLite
    ? 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    : 'UPDATE users SET last_login = NOW() WHERE id = $1';
  
  await queryAuth(updateLoginSql, [user.id]);

  // Generate JWT token
  const token = jwt.sign(
    {
      user_id: user.id,
      company_id: user.company_id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_id: user.company_id,
      company_name: user.company_name,
      role: user.role
    }
  };
}

// Invite user to company
export async function inviteUser(inviterUserId, email, role = 'user') {
  const { useSQLite } = getAuthDb();

  // Get inviter's company
  const getInviterSql = useSQLite
    ? 'SELECT company_id, role FROM users WHERE id = ?'
    : 'SELECT company_id, role FROM users WHERE id = $1';
  
  const inviterResult = await queryAuth(getInviterSql, [inviterUserId]);
  const inviter = useSQLite ? inviterResult[0] : inviterResult.rows[0];

  if (!inviter) {
    throw new Error('Inviter not found');
  }

  if (inviter.role !== 'admin') {
    throw new Error('Only admins can invite users');
  }

  // Check if email already exists
  const checkEmailSql = useSQLite
    ? 'SELECT id FROM users WHERE email = ?'
    : 'SELECT id FROM users WHERE email = $1';
  
  const existingResult = await queryAuth(checkEmailSql, [email]);
  const exists = useSQLite ? existingResult.length > 0 : existingResult.rows.length > 0;

  if (exists) {
    throw new Error('User with this email already exists');
  }

  // Create invitation
  const invitationId = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const createInviteSql = useSQLite
    ? 'INSERT INTO invitations (id, company_id, email, role, token, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    : 'INSERT INTO invitations (id, company_id, email, role, token, expires_at, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)';
  
  await queryAuth(createInviteSql, [
    invitationId,
    inviter.company_id,
    email,
    role,
    token,
    expiresAt.toISOString(),
    inviterUserId
  ]);

  return {
    success: true,
    invitation_id: invitationId,
    invitation_link: `${process.env.FRONTEND_URL || 'http://localhost:3004'}/accept-invite?token=${token}`
  };
}

// Accept invitation
export async function acceptInvitation(token, first_name, last_name, password) {
  if (!token || !first_name || !last_name || !password) {
    throw new Error('All fields are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const { useSQLite } = getAuthDb();

  // Get invitation
  const getInviteSql = useSQLite
    ? `SELECT i.*, c.name as company_name
       FROM invitations i
       JOIN companies c ON i.company_id = c.id
       WHERE i.token = ? AND i.accepted_at IS NULL`
    : `SELECT i.*, c.name as company_name
       FROM invitations i
       JOIN companies c ON i.company_id = c.id
       WHERE i.token = $1 AND i.accepted_at IS NULL`;
  
  const inviteResult = await queryAuth(getInviteSql, [token]);
  const invitation = useSQLite ? inviteResult[0] : inviteResult.rows[0];

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Check expiration
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = randomUUID();

  try {
    // Create user
    const createUserSql = useSQLite
      ? 'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
      : 'INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    
    await queryAuth(createUserSql, [
      userId,
      invitation.company_id,
      invitation.email,
      passwordHash,
      first_name,
      last_name,
      invitation.role
    ]);

    // Mark invitation as accepted
    const updateInviteSql = useSQLite
      ? 'UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE invitations SET accepted_at = NOW() WHERE id = $1';
    
    await queryAuth(updateInviteSql, [invitation.id]);

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        user_id: userId,
        company_id: invitation.company_id,
        email: invitation.email,
        role: invitation.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token: jwtToken,
      user: {
        id: userId,
        email: invitation.email,
        first_name,
        last_name,
        company_id: invitation.company_id,
        company_name: invitation.company_name,
        role: invitation.role
      }
    };
  } catch (error) {
    console.error('Accept invitation error:', error);
    throw new Error('Failed to accept invitation: ' + error.message);
  }
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Get user by ID
export async function getUserById(userId) {
  const { useSQLite } = getAuthDb();

  const getUserSql = useSQLite
    ? `SELECT u.*, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = ?`
    : `SELECT u.*, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`;
  
  const result = await queryAuth(getUserSql, [userId]);
  const user = useSQLite ? result[0] : result.rows[0];

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    company_id: user.company_id,
    company_name: user.company_name,
    role: user.role
  };
}

// Get all team members for a company
export async function getTeamMembers(companyId) {
  const { useSQLite } = getAuthDb();

  const getUsersSql = useSQLite
    ? `SELECT id, email, first_name, last_name, role, created_at, last_login
       FROM users
       WHERE company_id = ?
       ORDER BY created_at ASC`
    : `SELECT id, email, first_name, last_name, role, created_at, last_login
       FROM users
       WHERE company_id = $1
       ORDER BY created_at ASC`;
  
  const result = await queryAuth(getUsersSql, [companyId]);
  return useSQLite ? result : result.rows;
}

// Get pending invitations for a company
export async function getPendingInvitations(companyId) {
  const { useSQLite } = getAuthDb();

  const getInvitesSql = useSQLite
    ? `SELECT id, email, role, token, created_at, expires_at
       FROM invitations
       WHERE company_id = ? AND accepted_at IS NULL
       ORDER BY created_at DESC`
    : `SELECT id, email, role, token, created_at, expires_at
       FROM invitations
       WHERE company_id = $1 AND accepted_at IS NULL
       ORDER BY created_at DESC`;
  
  const result = await queryAuth(getInvitesSql, [companyId]);
  const invitations = useSQLite ? result : result.rows;

  // Add invitation link to each
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';
  return invitations.map(inv => ({
    ...inv,
    invitation_link: `${frontendUrl}/accept-invite?token=${inv.token}`
  }));
}

// Delete invitation
export async function deleteInvitation(invitationId, companyId) {
  const { useSQLite } = getAuthDb();

  // Verify invitation belongs to company
  const checkSql = useSQLite
    ? 'SELECT id FROM invitations WHERE id = ? AND company_id = ?'
    : 'SELECT id FROM invitations WHERE id = $1 AND company_id = $2';
  
  const checkResult = await queryAuth(checkSql, [invitationId, companyId]);
  const exists = useSQLite ? checkResult.length > 0 : checkResult.rows.length > 0;

  if (!exists) {
    throw new Error('Invitation not found');
  }

  const deleteSql = useSQLite
    ? 'DELETE FROM invitations WHERE id = ?'
    : 'DELETE FROM invitations WHERE id = $1';
  
  await queryAuth(deleteSql, [invitationId]);
  return { success: true };
}

// Update user profile
export async function updateProfile(userId, data) {
  const { first_name, last_name, phone } = data;
  const { useSQLite } = getAuthDb();

  // Build update query
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (first_name !== undefined) {
    fields.push(useSQLite ? 'first_name = ?' : `first_name = $${paramIndex}`);
    values.push(first_name);
    if (!useSQLite) paramIndex++;
  }

  if (last_name !== undefined) {
    fields.push(useSQLite ? 'last_name = ?' : `last_name = $${paramIndex}`);
    values.push(last_name);
    if (!useSQLite) paramIndex++;
  }

  if (phone !== undefined) {
    fields.push(useSQLite ? 'phone = ?' : `phone = $${paramIndex}`);
    values.push(phone);
    if (!useSQLite) paramIndex++;
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);
  const whereClause = useSQLite ? 'id = ?' : `id = $${paramIndex}`;
  const updateSql = `UPDATE users SET ${fields.join(', ')} WHERE ${whereClause}`;

  try {
    await queryAuth(updateSql, values);
  } catch (error) {
    console.error('Profile update SQL error:', {
      sql: updateSql,
      values: values.slice(0, -1), // Don't log userId
      error: error.message
    });
    throw new Error('Failed to update profile: ' + error.message);
  }

  // Return updated user
  return getUserById(userId);
}
