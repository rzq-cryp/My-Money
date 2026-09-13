'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Trash2,
  Filter,
  Search,
  Calendar,
  FileDown,
  X,
  Printer,
  Eye,
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // State Modal PDF & Filter Tanggal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pdfTransactions, setPdfTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filterType, searchQuery, transactions]);

  useEffect(() => {
    if (showPdfModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPdfModal]);

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
      if (filterType === 'transfer') {
        result = result.filter(
          (t) =>
            t.type === 'transfer' ||
            (t.categories?.name && t.categories.name.toLowerCase().includes('transfer'))
        );
      } else {
        result = result.filter((t) => t.type === filterType);
      }
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

  const handleOpenPdfModal = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date().toISOString().split('T')[0];

    setStartDate(firstDay);
    setEndDate(lastDay);
    filterPdfData(firstDay, lastDay);
    setShowPdfModal(true);
  };

  const filterPdfData = (start: string, end: string) => {
    if (!start || !end) {
      setPdfTransactions(transactions);
      return;
    }

    const filtered = transactions.filter((t) => {
      const txDate = new Date(t.transaction_date).toISOString().split('T')[0];
      return txDate >= start && txDate <= end;
    });

    setPdfTransactions(filtered);
  };

  const pdfTotalIncome = pdfTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pdfTotalExpense = pdfTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pdfNetCashflow = pdfTotalIncome - pdfTotalExpense;

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

      // Hitung hanya expense & income murni di subtotal harian
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

        <button
          onClick={handleOpenPdfModal}
          className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-100 transition flex items-center gap-1 text-xs font-semibold"
          title="Ekspor PDF"
        >
          <FileDown className="w-4 h-4" />
          <span>Ekspor</span>
        </button>
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
      <div className="flex bg-gray-200 p-1 rounded-xl gap-1 text-[11px] font-semibold print:hidden">
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
        <button
          onClick={() => setFilterType('transfer')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            filterType === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Transfer
        </button>
      </div>

      {/* List Transaksi */}
      <div className="print:hidden">
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
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
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
                  {group.items.map((tx) => {
                    const isTransfer =
                      tx.type === 'transfer' ||
                      (tx.categories?.name && tx.categories.name.toLowerCase().includes('transfer'));

                    return (
                      <div
                        key={tx.id}
                        className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl ${
                              isTransfer
                                ? 'bg-blue-50 text-blue-600'
                                : tx.type === 'expense'
                                ? 'bg-red-50 text-red-500'
                                : 'bg-green-50 text-green-600'
                            }`}
                          >
                            {isTransfer ? (
                              <ArrowRightLeft className="w-4 h-4" />
                            ) : tx.type === 'expense' ? (
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
                              isTransfer
                                ? 'text-gray-700'
                                : tx.type === 'expense'
                                ? 'text-red-500'
                                : 'text-green-600'
                            }`}
                          >
                            {isTransfer ? 'Rp ' : tx.type === 'expense' ? '-Rp ' : '+Rp '}
                            {Number(tx.amount).toLocaleString('id-ID')}
                          </p>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PDF PREVIEW */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-800 flex items-center gap-1.5">
                  <FileDown className="w-5 h-5 text-blue-600" /> Ekspor Laporan PDF
                </h3>
                <p className="text-xs text-gray-400">Pilih rentang tanggal dan cek preview laporan</p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div>
                <label className="text-[11px] font-semibold text-gray-600">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    filterPdfData(e.target.value, endDate);
                  }}
                  className="w-full p-2 mt-1 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    filterPdfData(startDate, e.target.value);
                  }}
                  className="w-full p-2 mt-1 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-slate-50 space-y-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-gray-400 border-b pb-2">
                <span className="font-semibold text-blue-600 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Preview Laporan
                </span>
                <span>{pdfTransactions.length} Transaksi Ditemukan</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-green-50 p-2.5 rounded-lg border border-green-100">
                  <p className="text-[10px] text-green-600 font-bold uppercase">Pemasukan</p>
                  <p className="font-extrabold text-green-700 mt-0.5">
                    +Rp {pdfTotalIncome.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
                  <p className="text-[10px] text-red-600 font-bold uppercase">Pengeluaran</p>
                  <p className="font-extrabold text-red-700 mt-0.5">
                    -Rp {pdfTotalExpense.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Arus Kas</p>
                  <p className={`font-extrabold mt-0.5 ${pdfNetCashflow >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    Rp {pdfNetCashflow.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {pdfTransactions.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">
                  Tidak ada transaksi pada rentang tanggal ini.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {pdfTransactions.map((tx) => {
                    const isTransfer =
                      tx.type === 'transfer' ||
                      (tx.categories?.name && tx.categories.name.toLowerCase().includes('transfer'));

                    return (
                      <div
                        key={tx.id}
                        className="bg-white p-2.5 rounded-lg border border-gray-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{tx.description || tx.categories?.name || 'Transaksi'}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            • {tx.accounts?.account_name}
                          </p>
                        </div>
                        <span
                          className={`font-bold ${
                            isTransfer
                              ? 'text-gray-700'
                              : tx.type === 'expense'
                              ? 'text-red-500'
                              : 'text-green-600'
                          }`}
                        >
                          {isTransfer ? 'Rp ' : tx.type === 'expense' ? '-Rp ' : '+Rp '}
                          {Number(tx.amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pdfTransactions.length === 0}
                onClick={() => {
                  setShowPdfModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 300);
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Cetak / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW TABLE */}
      <div className="hidden print:block space-y-4">
        <div className="border-b pb-3">
          <h1 className="text-xl font-bold text-gray-900">Laporan Riwayat Transaksi</h1>
          <p className="text-xs text-gray-500">
            Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Awal'} s/d{' '}
            {endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari Ini'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border p-3 rounded-lg text-xs mb-4">
          <div>
            <p className="text-gray-500 uppercase font-bold text-[9px]">Total Pemasukan</p>
            <p className="font-bold text-green-600 text-sm">+Rp {pdfTotalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase font-bold text-[9px]">Total Pengeluaran</p>
            <p className="font-bold text-red-600 text-sm">-Rp {pdfTotalExpense.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase font-bold text-[9px]">Arus Kas Bersih</p>
            <p className="font-bold text-blue-600 text-sm">Rp {pdfNetCashflow.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-2 border-r">Tanggal</th>
              <th className="p-2 border-r">Deskripsi / Merchant</th>
              <th className="p-2 border-r">Wallet</th>
              <th className="p-2 border-r">Tipe</th>
              <th className="p-2 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {pdfTransactions.map((tx) => {
              const isTransfer =
                tx.type === 'transfer' ||
                (tx.categories?.name && tx.categories.name.toLowerCase().includes('transfer'));

              return (
                <tr key={tx.id} className="border-b border-gray-200">
                  <td className="p-2 border-r">
                    {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-2 border-r font-medium">{tx.description || '-'}</td>
                  <td className="p-2 border-r">{tx.accounts?.account_name || '-'}</td>
                  <td className="p-2 border-r uppercase font-bold text-[10px] text-gray-500">
                    {isTransfer ? 'TRANSFER' : tx.type}
                  </td>
                  <td
                    className={`p-2 text-right font-bold ${
                      isTransfer
                        ? 'text-gray-800'
                        : tx.type === 'expense'
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {isTransfer ? 'Rp ' : tx.type === 'expense' ? '-Rp ' : '+Rp '}
                    {Number(tx.amount).toLocaleString('id-ID')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </main>
  );
}