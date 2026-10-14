import { useState, useEffect } from 'react';
import { Settings, Save, ShieldAlert, Loader2, User, LogOut } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { fetchSellerDetailsFromFirestore, saveSellerDetailsToFirestore } from '../services/settingsService';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [contact, setContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const { triggerAlert, triggerConfirm } = useDialog();
  const { currentUser, logout } = useAuth();

  const handleLogoutFromSettings = async () => {
    const confirmed = await triggerConfirm('Sign Out', 'Are you sure you want to log out?', 'warning', 'Sign Out');
    if (confirmed) {
      logout();
    }
  };



  useEffect(() => {
    async function loadSettings() {
      try {
        setIsFetching(true);
        // 1. Try fetching from Firestore
        const details = await fetchSellerDetailsFromFirestore();
        if (details) {
          setStoreName(details.name || '');
          setAddress(details.address || '');
          setGstin(details.gstin || '');
          setContact(details.contact || '');
          // Keep localStorage in sync
          localStorage.setItem('seller_details', JSON.stringify(details.toJson()));
        } else {
          // 2. Fallback to localStorage
          const stored = localStorage.getItem('seller_details');
          if (stored) {
            const parsed = JSON.parse(stored);
            setStoreName(parsed.name || '');
            setAddress(parsed.address || '');
            setGstin(parsed.gstin || '');
            setContact(parsed.contact || '');
          } else {
            setStoreName('');
            setAddress('');
            setGstin('');
            setContact('');
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setIsFetching(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const sellerDetails = {
        name: storeName.toUpperCase().trim(),
        address: address.trim(),
        gstin: gstin.toUpperCase().trim(),
        contact: contact.trim()
      };

      // 1. Save to Firestore
      await saveSellerDetailsToFirestore(sellerDetails);

      // 2. Save to localStorage for instant local backup
      localStorage.setItem('seller_details', JSON.stringify(sellerDetails));
      
      triggerAlert(
        'Settings Saved',
        'Store details updated successfully! These details will now appear on all new invoices.',
        'success'
      );
    } catch (err) {
      console.error('Failed to save settings to Firestore:', err);
      triggerAlert(
        'Error Saving',
        'Failed to save settings. Please check your network connection.',
        'danger'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          System Settings
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configure business details, pharmaceutical profile, tax settings, and system preferences.
        </p>
      </div>

      {isFetching ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
          <span className="text-xs text-zinc-450 font-mono">Fetching store profile...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="h-9 w-9 rounded-lg bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100">Store Profile (Seller Details)</h4>
              <p className="text-[11px] text-zinc-550">These details appear on new invoices.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Store / Business Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="E.G. YOUR PHARMACY NAME"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Store Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="E.G. 12, BROAD STREET, CITY, STATE - PINCODE"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="E.G. 19AABCA1234F1Z0"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="E.G. +91 99999 99999"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg text-[11px] text-zinc-500 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-zinc-650 shrink-0 mt-0.5" />
            <span>
              Saving these details updates your store details. Invoices created will show this profile.
            </span>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              ) : (
                <Save className="h-4 w-4 text-zinc-950" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Account Section */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-100 font-mono">
                {currentUser?.username || currentUser?.userId || 'User'}
              </div>
              <div className="text-[11px] text-zinc-500">
                Logged In
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogoutFromSettings}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}


