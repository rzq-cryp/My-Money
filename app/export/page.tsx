'use client';

import { useState } from 'react';
import { supabase } from '../../Lib/Supabase';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Eye, FileText, X } from 'lucide-react';

export default function ExportPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generatePDF = async (shouldDownload = false) => {
    setLoading(true);

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*, accounts(account_name), categories(name)')
        .gte('transaction_date', `${startDate}T00:00:00.000Z`)
        .lte('transaction_date', `${endDate}T23:59:59.999Z`)
        .order('transaction_date', { ascending: true });

      if (error || !transactions) {
        alert('Gagal mengambil data transaksi');
        setLoading(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header PDF
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('LAPORAN MUTASI REKENING & PENGELUARAN', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 21);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 25);

      let totalMasuk = 0;
      let totalKeluar = 0;

      const tableRows = transactions.map((t) => {
        const isExpense = t.type === 'expense';
        const amountNum = Number(t.amount);

        if (isExpense) totalKeluar += amountNum;
        else totalMasuk += amountNum;

        const formattedDate = new Date(t.transaction_date).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
        });

        const detail = `${t.description || 'Transaksi'} (${t.accounts?.account_name || 'Umum'} - ${t.categories?.name || 'Uncategorized'})`;
        const debitKredit = isExpense 
          ? `${amountNum.toLocaleString('id-ID')} DB` 
          : `${amountNum.toLocaleString('id-ID')} CR`;

        return [formattedDate, formattedDate, detail, debitKredit];
      });

      autoTable(doc, {
        startY: 30,
        head: [[
          'Tanggal Transaksi\nTransaction Date',
          'Tanggal Valuta\nValuta Date',
          'Rincian Transaksi / Nomor Referensi\nTransaction Details / Reference Number',
          'Debit / Kredit\nDebit / Credit'
        ]],
        body: tableRows,
        theme: 'plain',
        headStyles: {
          fillColor: [168, 203, 230],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 28 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 40, halign: 'right' },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Pemasukan (CR)  : Rp ${totalMasuk.toLocaleString('id-ID')}`, 14, finalY);
      doc.text(`Total Pengeluaran (DB): Rp ${totalKeluar.toLocaleString('id-ID')}`, 14, finalY + 5);
      doc.text(`Selisih Arus Kas      : Rp ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}`, 14, finalY + 10);

      if (shouldDownload) {
        doc.save(`Laporan_Keuangan_${startDate}_sd_${endDate}.pdf`);
      } else {
        // Buat blob string untuk preview di modal
        const blobString = doc.output('dataurlstring');
        setPdfUrl(blobString);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan saat membuat PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" /> Ekspor Laporan PDF
      </h1>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Pilih Rentang Waktu</h2>

        <div>
          <label className="text-xs text-gray-500 font-medium">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Tombol Preview */}
          <button
            onClick={() => generatePDF(false)}
            disabled={loading}
            className="bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-3 rounded-xl text-xs hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>

          {/* Tombol Unduh */}
          <button
            onClick={() => generatePDF(true)}
            disabled={loading}
            className="bg-blue-600 text-white font-semibold py-3 rounded-xl text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* Modal Popup Preview PDF */}
      {pdfUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <span className="text-xs font-bold text-gray-700">Pratinjau Laporan PDF</span>
              <button
                onClick={() => setPdfUrl(null)}
                className="p-1 text-gray-500 hover:text-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe src={pdfUrl} className="w-full flex-1" title="Preview PDF" />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}