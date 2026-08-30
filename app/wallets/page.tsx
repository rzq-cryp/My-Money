'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../Lib/Supabase';
import { Wallet, CreditCard, Banknote, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
}

export default function WalletsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // State Form Tambah Wallet
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  // 💰 Hitung Total Saldo Keseluruhan
  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !balance) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('accounts').insert([
      {
        account_name: accountName,
        account_type: accountType,
        balance: parseFloat(balance),
      },
    ]);

    if (error) {
      alert('Gagal menambah wallet: ' + error.message);
    } else {
      setAccountName('');
      setBalance('');
      fetchAccounts();
    }
    setIsSubmitting(false);
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bank':
        return <CreditCard className="w-6 h-6 text-blue-500" />;
      case 'ewallet':
        return <Wallet className="w-6 h-6 text-purple-500" />;
      default:
        return <Banknote className="w-6 h-6 text-emerald-500" />;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Daftar Rekening & Wallet</h1>
        <div className="w-6" />
      </div>

      {/* 💳 CARD TOTAL KEKAYAAN / TOTAL UANG */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg mb-6">
        <p className="text-xs uppercase tracking-wider text-blue-100 font-medium">Total Kekayaan Anda</p>
        <h2 className="text-3xl font-extrabold mt-1">
          Rp {totalBalance.toLocaleString('id-ID')}
        </h2>
        <p className="text-xs text-blue-200 mt-2">
          Gabungan dari {accounts.length} rekening / wallet active
        </p>
      </div>

      {/* Form Tambah Wallet */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tambah Wallet Baru</h2>
        <form onSubmit={handleAddAccount} className="space-y-3">
          <input
            type="text"
            placeholder="Nama Wallet (contoh: BCA / Gopay)"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Tunai</option>
            </select>
            <input
              type="number"
              placeholder="Saldo Awal (Rp)"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1 shadow"
          >
            <Plus className="w-4 h-4" /> {isSubmitting ? 'Menyimpan...' : 'Tambah Wallet'}
          </button>
        </form>
      </div>

      {/* List Wallet */}
      <h2 className="text-sm font-semibold text-gray-600 mb-3">Daftar Wallet Anda</h2>
      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">Memuat data wallet...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Belum ada wallet. Silakan tambah di atas.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 rounded-xl">
                  {getIcon(acc.account_type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{acc.account_name}</h3>
                  <p className="text-xs text-gray-400 uppercase font-medium">{acc.account_type}</p>
                </div>
              </div>
              <p className="font-bold text-gray-800 text-sm">
                Rp {Number(acc.balance).toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}