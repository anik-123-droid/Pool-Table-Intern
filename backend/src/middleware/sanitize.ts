import { Request, Response, NextFunction } from 'express';

// Function to recursively sanitize an object/array/string
const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        sanitizedObj[key] = sanitizeValue(value[key]);
      }
    }
    return sanitizedObj;
  }
  return value; // Booleans, numbers, null, etc.
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    for (const key in req.body) {
      req.body[key] = sanitizeValue(req.body[key]);
    }
  }
  if (req.query) {
    for (const key in req.query) {
      req.query[key] = sanitizeValue(req.query[key]);
    }
  }
  if (req.params) {
    for (const key in req.params) {
      req.params[key] = sanitizeValue(req.params[key]);
    }
  }
  next();
};
