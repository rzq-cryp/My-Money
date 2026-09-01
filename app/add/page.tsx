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

  // Mode: expense, income, atau transfer
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState(''); // Khusus Transfer
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
    if (accData && accData.length > 0) {
      setAccounts(accData);
      setAccountId(accData[0].id);
      if (accData.length > 1) setToAccountId(accData[1].id);
    }

    if (type !== 'transfer') {
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', type);
      if (catData && catData.length > 0) {
        setCategories(catData);
        setCategoryId(catData[0].id);
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanNumber = value.replace(/\D/g, '');

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

    if (!rawAmount || rawAmount <= 0 || !accountId) {
      alert('Mohon lengkapi nominal dan wallet!');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      alert('Wallet asal dan wallet tujuan tidak boleh sama!');
      return;
    }

    setLoading(true);

    const now = new Date();
    const formattedDate = new Date(
      `${transactionDate}T${now.toTimeString().split(' ')[0]}`
    ).toISOString();

    if (type === 'transfer') {
      // 🔄 PROSES TRANSFER (Input 2 transaksi sekaligus)
      const fromAcc = accounts.find((a) => a.id === accountId)?.account_name || 'Wallet';
      const toAcc = accounts.find((a) => a.id === toAccountId)?.account_name || 'Wallet';

      const transferNotes = description ? ` (${description})` : '';

      const { error } = await supabase.from('transactions').insert([
        {
          account_id: accountId,
          amount: rawAmount,
          type: 'expense',
          description: `Transfer ke ${toAcc}${transferNotes}`,
          transaction_date: formattedDate,
        },
        {
          account_id: toAccountId,
          amount: rawAmount,
          type: 'income',
          description: `Transfer dari ${fromAcc}${transferNotes}`,
          transaction_date: formattedDate,
        },
      ]);

      setLoading(false);

      if (error) {
        alert('Gagal melakukan transfer: ' + error.message);
      } else {
        alert('Transfer antar wallet berhasil!');
        router.push('/');
      }
    } else {
      // 💸 PROSES PENGELUARAN / PEMASUKAN BIASA
      if (!categoryId) {
        alert('Mohon pilih kategori!');
        setLoading(false);
        return;
      }

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
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800">Catat Transaksi</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Expense / Income / Transfer */}
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
              type === 'expense' ? 'bg-red-500 text-white shadow' : 'text-gray-600'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
              type === 'income' ? 'bg-green-500 text-white shadow' : 'text-gray-600'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
              type === 'transfer' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'
            }`}
          >
            Transfer
          </button>
        </div>

        {/* Nominal Formatted Input */}
        <div>
          <label className="text-xs text-gray-500 font-medium">Nominal Transaksi</label>
          <div className="relative flex items-center mt-1">
            <span className="absolute left-3 text-xl font-bold text-gray-400">Rp</span>
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

        {/* Form Pilihan Wallet */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-medium">Dari Wallet (Asal)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Ke Wallet (Tujuan)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-500 font-medium">Sumber Akun / Wallet</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kategori (Sembunyikan jika mode Transfer) */}
        {type !== 'transfer' && (
          <div>
            <label className="text-xs text-gray-500 font-medium">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Keterangan */}
        <div>
          <label className="text-xs text-gray-500 font-medium">Keterangan / Catatan</label>
          <input
            type="text"
            placeholder={
              type === 'transfer'
                ? 'contoh: Tarik tunai di ATM / Topup Gopay'
                : 'contoh: Kopi Kenangan / Nasi Goreng'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
          />
        </div>

        {/* Tanggal Transaksi */}
        <div>
          <label className="text-xs text-gray-500 font-medium">Tanggal Transaksi</label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full font-semibold py-3 rounded-lg text-white transition ${
            type === 'transfer'
              ? 'bg-blue-600 hover:bg-blue-700'
              : type === 'expense'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading
            ? 'Menyimpan...'
            : type === 'transfer'
            ? 'Proses Transfer'
            : 'Simpan Transaksi'}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}