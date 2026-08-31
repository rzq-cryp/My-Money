'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../Lib/Supabase';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Data Form dari AI
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isScanned, setIsScanned] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*');
    if (data && data.length > 0) {
      setAccounts(data);
      setAccountId(data[0].id);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPreview(base64String);
      await processImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });
      const result = await res.json();

      if (result.success) {
        setAmount(result.data.total_amount);
        setDescription(result.data.store_name);
        setIsScanned(true);
      } else {
        alert('Gagal membaca struk: ' + result.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memproses gambar');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!amount || !accountId) {
      alert('Mohon pilih wallet dan pastikan nominal terisi!');
      return;
    }

    const { error } = await supabase.from('transactions').insert([
      {
        account_id: accountId,
        amount: parseFloat(amount),
        type: 'expense',
        description,
        transaction_date: new Date().toISOString(),
        is_automated: true,
      },
    ]);

    if (!error) {
      router.push('/');
    } else {
      alert('Gagal menyimpan transaksi: ' + error.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24 min-h-screen bg-gray-50">
      <h1 className="text-xl font-bold mb-4 text-gray-800">Scan Struk Belanja (AI)</h1>

      {/* Upload Box */}
      <div className="bg-white p-6 border-2 border-dashed border-gray-300 rounded-2xl text-center mb-6">
        {preview ? (
          <img src={preview} alt="Struk" className="max-h-56 mx-auto rounded-lg mb-4 object-contain" />
        ) : (
          <div className="py-6 flex flex-col items-center">
            <Camera className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Pilih metode pengambilan foto struk</p>
          </div>
        )}

        {/* 2 Tombol Terpisah: Kamera & Galeri */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Input Kamera */}
          <label className="bg-blue-600 text-white text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-sm">
            <Camera className="w-4 h-4" />
            <span>Kamera HP</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={loading} 
            />
          </label>

          {/* Input Galeri / File */}
          <label className="bg-slate-100 text-gray-700 border border-gray-200 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-200 transition flex items-center justify-center gap-1.5 shadow-sm">
            <ImageIcon className="w-4 h-4 text-slate-600" />
            <span>Dari Galeri</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={loading} 
            />
          </label>
        </div>
      </div>

      {/* Result Form */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-blue-600 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Gemini AI sedang menganalisis struk...
        </div>
      )}

      {isScanned && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Hasil Ekstraksi AI</p>

          <div>
            <label className="text-xs text-gray-500 font-medium">Potong dari Wallet / Rekening</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white mt-1"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Nama Merchant / Toko</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-800 mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Total Pengeluaran (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg font-bold text-base text-gray-800 mt-1"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-green-700 transition shadow"
          >
            Simpan Transaksi
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}