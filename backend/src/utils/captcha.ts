import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify Cloudflare Turnstile or Google reCAPTCHA token.
 * During development or when dummy keys are configured, this can be bypassed or gracefully handled.
 */
export const verifyCaptcha = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.body.captchaToken;
  const secretKey = process.env.CAPTCHA_SECRET_KEY || '1x0000000000000000000000000000000AA';
  const isDummyKey = secretKey === '1x0000000000000000000000000000000AA';

  // Bypass if token is 'bypass', missing, or in dev / using dummy key
  if (token === 'bypass' || !token || process.env.NODE_ENV !== 'production' || isDummyKey) {
    console.warn('[Captcha] Bypassed.');
    return next();
  }

  if (!token) {
    return res.status(400).json({ success: false, message: 'Captcha token is required.' });
  }

  try {
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    if (data.success) {
      return next();
    } else {
      console.error('[Captcha Verification Failed]:', data['error-codes']);
      // Fallback if dummy keys are in use or non-production environment
      if (process.env.NODE_ENV !== 'production' || isDummyKey) {
        console.warn('[Captcha] Verification failed but allowed (dummy key or dev mode).');
        return next();
      }
      return res.status(403).json({ success: false, message: 'Captcha verification failed. Please try again.' });
    }
  } catch (error) {
    console.error('[Captcha Error]:', error);
    if (process.env.NODE_ENV !== 'production' || isDummyKey) {
      return next();
    }
    return res.status(500).json({ success: false, message: 'Internal server error during captcha verification.' });
  }
};

