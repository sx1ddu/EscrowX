import mongoose from 'mongoose';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Validates that specified request parameters are valid MongoDB ObjectIDs.
 * @param {...string} paramNames - Parameter names to validate (e.g. 'id', 'orderId')
 */
export const validateObjectId = (...paramNames) => (req, res, next) => {
  for (const param of paramNames) {
    const val = req.params[param];
    if (val && !mongoose.Types.ObjectId.isValid(val)) {
      return errorResponse(res, 400, `Invalid ID format for parameter '${param}'.`);
    }
  }
  next();
};

/**
 * Strips or rejects top-level/nested keys starting with '$' to prevent MongoDB query injection.
 */
export const sanitizeNoSQL = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Validates request body fields against a declarative rule schema.
 * 
 * Example:
 *   validateBody({
 *     title: { type: 'string', required: true, minLength: 5, maxLength: 100 },
 *     price: { type: 'number', required: true, min: 1 },
 *     category: { type: 'string', required: true, enum: ['Electronics', 'Books'] }
 *   })
 */
export const validateBody = (schema) => (req, res, next) => {
  const errors = [];
  const body = req.body || {};

  for (const [field, rule] of Object.entries(schema)) {
    const val = body[field];

    // Check required
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push(`${field} is required.`);
      continue;
    }

    if (val === undefined || val === null) continue;

    // Check type
    if (rule.type) {
      if (rule.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`${field} must be a valid number.`);
          continue;
        }
      } else if (rule.type === 'string' && typeof val !== 'string') {
        errors.push(`${field} must be a string.`);
        continue;
      } else if (rule.type === 'array' && !Array.isArray(val)) {
        errors.push(`${field} must be an array.`);
        continue;
      }
    }

    // Number bounds
    if (rule.type === 'number') {
      const num = Number(val);
      if (rule.min !== undefined && num < rule.min) errors.push(`${field} must be at least ${rule.min}.`);
      if (rule.max !== undefined && num > rule.max) errors.push(`${field} cannot exceed ${rule.max}.`);
    }

    // String lengths
    if (typeof val === 'string') {
      if (rule.minLength !== undefined && val.trim().length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters.`);
      }
      if (rule.maxLength !== undefined && val.trim().length > rule.maxLength) {
        errors.push(`${field} cannot exceed ${rule.maxLength} characters.`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(val)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}.`);
    }

    // Regex match (e.g., email)
    if (rule.match && !rule.match.test(val)) {
      errors.push(rule.message || `${field} format is invalid.`);
    }

    // ObjectId validation
    if (rule.isObjectId && !mongoose.Types.ObjectId.isValid(val)) {
      errors.push(`${field} must be a valid MongoDB ObjectId.`);
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, errors.join(' '));
  }

  next();
};
