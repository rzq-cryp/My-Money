'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../Lib/Supabase';
import BottomNav from '../../components/BottomNav';
import { Wallet, Plus, CreditCard, Banknote, Smartphone } from 'lucide-react';

export default function WalletsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*').order('created_at', { ascending: true });
    if (data) setAccounts(data);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !balance) return;

    setLoading(true);
    const { error } = await supabase.from('accounts').insert([
      {
        account_name: accountName,
        account_type: accountType,
        balance: parseFloat(balance),
      },
    ]);

    setLoading(false);
    if (!error) {
      setAccountName('');
      setBalance('');
      fetchAccounts();
    } else {
      alert('Gagal menambah wallet: ' + error.message);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'ewallet': return <Smartphone className="w-5 h-5 text-purple-500" />;
      default: return <Banknote className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-blue-600" /> Kelola Wallet & Saldo
      </h1>

      {/* Form Tambah Wallet Baru */}
      <form onSubmit={handleAddAccount} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Tambah Akun Baru</h2>

        <div>
          <label className="text-xs text-gray-500 font-medium">Nama Wallet / Bank</label>
          <input
            type="text"
            placeholder="contoh: Bank Mandiri / ShopeePay"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Tipe Akun</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="bank">Rekening Bank</option>
              <option value="ewallet">E-Wallet</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Saldo Awal (Rp)</label>
            <input
              type="number"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 transition flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> {loading ? 'Simpan...' : 'Tambah Wallet'}
        </button>
      </form>

      {/* Daftar Wallet Yang Sudah Ada */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Daftar Wallet Anda</h2>
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">Belum ada wallet tersimpan</p>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  {getIcon(acc.account_type)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{acc.account_name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{acc.account_type}</p>
                </div>
              </div>
              <p className="font-bold text-sm text-gray-800">
                Rp {Number(acc.balance).toLocaleString('id-ID')}
              </p>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}