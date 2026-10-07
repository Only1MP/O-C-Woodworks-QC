import React, { useState } from 'react';
import { AuthUser, PublicUser, qcApi } from '../services/api';
import { User, Lock, KeyRound, Shield, UserPlus, LogOut, Check, AlertCircle, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  publicUsers: PublicUser[];
  onUserChanged: (user: AuthUser | null) => void;
  onUsersRefreshed: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  publicUsers,
  onUserChanged,
  onUsersRefreshed
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'new_user' | 'pin'>('switch');
  const [selectedUsername, setSelectedUsername] = useState<string>(
    currentUser?.username || (publicUsers[0]?.username ?? 'inspector')
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New user state
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'inspector' | 'lead' | 'admin'>('inspector');

  // Change PIN state
  const [changePinValue, setChangePinValue] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter a PIN.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await qcApi.login(selectedUsername, pin);
      onUserChanged(user);
      setSuccessMsg(`Signed in as ${user.displayName}`);
      setPin('');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await qcApi.logout();
      onUserChanged(null);
      setSuccessMsg('Logged out successfully.');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUsername || !newDisplayName || !newPin) {
      setError('Please fill in all user fields.');
      return;
    }
    if (newPin.length < 4) {
      setError('PIN should be at least 4 digits.');
      return;
    }
    setIsSubmitting(true);
    try {
      await qcApi.createUser({
        username: newUsername,
        displayName: newDisplayName,
        pin: newPin,
        role: newRole
      });
      setSuccessMsg(`User ${newDisplayName} created!`);
      setNewUsername('');
      setNewDisplayName('');
      setNewPin('');
      onUsersRefreshed();
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('switch');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!changePinValue || changePinValue.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    setIsSubmitting(true);
    try {
      await qcApi.changePin(changePinValue);
      setSuccessMsg('PIN updated successfully!');
      setChangePinValue('');
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('switch');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to change PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-brand-beige-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-brand-forest-750 text-white p-5 flex items-center justify-between border-b border-brand-forest-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-forest-500 rounded-lg text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Inspector &amp; User Accounts</h3>
              <p className="text-xs text-brand-beige-300">Raspberry Pi Server Database Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-beige-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div className="bg-brand-beige-50 px-5 py-3 border-b border-brand-beige-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${currentUser ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400 ring-4 ring-amber-100'}`} />
            <span className="text-xs text-gray-700 font-medium">
              {currentUser ? (
                <>
                  Active: <strong className="text-gray-900">{currentUser.displayName}</strong> ({currentUser.role})
                </>
              ) : (
                'Browsing as Guest / Unauthenticated'
              )}
            </span>
          </div>
          {currentUser && (
            <button
              onClick={handleLogout}
              disabled={isSubmitting}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-beige-200 bg-brand-beige-100/50 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('switch'); setError(null); }}
            className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'switch'
                ? 'border-brand-forest-600 text-brand-forest-700 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" /> Switch / Sign In
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { setActiveTab('new_user'); setError(null); }}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'new_user'
                  ? 'border-brand-forest-600 text-brand-forest-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )}
          {currentUser && (
            <button
              onClick={() => { setActiveTab('pin'); setError(null); }}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'border-brand-forest-600 text-brand-forest-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Change PIN
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'switch' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select User Account
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {publicUsers.map((u) => {
                    const isSelected = selectedUsername === u.username;
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUsername(u.username)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-brand-forest-500 bg-brand-forest-50/70 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'lead' ? 'bg-amber-100 text-amber-800' :
                            'bg-brand-forest-100 text-brand-forest-700'
                          }`}>
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{u.displayName}</div>
                            <div className="text-xs text-gray-500">@{u.username} &bull; <span className="capitalize">{u.role}</span></div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-brand-forest-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Security PIN / Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN (default: 1234 or 0000)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-brand-forest-500 text-sm font-mono tracking-widest"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500 italic">
                  Default seed credentials: <strong>admin</strong> (PIN: 1234), <strong>lead</strong> (PIN: 4321), <strong>inspector</strong> (PIN: 0000)
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-brand-forest-600 hover:bg-brand-forest-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Verifying...' : 'Sign In as Selected User'}
              </button>
            </form>
          )}

          {activeTab === 'new_user' && (
            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Mike Price"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-forest-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Username (login identifier)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. mprice"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-forest-500 text-sm lowercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-forest-500 text-sm bg-white"
                  >
                    <option value="inspector">Inspector</option>
                    <option value="lead">Lead Inspector</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    4-Digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="e.g. 5566"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-forest-500 text-sm font-mono tracking-widest"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-brand-forest-600 hover:bg-brand-forest-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Save New Account'}
              </button>
            </form>
          )}

          {activeTab === 'pin' && (
            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Security PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={changePinValue}
                  onChange={(e) => setChangePinValue(e.target.value)}
                  placeholder="Enter new 4+ digit PIN"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-forest-500 text-sm font-mono tracking-widest"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will immediately update the PIN for <strong>{currentUser?.displayName}</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-brand-forest-600 hover:bg-brand-forest-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? 'Updating...' : 'Save New PIN'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
