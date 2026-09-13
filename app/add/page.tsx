'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../Lib/Supabase';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function AddTransactionPage() {
  const router = useRouter();
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    const { data: accData } = await supabase.from('accounts').select('*');
    if (accData && accData.length > 0) {
      setAccounts(accData);
      setFromAccountId(accData[0].id);
      if (accData.length > 1) {
        setToAccountId(accData[1].id);
      }
    }

    const { data: catData } = await supabase.from('categories').select('*');
    if (catData) {
      setCategories(catData);
      const defaultExpenseCat = catData.find((c) => c.type === 'expense');
      if (defaultExpenseCat) setCategoryId(defaultExpenseCat.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Masukkan nominal transaksi yang valid!');
      return;
    }

    setIsSubmitting(true);
    const parsedAmount = parseFloat(amount);

    try {
      // 🔄 LOGIKA KHUSUS TAB TRANSFER
      if (type === 'transfer') {
        if (!fromAccountId || !toAccountId) {
          alert('Pilih wallet asal dan wallet tujuan!');
          setIsSubmitting(false);
          return;
        }
        if (fromAccountId === toAccountId) {
          alert('Wallet asal dan tujuan tidak boleh sama!');
          setIsSubmitting(false);
          return;
        }

        const fromAcc = accounts.find((a) => a.id === fromAccountId);
        const toAcc = accounts.find((a) => a.id === toAccountId);

        // Cari ID kategori Transfer dari DB jika ada
        const transferCat = categories.find(
          (c) => c.type === 'transfer' || c.name.toLowerCase().includes('transfer')
        );

        // 1. Kurangi Saldo Wallet Asal
        await supabase
          .from('accounts')
          .update({ balance: (Number(fromAcc.balance) || 0) - parsedAmount })
          .eq('id', fromAccountId);

        // 2. Tambah Saldo Wallet Tujuan
        await supabase
          .from('accounts')
          .update({ balance: (Number(toAcc.balance) || 0) + parsedAmount })
          .eq('id', toAccountId);

        // 3. Simpan Cuma 1 Baris Transaksi dengan type = 'transfer' (Bukan expense / income!)
        const { error } = await supabase.from('transactions').insert([
          {
            account_id: fromAccountId,
            category_id: transferCat ? transferCat.id : null,
            amount: parsedAmount,
            type: 'transfer', // 👈 Ditegaskan tipe data murni 'transfer'
            description: description
              ? `Transfer ke ${toAcc?.account_name} (${description})`
              : `Transfer ke ${toAcc?.account_name}`,
            transaction_date: new Date(transactionDate).toISOString(),
          },
        ]);

        if (error) throw error;
      } 
      // 🔴 / 🟢 LOGIKA PENGELUARAN ATAU PEMASUKAN BIASA
      else {
        const selectedAcc = accounts.find((a) => a.id === fromAccountId);
        const currentBalance = Number(selectedAcc?.balance) || 0;
        const newBalance =
          type === 'expense' ? currentBalance - parsedAmount : currentBalance + parsedAmount;

        // Update Saldo Wallet
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', fromAccountId);

        // Insert Transaksi (expense / income)
        const { error } = await supabase.from('transactions').insert([
          {
            account_id: fromAccountId,
            category_id: categoryId || null,
            amount: parsedAmount,
            type: type, // 'expense' atau 'income'
            description: description,
            transaction_date: new Date(transactionDate).toISOString(),
          },
        ]);

        if (error) throw error;
      }

      router.push('/');
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Catat Transaksi</h1>
        <div className="w-5" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Switcher Tipe Transaksi */}
        <div className="flex bg-gray-200 p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 rounded-lg transition ${
              type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 rounded-lg transition ${
              type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex-1 py-2 rounded-lg transition ${
              type === 'transfer' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            Transfer
          </button>
        </div>

        {/* Input Nominal */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <label className="text-xs text-gray-500 font-medium">Nominal Transaksi</label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg font-bold text-gray-500">Rp</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full text-xl font-bold text-gray-800 outline-none"
              required
            />
          </div>
        </div>

        {/* Form Pilihan Wallet (Dinamis jika pilih Transfer) */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-medium">Dari Wallet (Asal)</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none mt-1"
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
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none mt-1"
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-medium">Pilih Wallet</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none mt-1"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none mt-1"
              >
                {categories
                  .filter((c) => c.type === type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Input Keterangan & Tanggal */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Keterangan / Catatan</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="contoh: Pindah dana mingguan"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Tanggal Transaksi</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none mt-1"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow"
        >
          <Check className="w-4 h-4" />
          <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
        </button>
      </form>

      <BottomNav />
    </main>
  );
}