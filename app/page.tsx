'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Scan,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  User,
  X,
  Code2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function HomePage() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [greeting, setGreeting] = useState('Selamat Datang');
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    updateGreeting();
  }, []);

  // 🔒 Lock background scroll saat modal popup developer terbuka
  useEffect(() => {
    if (showDevModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup style saat komponen unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDevModal]);

  const updateGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) {
      setGreeting('Selamat Pagi ☀️');
    } else if (hours >= 11 && hours < 15) {
      setGreeting('Selamat Siang 🌤️');
    } else if (hours >= 15 && hours < 18) {
      setGreeting('Selamat Sore ☕');
    } else {
      setGreeting('Selamat Malam 🌙');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    const { data: accounts } = await supabase.from('accounts').select('balance');
    if (accounts) {
      const balanceSum = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      setTotalBalance(balanceSum);
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, categories(name, icon_name), accounts(account_name)')
      .order('transaction_date', { ascending: false });

    if (transactions) {
      setRecentTransactions(transactions.slice(0, 5));

      const currentMonthTx = transactions.filter(
        (t) => new Date(t.transaction_date) >= new Date(firstDayOfMonth)
      );

      let income = 0;
      let expense = 0;

      currentMonthTx.forEach((t) => {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense') expense += Number(t.amount);
      });

      setMonthlyIncome(income);
      setMonthlyExpense(expense);

      const last7DaysMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        last7DaysMap.set(dateStr, { date: dateStr, pengeluaran: 0, pemasukan: 0 });
      }

      transactions.forEach((t) => {
        const dateStr = new Date(t.transaction_date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        });
        if (last7DaysMap.has(dateStr)) {
          const item = last7DaysMap.get(dateStr);
          if (t.type === 'expense') item.pengeluaran += Number(t.amount);
          if (t.type === 'income') item.pemasukan += Number(t.amount);
        }
      });

      setChartData(Array.from(last7DaysMap.values()));
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 max-w-md mx-auto pb-24 p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-gray-500 font-medium">{greeting}</p>
          <h1 className="text-xl font-bold text-gray-800">Ringkasan Keuangan</h1>
        </div>

        <button
          onClick={() => setShowDevModal(true)}
          className="p-2.5 bg-white border border-gray-200 rounded-full shadow-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center"
          title="Info Developer & Aplikasi"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs text-blue-100 uppercase tracking-wider font-medium">
            Total Saldo Saat Ini
          </p>
          <h2 className="text-3xl font-extrabold mt-1">
            Rp {totalBalance.toLocaleString('id-ID')}
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg text-green-300">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-blue-100 font-medium">Pemasukan M-ini</p>
                <p className="text-sm font-bold text-green-300">
                  +Rp {monthlyIncome.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-500/20 rounded-lg text-red-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-blue-100 font-medium">Pengeluaran M-ini</p>
                <p className="text-sm font-bold text-red-300">
                  -Rp {monthlyExpense.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/add"
          className="flex items-center justify-center gap-2 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm font-semibold text-xs text-gray-700 hover:bg-gray-50 transition"
        >
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Tambah Manual</span>
        </Link>
        <Link
          href="/scan"
          className="flex items-center justify-center gap-2 bg-blue-600 p-3.5 rounded-xl text-white shadow-sm font-semibold text-xs hover:bg-blue-700 transition"
        >
          <Scan className="w-4 h-4" />
          <span>Scan Struk AI</span>
        </Link>
      </div>

      {/* Grafik Tren */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-gray-800">Tren Transaksi</h3>
            <p className="text-[11px] text-gray-400">7 Hari Terakhir</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Pengeluaran
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Pemasukan
            </span>
          </div>
        </div>

        <div className="h-44 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                />
                <Area
                  type="monotone"
                  dataKey="pengeluaran"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
                <Area
                  type="monotone"
                  dataKey="pemasukan"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              Belum ada data transaksi
            </div>
          )}
        </div>
      </div>

      {/* Transaksi Terbaru */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-800">Transaksi Terbaru</h3>
          <Link href="/transactions" className="text-xs text-blue-600 font-medium flex items-center hover:underline">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-center py-4 text-gray-400">Memuat transaksi...</p>
        ) : recentTransactions.length === 0 ? (
          <p className="text-xs text-center py-4 text-gray-400">Belum ada riwayat transaksi.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <Link
                key={tx.id}
                href="/transactions"
                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:bg-slate-50 transition block"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
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
                      {tx.accounts?.account_name} •{' '}
                      {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <p
                  className={`font-bold text-xs ${
                    tx.type === 'expense' ? 'text-red-500' : 'text-green-600'
                  }`}
                >
                  {tx.type === 'expense' ? '-' : '+'}Rp{' '}
                  {Number(tx.amount).toLocaleString('id-ID')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal Popup Developer Info (Dengan Prevention Touch & Scroll Lock) */}
      {showDevModal && (
        <div
          onClick={() => setShowDevModal(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 touch-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative space-y-4 text-center"
          >
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center font-bold text-2xl shadow-inner border border-blue-200">
              <Code2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800">MyMoney App</h3>
              <p className="text-xs text-blue-600 font-medium flex items-center justify-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" /> Personal Finance & AI Scan
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-400">Pengembang</span>
                <span className="font-semibold text-gray-700">RZQ</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-400">Tech Stack</span>
                <span className="font-semibold text-gray-700">Next.js, Supabase, AI</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-400">AI Model</span>
                <span className="font-semibold text-gray-700">Gemini 2.5/2.0 Vision</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Versi Aplikasi</span>
                <span className="font-semibold text-gray-700">v1.2.0 (PWA)</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-left">
              💡 Aplikasi ini dilengkapi pemindaian AI otomatis untuk struk belanja/screenshot M-Banking serta pengelolaan multi-wallet real-time.
            </div>

            <button
              onClick={() => setShowDevModal(false)}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition shadow"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}