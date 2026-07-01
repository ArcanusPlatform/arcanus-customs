import express from 'express';
import {
  registerCompany,
  loginUser,
  inviteUser,
  acceptInvitation,
  getUserById
} from '../services/auth-service.js';
import { tenantMiddleware, requireAdmin } from '../middleware/tenant.js';

const router = express.Router();

// Register new company and admin user
router.post('/register', async (req, res) => {
  try {
    const result = await registerCompany(req.body);
    res.json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Get current user info
router.get('/me', tenantMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Invite user to company (admin only)
router.post('/invite', tenantMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    const result = await inviteUser(req.user.id, email, role);
    res.json(result);
  } catch (error) {
    console.error('Invite error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Accept invitation
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, first_name, last_name, password } = req.body;
    const result = await acceptInvitation(token, first_name, last_name, password);
    res.json(result);
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get team members (admin only)
router.get('/team', tenantMiddleware, requireAdmin, async (req, res) => {
  try {
    const { getTeamMembers } = await import('../services/auth-service.js');
    const users = await getTeamMembers(req.user.company_id);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', tenantMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const { updateProfile } = await import('../services/auth-service.js');
    const user = await updateProfile(req.user.id, { first_name, last_name, phone });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get pending invitations (admin only)
router.get('/invitations', tenantMiddleware, requireAdmin, async (req, res) => {
  try {
    const { getPendingInvitations } = await import('../services/auth-service.js');
    const invitations = await getPendingInvitations(req.user.company_id);
    res.json({ success: true, invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete invitation (admin only)
router.delete('/invitations/:id', tenantMiddleware, requireAdmin, async (req, res) => {
  try {
    const { deleteInvitation } = await import('../services/auth-service.js');
    await deleteInvitation(req.params.id, req.user.company_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
