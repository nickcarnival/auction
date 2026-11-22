import { Router, type Request, type Response } from 'express';
import { createTenantWithOwner } from '../tenant/tenant-service';
import { inviteUser } from '../user/invite-service';
import { signupRateLimit } from '../../middleware/rate-limit-middleware';
import {
  validateEmail,
  validatePassword,
  validateBusinessName,
  sanitizeString,
} from '../../utils/validation';

const router = Router();

// Apply rate limiting to signup
router.use(signupRateLimit);

// Public signup endpoint - creates tenant and owner user (NO AUTH REQUIRED)
router.post('/', async (req: Request, res: Response) => {
  try {
    let { email, password, businessName } = req.body;

    // Basic input presence check
    if (!email || !password || !businessName) {
      return res.status(400).json({
        error: 'Email, password, and business name are required',
      });
    }

    // Sanitize inputs
    email = sanitizeString(email).toLowerCase();
    businessName = sanitizeString(businessName);

    // Comprehensive validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.error,
      });
    }

    const businessNameValidation = validateBusinessName(businessName);
    if (!businessNameValidation.valid) {
      return res.status(400).json({
        error: businessNameValidation.error,
      });
    }

    // Create tenant and owner user
    const result = await createTenantWithOwner(businessName, email, password);

    // Security: Always return success message regardless of whether email exists
    // If tenant/userId is null, it means email already exists, but we don't reveal that
    if (result.tenant && result.userId) {
      // Only send verification email if tenant is already active
      // For new signups, tenant starts inactive and requires admin approval first
      if (result.tenant.active) {
        await inviteUser({
          _id: result.userId.toHexString(),
          name: businessName,
          email,
          password, // Won't be used in invite
          tenantId: result.tenant._id!,
        });
      }
      // If tenant is inactive, no email is sent - user must wait for admin approval
    }

    // Always return the same success message
    res.json({
      message:
        'Account created successfully! Your account is pending admin approval. You will receive a verification email once approved.',
    });
  } catch (e) {
    console.error('Signup error:', e);

    // Security: Don't reveal specific error details that could aid attackers
    res.status(500).json({
      error: 'Something went wrong. Please try again later.',
    });
  }
});

export default router;
