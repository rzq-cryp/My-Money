'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Plus, PieChart } from 'lucide-react';

export default function HomePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, accounts(account_name), categories(name)')
      .order('transaction_date', { ascending: false });

    if (data) {
      setTransactions(data);
      
      const expense = data
        .filter((t: any) => t.type === 'expense')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        
      const income = data
        .filter((t: any) => t.type === 'income')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      setTotalExpense(expense);
      setTotalIncome(income);
    }
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const groupedTransactions = transactions.reduce((acc: any, t: any) => {
    const dateKey = new Date(t.transaction_date).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        items: [],
        dailyExpense: 0,
      };
    }
    acc[dateKey].items.push(t);
    if (t.type === 'expense') {
      acc[dateKey].dailyExpense += Number(t.amount);
    }
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-md mx-auto pb-24 bg-gray-50 min-h-screen">
      {/* Header Top Bar dengan Shortcut Analitik */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800">My Money</h1>
          <p className="text-xs text-gray-500">Ringkasan Keuangan Anda</p>
        </div>
        
        {/* Tombol Shortcut Ke Halaman Analitik */}
        <Link 
          href="/analytics" 
          className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition flex items-center gap-1.5 text-xs font-medium"
        >
          <PieChart className="w-4 h-4 text-blue-600" />
          <span>Analitik</span>
        </Link>
      </div>

      {/* Card Total Arus Kas */}
      <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg mb-6">
        <p className="text-xs text-blue-100 font-medium">Total Arus Kas Bulan Ini</p>
        <h2 className="text-2xl font-bold mt-1">
          Rp {(totalIncome - totalExpense).toLocaleString('id-ID')}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-blue-500/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ArrowDownLeft className="w-4 h-4 text-green-300" />
            </div>
            <div>
              <p className="text-[10px] text-blue-100">Pemasukan</p>
              <p className="text-xs font-semibold">Rp {totalIncome.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-red-300" />
            </div>
            <div>
              <p className="text-[10px] text-blue-100">Pengeluaran</p>
              <p className="text-xs font-semibold">Rp {totalExpense.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title Transaksi & Button Tambah */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Transaksi Terakhir</h3>
        <Link href="/add" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Tambah
        </Link>
      </div>

      {/* Daftar Transaksi Dikelompokkan Per Tanggal */}
      <div className="space-y-5">
        {Object.keys(groupedTransactions).length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">Belum ada transaksi dicatat</p>
        ) : (
          Object.entries(groupedTransactions).map(([date, group]: [string, any]) => (
            <div key={date} className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-gray-500">
                  {formatDateHeader(date)}
                </span>
                {group.dailyExpense > 0 && (
                  <span className="text-xs font-bold text-red-500">
                    Total: -Rp {group.dailyExpense.toLocaleString('id-ID')}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((t: any) => (
                  <div key={t.id} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{t.description || 'Transaksi'}</p>
                      <p className="text-[10px] text-gray-400">
                        {t.accounts?.account_name || 'Umum'} • {t.categories?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <p className={`font-semibold text-sm ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                      {t.type === 'expense' ? '-' : '+'} Rp {Number(t.amount).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}