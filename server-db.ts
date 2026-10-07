import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  pinHash: string;
  role: 'admin' | 'inspector' | 'lead';
  createdAt: string;
}

export interface QCDefectLogRecord {
  id: string;
  date: string;
  sku: string;
  shiftReportedBy: string;
  matrix: any;
  kitBins?: Record<string, boolean>;
  additionalNotes: string;
  createdAt: string;
  positions?: any;
}

export interface StaffData {
  employees: string[];
  morning: {
    Sides: string[];
    Crates: string[];
    Bottoms: string[];
    Lids: string[];
  };
  afternoon: {
    Sides: string[];
    Crates: string[];
    Bottoms: string[];
    Lids: string[];
  };
}

interface DatabaseSchema {
  users: UserAccount[];
  logs: QCDefectLogRecord[];
  staff: StaffData;
  settings: {
    serverName: string;
    initializedAt: string;
  };
}

class DatabaseEngine {
  private filePath: string;
  private data: DatabaseSchema;

  constructor() {
    // Configurable via DATABASE_PATH or defaults to ./data/qc_store.json
    const dbDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create data dir, falling back to root data dir', err);
      }
    }

    this.filePath = process.env.DATABASE_PATH || path.join(dbDir, 'qc_store.json');
    this.data = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error loading database file, initializing defaults:', err);
      }
    }

    const initialStaff: StaffData = {
      employees: [],
      morning: {
        Sides: ['', ''],
        Crates: ['', ''],
        Bottoms: ['', ''],
        Lids: ['', '']
      },
      afternoon: {
        Sides: ['', ''],
        Crates: ['', ''],
        Bottoms: ['', ''],
        Lids: ['', '']
      }
    };

    const initialData: DatabaseSchema = {
      users: [],
      logs: [],
      staff: initialStaff,
      settings: {
        serverName: 'Olive & Cocoa Woodshop QC Hub',
        initializedAt: new Date().toISOString()
      }
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(dataToSave = this.data) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Atomic write using a temp file to prevent database corruption on unexpected power loss
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  // --- Users & Auth ---
  public getUsers(): Omit<UserAccount, 'pinHash'>[] {
    return this.data.users.map(({ pinHash, ...safeUser }) => safeUser);
  }

  public findUserByUsername(username: string): UserAccount | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  public findUserById(id: string): UserAccount | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: {
    username: string;
    displayName: string;
    pin: string;
    role: 'admin' | 'inspector' | 'lead';
  }): Omit<UserAccount, 'pinHash'> {
    const existing = this.findUserByUsername(userData.username);
    if (existing) {
      throw new Error(`User '${userData.username}' already exists.`);
    }

    const salt = bcrypt.genSaltSync(10);
    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: userData.username.trim().toLowerCase(),
      displayName: userData.displayName.trim(),
      pinHash: bcrypt.hashSync(userData.pin.trim(), salt),
      role: userData.role,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.saveData();

    const { pinHash, ...safe } = newUser;
    return safe;
  }

  public updateUserPin(userId: string, newPin: string): boolean {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.pinHash = bcrypt.hashSync(newPin.trim(), salt);
    this.saveData();
    return true;
  }

  public deleteUser(userId: string): boolean {
    const userIndex = this.data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return false;
    
    // Prevent deleting the last admin
    const admins = this.data.users.filter((u) => u.role === 'admin');
    if (admins.length <= 1 && this.data.users[userIndex].role === 'admin') {
      throw new Error('Cannot delete the only remaining admin account.');
    }

    this.data.users.splice(userIndex, 1);
    this.saveData();
    return true;
  }

  // --- QC Logs ---
  public getLogs(): QCDefectLogRecord[] {
    // Return newest first
    return [...this.data.logs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public saveLog(log: QCDefectLogRecord): QCDefectLogRecord {
    const existingIndex = this.data.logs.findIndex((l) => l.id === log.id);
    if (existingIndex >= 0) {
      this.data.logs[existingIndex] = log;
    } else {
      this.data.logs.unshift(log);
    }
    this.saveData();
    return log;
  }

  public deleteLog(id: string): boolean {
    const initialLen = this.data.logs.length;
    this.data.logs = this.data.logs.filter((l) => l.id !== id);
    if (this.data.logs.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public importLogs(logs: QCDefectLogRecord[]): number {
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
  public getStaff(): StaffData {
    return this.data.staff;
  }

  public updateStaff(staff: StaffData): StaffData {
    this.data.staff = staff;
    this.saveData();
    return this.data.staff;
  }
}

export const db = new DatabaseEngine();
