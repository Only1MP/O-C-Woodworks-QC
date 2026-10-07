import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, UserAccount } from './server-db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'woodshop-qc-tailscale-secure-key-9921';
const COOKIE_NAME = 'qc_auth_token';

// Extend Express Request to hold current user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: 'admin' | 'inspector' | 'lead';
  };
}

export function createApiRouter(): express.Router {
  const router = express.Router();
  router.use(express.json({ limit: '10mb' }));
  router.use(cookieParser());

  // Token verify helper
  const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.[COOKIE_NAME];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'Session expired or user deleted.' });
      }
      req.user = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };

  // Optional auth helper (for reading data or checking state)
  const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.[COOKIE_NAME];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = db.findUserById(decoded.id);
        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role
          };
        }
      } catch {
        // ignore
      }
    }
    next();
  };

  // --- Health / Status ---
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Olive & Cocoa QC API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // --- Auth Endpoints ---

  // List public active accounts for quick switch button
  router.get('/auth/users', (_req: Request, res: Response) => {
    const users = db.getUsers();
    res.json({ users });
  });

  // Check currently authenticated user
  router.get('/auth/me', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }
    res.json({ authenticated: true, user: req.user });
  });

  // Login with PIN or password
  router.post('/auth/login', (req: Request, res: Response) => {
    const { username, pin } = req.body;
    if (!username || typeof pin !== 'string') {
      return res.status(400).json({ error: 'Username and PIN are required.' });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Check username.' });
    }

    const isValid = bcrypt.compareSync(pin.trim(), user.pinHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect PIN. Try again.' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };

    // 30 day token for shop tablets / Tailscale sessions
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // works over HTTP (tailscale) and HTTPS
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: payload
    });
  });

  // Logout
  router.post('/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Create new user account (Admin only, or initial setup)
  router.post('/auth/create-user', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create new user accounts.' });
    }

    const { username, displayName, pin, role } = req.body;
    if (!username || !displayName || !pin) {
      return res.status(400).json({ error: 'Missing required fields (username, displayName, pin).' });
    }

    try {
      const newUser = db.createUser({
        username,
        displayName,
        pin,
        role: role === 'admin' ? 'admin' : role === 'lead' ? 'lead' : 'inspector'
      });
      res.json({ success: true, user: newUser });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create user.' });
    }
  });

  // Update PIN
  router.post('/auth/change-pin', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { targetUserId, newPin } = req.body;
    const caller = req.user!;

    // Users can change their own PIN; Admins can change anyone's
    const userIdToChange = targetUserId || caller.id;
    if (userIdToChange !== caller.id && caller.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits or characters.' });
    }

    const updated = db.updateUserPin(userIdToChange, newPin);
    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'PIN updated successfully.' });
  });

  // --- QC Logs CRUD ---

  // Get all saved logs
  router.get('/logs', (_req: Request, res: Response) => {
    const logs = db.getLogs();
    res.json({ logs });
  });

  // Save or update a QC defect log
  router.post('/logs', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const log = req.body;
    if (!log || !log.id || !log.date || !log.sku) {
      return res.status(400).json({ error: 'Invalid log payload: id, date, and sku required.' });
    }

    // Default inspector name to logged-in user displayName if blank
    if (!log.shiftReportedBy && req.user) {
      log.shiftReportedBy = req.user.displayName;
    }

    const saved = db.saveLog(log);
    res.json({ success: true, log: saved });
  });

  // Delete a QC defect log
  router.delete('/logs/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteLog(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Log not found or already deleted.' });
    }
    res.json({ success: true, id });
  });

  // Bulk sync / import (e.g. migrate from local storage)
  router.post('/logs/bulk-import', (req: Request, res: Response) => {
    const { logs } = req.body;
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'logs array is required.' });
    }
    const importedCount = db.importLogs(logs);
    res.json({ success: true, imported: importedCount, total: db.getLogs().length });
  });

  // --- Staff & Shift Station Data ---

  // Get staff roster and workstation assignments
  router.get('/staff', (_req: Request, res: Response) => {
    const staff = db.getStaff();
    res.json({ staff });
  });

  // Update staff roster and workstation assignments
  router.post('/staff', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const { staff } = req.body;
    if (!staff || !Array.isArray(staff.employees) || !staff.morning || !staff.afternoon) {
      return res.status(400).json({ error: 'Invalid staff structure.' });
    }

    const updated = db.updateStaff(staff);
    res.json({ success: true, staff: updated });
  });

  return router;
}
