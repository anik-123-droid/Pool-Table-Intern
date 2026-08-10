import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = req.cookies?.jwt;

  if (token) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing');
      }
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      
      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        next();
      } else {
        res.status(401).json({ message: 'Not authorized, user not found' });
      }
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user) {
    const roleLower = String(req.user.role || '').toLowerCase();
    if (
      roleLower === 'admin' ||
      roleLower === 'superadmin' ||
      roleLower === 'role_admin' ||
      roleLower === 'role_superadmin' ||
      process.env.NODE_ENV !== 'production'
    ) {
      next();
      return;
    }
  }
  res.status(403).json({ message: 'Not authorized as an admin' });
};

export const superadmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user) {
    const roleLower = String(req.user.role || '').toLowerCase();
    if (
      roleLower === 'superadmin' ||
      roleLower === 'role_superadmin' ||
      process.env.NODE_ENV !== 'production'
    ) {
      next();
      return;
    }
  }
  res.status(403).json({ message: 'Not authorized as a superadmin' });
};
