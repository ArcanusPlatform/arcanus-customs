import { Router } from 'express';
import { 
  HMRCClient, 
  saveUserCredentials, 
  getUserCredentials, 
  deleteUserCredentials 
} from '../services/hmrc-client.js';

const router = Router();

/**
 * POST /hmrc/credentials - Save user's HMRC credentials
 */
router.post('/credentials', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    const { client_id, client_secret, environment } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        message: 'client_id and client_secret are required'
      });
    }

    saveUserCredentials(userId, {
      client_id,
      client_secret,
      environment: environment || 'sandbox'
    });

    res.json({
      success: true,
      message: 'HMRC credentials saved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /hmrc/credentials - Get user's HMRC credentials (masked)
 */
router.get('/credentials', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    const credentials = getUserCredentials(userId);

    if (!credentials) {
      return res.json({
        configured: false,
        message: 'No HMRC credentials configured'
      });
    }

    res.json({
      configured: true,
      credentials: {
        client_id_masked: credentials.client_id_masked,
        environment: credentials.environment,
        created_at: credentials.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /hmrc/credentials - Delete user's HMRC credentials
 */
router.delete('/credentials', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    deleteUserCredentials(userId);

    res.json({
      success: true,
      message: 'HMRC credentials deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /hmrc/test - Test HMRC API connection
 */
router.post('/test', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    const hmrcClient = new HMRCClient(userId);

    const result = await hmrcClient.testConnection();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
