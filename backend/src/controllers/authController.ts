import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

const generateToken = (res: Response, userId: number, role: string) => {
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const registerUser = async (req: Request, res: Response): Promise<any> => {
  const { name, email, password, role } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanName = name ? name.trim() : '';

  try {
    const userExists = await prisma.user.findFirst({ 
      where: { email: { equals: cleanEmail, mode: 'insensitive' } } 
    });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: req.body.phone || '',
        password: hashedPassword,
        role: 'user', // Hardcoded to prevent privilege escalation
      },
    });

    if (user) {
      generateToken(res, user.id, user.role);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        totalHoursPlayed: user.totalHoursPlayed,
        loyaltyTier: user.loyaltyTier,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req: AuthRequest, res: Response): Promise<any> => {
  const { name, email, password } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
      },
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<any> => {
  const { email, name, password } = req.body;

  try {
    let user;
    if (email) {
      const cleanEmail = email.trim();
      user = await prisma.user.findFirst({ 
        where: { email: { equals: cleanEmail, mode: 'insensitive' } } 
      });
    } else if (name) {
      const cleanName = name.trim();
      user = await prisma.user.findFirst({ 
        where: { name: { equals: cleanName, mode: 'insensitive' } } 
      });
    }

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / 60000);
      res.status(403).json({ message: `Account is locked due to too many failed attempts. Please try again in ${remainingMinutes} minutes.` });
      return;
    }

    if (await bcrypt.compare(password, user.password)) {
      // Reset failed attempts on success
      if (user.failedLoginAttempts > 0 || user.lockUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockUntil: null }
        });
      }

      // MFA Check for admin
      if ((user.role === 'admin' || user.role === 'superadmin') && user.mfaEnabled) {
        res.json({ mfaRequired: true, userId: user.id });
        return;
      }

      generateToken(res, user.id, user.role);
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        totalHoursPlayed: user.totalHoursPlayed,
        loyaltyTier: user.loyaltyTier,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
      });
    } else {
      // Increment failed attempts on failure
      const attempts = user.failedLoginAttempts + 1;
      let lockTime = null;
      
      if (attempts >= 5) {
        lockTime = new Date(new Date().getTime() + 15 * 60000); // Lock for 15 mins
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockUntil: lockTime }
      });

      if (lockTime) {
        res.status(403).json({ message: 'Account locked due to 5 failed login attempts. Please try again after 15 minutes.' });
      } else {
        res.status(401).json({ message: 'Invalid email or password' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie('jwt', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/'
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user) {
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      totalHoursPlayed: user.totalHoursPlayed,
      loyaltyTier: user.loyaltyTier,
      wins: user.wins,
      losses: user.losses,
      rating: user.rating,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user) {
      let hashedPassword = user.password;
      if (req.body.password) {
        if (!req.body.currentPassword) {
          res.status(400).json({ message: 'Please provide current password to change password' });
          return;
        }
        const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
        if (!isMatch) {
          res.status(400).json({ message: 'Invalid current password' });
          return;
        }
        const salt = await bcrypt.genSalt(12);
        hashedPassword = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: (req.body.name && typeof req.body.name === 'string' && req.body.name.trim() !== '') ? req.body.name.trim() : user.name,
          email: (req.body.email && typeof req.body.email === 'string' && req.body.email.trim() !== '') ? req.body.email.trim() : user.email,
          phone: req.body.phone !== undefined ? req.body.phone : user.phone,
          avatar: req.body.avatar !== undefined ? req.body.avatar : user.avatar,
          password: hashedPassword,
        },
      });

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        totalHoursPlayed: updatedUser.totalHoursPlayed,
        loyaltyTier: updatedUser.loyaltyTier,
        wins: updatedUser.wins,
        losses: updatedUser.losses,
        rating: updatedUser.rating,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      res.status(400).json({ message: 'Email address is already in use by another account' });
    } else {
      res.status(500).json({ message: 'Failed to update profile. Please try again later.' });
    }
  }
};

export const verifyLoginMfa = async (req: Request, res: Response): Promise<any> => {
  const { userId, token } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    
    if (user && user.mfaEnabled && user.mfaSecret) {
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
      });

      if (verified) {
        generateToken(res, user.id, user.role);
        res.json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        });
        return;
      } else {
        res.status(401).json({ message: 'Invalid MFA token' });
        return;
      }
    }
    res.status(404).json({ message: 'User or MFA setup not found' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setupMfa = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const secret = speakeasy.generateSecret({ name: `PoolApp (${req.user.email})` });
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { mfaSecret: secret.base32 }
    });

    qrcode.toDataURL(secret.otpauth_url!, (err, data_url) => {
      if (err) return res.status(500).json({ message: 'Error generating QR code' });
      res.json({ secret: secret.base32, qrCode: data_url });
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyMfaSetup = async (req: AuthRequest, res: Response): Promise<any> => {
  const { token } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (user && user.mfaSecret) {
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
      });

      if (verified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaEnabled: true }
        });
        res.json({ message: 'MFA successfully enabled' });
        return;
      } else {
        res.status(400).json({ message: 'Invalid token, MFA setup failed' });
        return;
      }
    }
    res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
