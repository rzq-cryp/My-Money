'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../Lib/Supabase';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function AddTransactionPage() {
  const router = useRouter();

  // State Nominal & Formatting
  const [displayAmount, setDisplayAmount] = useState('');
  const [rawAmount, setRawAmount] = useState<number>(0);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchOptions();
  }, [type]);

  const fetchOptions = async () => {
    const { data: accData } = await supabase.from('accounts').select('*');
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type);

    if (accData && accData.length > 0) {
      setAccounts(accData);
      setAccountId(accData[0].id);
    }
    if (catData && catData.length > 0) {
      setCategories(catData);
      setCategoryId(catData[0].id);
    }
  };

  // Helper Formatter Rupiah
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanNumber = value.replace(/\D/g, ''); // Ambil angka murni

    if (cleanNumber === '') {
      setDisplayAmount('');
      setRawAmount(0);
    } else {
      const num = parseInt(cleanNumber, 10);
      setRawAmount(num);
      setDisplayAmount(new Intl.NumberFormat('id-ID').format(num));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perbaikan 1: Gunakan rawAmount menggantikan variabel 'amount' yang hilang
    if (!rawAmount || rawAmount <= 0 || !accountId || !categoryId) {
      alert('Mohon lengkapi nominal dan pilihan wallet/kategori!');
      return;
    }

    setLoading(true);

    // Perbaikan 2: Gabungkan tanggal yang dipilih user dengan jam saat ini agar presisi WIB
    const now = new Date();
    const formattedDate = new Date(
      `${transactionDate}T${now.toTimeString().split(' ')[0]}`
    ).toISOString();

    const { error } = await supabase.from('transactions').insert([
      {
        account_id: accountId,
        category_id: categoryId,
        amount: rawAmount,
        type: type,
        description: description,
        transaction_date: formattedDate,
      },
    ]);

    setLoading(false);

    if (error) {
      alert('Gagal menyimpan transaksi: ' + error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800">Tambah Transaksi</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Expense / Income */}
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              type === 'expense'
                ? 'bg-red-500 text-white shadow'
                : 'text-gray-600'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              type === 'income'
                ? 'bg-green-500 text-white shadow'
                : 'text-gray-600'
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* Nominal Formatted Input */}
        <div>
          <label className="text-xs text-gray-500 font-medium">
            Nominal Transaksi
          </label>
          <div className="relative flex items-center mt-1">
            <span className="absolute left-3 text-xl font-bold text-gray-400">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={handleAmountChange}
              className="w-full text-2xl font-bold pl-11 pr-3 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Sumber Wallet / Akun */}
        <div>
          <label className="text-xs text-gray-500 font-medium">
            Sumber Akun / Wallet
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name} ({acc.account_type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Kategori */}
        <div>
          <label className="text-xs text-gray-500 font-medium">Kategori</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Keterangan */}
        <div>
          <label className="text-xs text-gray-500 font-medium">
            Keterangan / Catatan
          </label>
          <input
            type="text"
            placeholder="contoh: Kopi Kenangan / Nasi Goreng"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tanggal Transaksi */}
        <div>
          <label className="text-xs text-gray-500 font-medium">
            Tanggal Transaksi
          </label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}