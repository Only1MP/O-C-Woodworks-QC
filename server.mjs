// server.ts
import express2 from "express";
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server-routes.ts
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import path2 from "path";
import { fileURLToPath } from "url";

// server-db.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
var DatabaseEngine = class {
  constructor() {
    const dbDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (err) {
        console.warn("Could not create data dir, falling back to root data dir", err);
      }
    }
    this.filePath = process.env.DATABASE_PATH || path.join(dbDir, "qc_store.json");
    this.data = this.loadOrInit();
  }
  loadOrInit() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Error loading database file, initializing defaults:", err);
      }
    }
    const initialStaff = {
      employees: [],
      morning: {
        Sides: ["", ""],
        Crates: ["", ""],
        Bottoms: ["", ""],
        Lids: ["", ""]
      },
      afternoon: {
        Sides: ["", ""],
        Crates: ["", ""],
        Bottoms: ["", ""],
        Lids: ["", ""]
      }
    };
    const initialData = {
      users: [],
      logs: [],
      staff: initialStaff,
      settings: {
        serverName: "Olive & Cocoa Woodshop QC Hub",
        initializedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    this.saveData(initialData);
    return initialData;
  }
  saveData(dataToSave = this.data) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), "utf-8");
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error("Failed to write database to disk:", err);
    }
  }
  // --- Users & Auth ---
  getUsers() {
    return this.data.users.map(({ pinHash, ...safeUser }) => safeUser);
  }
  findUserByUsername(username) {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }
  findUserById(id) {
    return this.data.users.find((u) => u.id === id);
  }
  createUser(userData) {
    const existing = this.findUserByUsername(userData.username);
    if (existing) {
      throw new Error(`User '${userData.username}' already exists.`);
    }
    const salt = bcrypt.genSaltSync(10);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: userData.username.trim().toLowerCase(),
      displayName: userData.displayName.trim(),
      pinHash: bcrypt.hashSync(userData.pin.trim(), salt),
      role: userData.role,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.users.push(newUser);
    this.saveData();
    const { pinHash, ...safe } = newUser;
    return safe;
  }
  updateUserPin(userId, newPin) {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.pinHash = bcrypt.hashSync(newPin.trim(), salt);
    this.saveData();
    return true;
  }
  deleteUser(userId) {
    const userIndex = this.data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return false;
    const admins = this.data.users.filter((u) => u.role === "admin");
    if (admins.length <= 1 && this.data.users[userIndex].role === "admin") {
      throw new Error("Cannot delete the only remaining admin account.");
    }
    this.data.users.splice(userIndex, 1);
    this.saveData();
    return true;
  }
  // --- QC Logs ---
  getLogs() {
    return [...this.data.logs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  saveLog(log) {
    const existingIndex = this.data.logs.findIndex((l) => l.id === log.id);
    if (existingIndex >= 0) {
      this.data.logs[existingIndex] = log;
    } else {
      this.data.logs.unshift(log);
    }
    this.saveData();
    return log;
  }
  deleteLog(id) {
    const initialLen = this.data.logs.length;
    this.data.logs = this.data.logs.filter((l) => l.id !== id);
    if (this.data.logs.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }
  importLogs(logs) {
    let added = 0;
    for (const log of logs) {
      const idx = this.data.logs.findIndex((l) => l.id === log.id);
      if (idx === -1) {
        this.data.logs.push(log);
        added++;
      }
    }
    if (added > 0) {
      this.saveData();
    }
    return added;
  }
  // --- Staff & Shift Management ---
  getStaff() {
    return this.data.staff;
  }
  updateStaff(staff) {
    this.data.staff = staff;
    this.saveData();
    return this.data.staff;
  }
};
var db = new DatabaseEngine();

// server-routes.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var JWT_SECRET = process.env.JWT_SECRET || "woodshop-qc-tailscale-secure-key-9921";
var COOKIE_NAME = "qc_auth_token";
function createApiRouter() {
  const router = express.Router();
  router.use(express.json({ limit: "10mb" }));
  router.use(cookieParser());
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.[COOKIE_NAME];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    if (!token) {
      return res.status(401).json({ error: "Authentication required. Please sign in." });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: "Session expired or user deleted." });
      }
      req.user = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      };
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired session token." });
    }
  };
  const optionalAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.[COOKIE_NAME];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
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
      }
    }
    next();
  };
  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "Olive & Cocoa QC API",
      uptime: process.uptime(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  router.get("/auth/users", (_req, res) => {
    const users = db.getUsers();
    res.json({ users });
  });
  router.get("/auth/me", optionalAuth, (req, res) => {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }
    res.json({ authenticated: true, user: req.user });
  });
  router.post("/auth/login", (req, res) => {
    const { username, pin } = req.body;
    if (!username || typeof pin !== "string") {
      return res.status(400).json({ error: "Username and PIN are required." });
    }
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Account not found. Check username." });
    }
    const isValid = bcrypt2.compareSync(pin.trim(), user.pinHash);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect PIN. Try again." });
    }
    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      // works over HTTP (tailscale) and HTTPS
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1e3
    });
    res.json({
      success: true,
      token,
      user: payload
    });
  });
  router.post("/auth/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true, message: "Logged out successfully." });
  });
  router.post("/auth/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Username is required." });
    }
    if (!password || typeof password !== "string" || password.trim().length < 3) {
      return res.status(400).json({ error: "Password must be at least 3 characters." });
    }
    const trimmedUser = username.trim();
    const existing = db.findUserByUsername(trimmedUser);
    if (existing) {
      return res.status(400).json({ error: "That username is already taken." });
    }
    try {
      const newUser = db.createUser({
        username: trimmedUser,
        displayName: trimmedUser,
        pin: password.trim(),
        role: "inspector"
      });
      const payload = {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1e3
      });
      res.json({
        success: true,
        token,
        user: payload
      });
    } catch (err) {
      res.status(400).json({ error: err.message || "Failed to create user." });
    }
  });
  router.post("/auth/create-user", authMiddleware, (req, res) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can create new user accounts." });
    }
    const { username, displayName, pin, role } = req.body;
    if (!username || !displayName || !pin) {
      return res.status(400).json({ error: "Missing required fields (username, displayName, pin)." });
    }
    try {
      const newUser = db.createUser({
        username,
        displayName,
        pin,
        role: role === "admin" ? "admin" : role === "lead" ? "lead" : "inspector"
      });
      res.json({ success: true, user: newUser });
    } catch (err) {
      res.status(400).json({ error: err.message || "Failed to create user." });
    }
  });
  router.post("/auth/change-pin", authMiddleware, (req, res) => {
    const { targetUserId, newPin } = req.body;
    const caller = req.user;
    const userIdToChange = targetUserId || caller.id;
    if (userIdToChange !== caller.id && caller.role !== "admin") {
      return res.status(403).json({ error: "Permission denied." });
    }
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 digits or characters." });
    }
    const updated = db.updateUserPin(userIdToChange, newPin);
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true, message: "PIN updated successfully." });
  });
  router.get("/logs", (_req, res) => {
    const logs = db.getLogs();
    res.json({ logs });
  });
  router.post("/logs", optionalAuth, (req, res) => {
    const log = req.body;
    if (!log || !log.id || !log.date || !log.sku) {
      return res.status(400).json({ error: "Invalid log payload: id, date, and sku required." });
    }
    if (!log.shiftReportedBy && req.user) {
      log.shiftReportedBy = req.user.displayName;
    }
    const saved = db.saveLog(log);
    res.json({ success: true, log: saved });
  });
  router.delete("/logs/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const deleted = db.deleteLog(id);
    if (!deleted) {
      return res.status(404).json({ error: "Log not found or already deleted." });
    }
    res.json({ success: true, id });
  });
  router.post("/logs/bulk-import", (req, res) => {
    const { logs } = req.body;
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: "logs array is required." });
    }
    const importedCount = db.importLogs(logs);
    res.json({ success: true, imported: importedCount, total: db.getLogs().length });
  });
  router.get("/staff", (_req, res) => {
    const staff = db.getStaff();
    res.json({ staff });
  });
  router.post("/staff", optionalAuth, (req, res) => {
    const { staff } = req.body;
    if (!staff || !Array.isArray(staff.employees) || !staff.morning || !staff.afternoon) {
      return res.status(400).json({ error: "Invalid staff structure." });
    }
    const updated = db.updateStaff(staff);
    res.json({ success: true, staff: updated });
  });
  return router;
}

// server.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
async function startServer() {
  const app = express2();
  const PORT = process.env.PORT || 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  app.use("/api", createApiRouter());
  app.get("/healthz", (_req, res) => {
    res.status(200).send("OK");
  });
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: Number(PORT)
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path3.resolve(__dirname2, "dist");
    app.use(express2.static(distPath, { maxAge: "1h" }));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[QC Server] Listening on http://0.0.0.0:${PORT} (env: ${isProduction ? "production" : "development"})`);
  });
}
startServer().catch((err) => {
  console.error("[QC Server] Startup failed:", err);
  process.exit(1);
});
