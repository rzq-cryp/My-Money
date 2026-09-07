'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trash2,
  Filter,
  Search,
  Calendar,
  FileDown,
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filterType, searchQuery, transactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name), accounts(account_name)')
      .order('transaction_date', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const applyFilter = () => {
    let result = [...transactions];

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.categories?.name && t.categories.name.toLowerCase().includes(q)) ||
          (t.accounts?.account_name && t.accounts.account_name.toLowerCase().includes(q))
      );
    }

    setFilteredTransactions(result);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      alert('Gagal menghapus transaksi: ' + error.message);
    } else {
      fetchTransactions();
    }
  };

  // 🖨️ Fungsi Ekspor PDF / Print View
  const handleExportPDF = () => {
    window.print();
  };

  const groupTransactionsByDate = (txList: any[]) => {
    const groups: { [key: string]: { dateLabel: string; items: any[]; totalExpense: number; totalIncome: number } } = {};

    txList.forEach((tx) => {
      const dateObj = new Date(tx.transaction_date);
      const dateKey = dateObj.toISOString().split('T')[0];

      const dateLabel = dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateLabel,
          items: [],
          totalExpense: 0,
          totalIncome: 0,
        };
      }

      groups[dateKey].items.push(tx);

      if (tx.type === 'expense') {
        groups[dateKey].totalExpense += Number(tx.amount);
      } else if (tx.type === 'income') {
        groups[dateKey].totalIncome += Number(tx.amount);
      }
    });

    return Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => groups[key]);
  };

  const groupedData = groupTransactionsByDate(filteredTransactions);

  return (
    <main className="min-h-screen bg-gray-50 max-w-md mx-auto pb-24 p-4 space-y-4 print:p-0 print:bg-white print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 print:hidden">
        <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h1>

        {/* 📄 Tombol Ekspor PDF */}
        <button
          onClick={handleExportPDF}
          className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-100 transition flex items-center gap-1 text-xs font-semibold"
          title="Ekspor PDF"
        >
          <FileDown className="w-4 h-4" />
          <span>PDF</span>
        </button>
      </div>

      {/* Tampilan Cetak Khusus PDF */}
      <div className="hidden print:block mb-4 border-b pb-2">
        <h1 className="text-xl font-bold text-gray-900">Laporan Riwayat Transaksi</h1>
        <p className="text-xs text-gray-500">MyMoney Personal Finance App</p>
      </div>

      {/* Input Pencarian */}
      <div className="relative print:hidden">
        <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari merchant, ket, atau wallet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl gap-1 text-xs font-semibold print:hidden">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            filterType === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            filterType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            filterType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Pemasukan
        </button>
      </div>

      {/* Daftar Transaksi Grouped */}
      {loading ? (
        <p className="text-xs text-center py-8 text-gray-400">Memuat riwayat transaksi...</p>
      ) : groupedData.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-gray-400 space-y-2">
          <Filter className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-xs">Tidak ada transaksi yang ditemukan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedData.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] text-gray-500 font-semibold border-b border-gray-200 pb-1">
                <span className="flex items-center gap-1.5 text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 print:hidden" />
                  {group.dateLabel}
                </span>
                <div className="flex items-center gap-2">
                  {group.totalExpense > 0 && (
                    <span className="text-red-500 font-bold">
                      -Rp {group.totalExpense.toLocaleString('id-ID')}
                    </span>
                  )}
                  {group.totalIncome > 0 && (
                    <span className="text-green-600 font-bold">
                      +Rp {group.totalIncome.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {group.items.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between print:border-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl print:hidden ${
                          tx.type === 'expense'
                            ? 'bg-red-50 text-red-500'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {tx.type === 'expense' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-gray-800">
                          {tx.description || tx.categories?.name || 'Transaksi'}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {tx.accounts?.account_name || 'Wallet'}
                          {tx.categories?.name ? ` • ${tx.categories.name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`font-bold text-xs ${
                          tx.type === 'expense' ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : '+'}Rp{' '}
                        {Number(tx.amount).toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition print:hidden"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="print:hidden">
        <BottomNav />
      </div>
    </main>
  );
}