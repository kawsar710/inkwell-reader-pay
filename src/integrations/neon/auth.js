import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool, query } from '../neon/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class NeonAuth {
  // Register a new user
  static async signUp(email, password, fullName) {
    try {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM auth_users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await query(
        `INSERT INTO auth_users (email, password_hash, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, email, full_name`,
        [email, hashedPassword, fullName]
      );

      const user = result.rows[0];

      // Create profile
      await query(
        `INSERT INTO profiles (id, full_name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [user.id, fullName]
      );

      // Assign default role
      await query(
        `INSERT INTO user_roles (user_id, role, created_at)
         VALUES ($1, 'reader', NOW())`,
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        token
      };
    } catch (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }
  }

  // Sign in user
  static async signIn(email, password) {
    try {
      // Find user
      const result = await query(
        'SELECT id, email, password_hash, full_name FROM auth_users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        token
      };
    } catch (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }
  }

  // Verify JWT token
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user details
      const result = await query(
        `SELECT u.id, u.email, u.full_name, ur.role
         FROM auth_users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.id = $1`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'reader'
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.full_name, ur.role
         FROM auth_users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'reader'
      };
    } catch (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }
  }
}