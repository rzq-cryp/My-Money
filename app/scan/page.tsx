'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../Lib/Supabase';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { Camera, Image as ImageIcon, Clipboard, Loader2, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isScanned, setIsScanned] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const { data: accData } = await supabase.from('accounts').select('*');
    if (accData && accData.length > 0) {
      setAccounts(accData);
      setAccountId(accData[0].id);
    }

    const { data: catData } = await supabase.from('categories').select('*').eq('type', 'expense');
    if (catData) {
      setCategories(catData);
      if (catData.length > 0) setCategoryId(catData[0].id);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
          canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const compressedBase64 = await compressImage(file);
      setPreview(compressedBase64);
      await processImage(compressedBase64);
    } catch (err) {
      alert('Gagal memproses gambar');
      setLoading(false);
    }
  };

  // 📋 Tempel Gambar dari Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            setPreview(base64);
            setLoading(true);
            await processImage(base64);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('Tidak ada gambar di clipboard! Salin/Copy foto resi terlebih dahulu.');
    } catch (err) {
      alert('Izin clipboard ditolak atau gunakan browser yang mendukung.');
    }
  };

  const processImage = async (base64Image: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, imageBase64: base64Image }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Gagal membaca struk');
      }

      // 1. Deklarasi data hasil scan dari API
      const data = result.data || result;

      const extractedAmount = data.amount || data.total_amount || '';
      const extractedMerchant = data.merchant || data.store_name || '';
      const extractedCategory = data.category_id || data.category || '';

      setAmount(extractedAmount.toString());
      setDescription(extractedMerchant);

      // 2. Otomatis set Wallet jika Gemini menemukan pasangan ID wallet
      if (data.account_id) {
        setAccountId(data.account_id);
      }

      // 3. Otomatis set Kategori
      if (extractedCategory) {
        const matchedCat = categories.find(
          (c) =>
            c.id === extractedCategory ||
            c.name.toLowerCase().includes(String(extractedCategory).toLowerCase())
        );
        if (matchedCat) {
          setCategoryId(matchedCat.id);
        }
      }

      setIsScanned(true);
    } catch (err: any) {
      alert('Gagal membaca struk: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!amount || !accountId) {
      alert('Mohon pilih wallet dan isi nominal!');
      return;
    }

    const { error } = await supabase.from('transactions').insert([
      {
        account_id: accountId,
        category_id: categoryId || null,
        amount: parseFloat(amount),
        type: 'expense',
        description: description || 'Scan Struk AI',
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Scan Struk AI</h1>
        <div className="w-5" />
      </div>

      {/* Box Upload / Preview */}
      <div className="bg-white p-5 border-2 border-dashed border-gray-300 rounded-2xl text-center mb-5 shadow-sm">
        {preview ? (
          <img src={preview} alt="Preview Struk" className="max-h-56 mx-auto rounded-xl mb-4 object-contain shadow-sm" />
        ) : (
          <div className="py-6 flex flex-col items-center">
            <Camera className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 font-medium">Ambil atau Tempel Foto Struk Belanja</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="bg-blue-600 text-white text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-sm">
            <Camera className="w-4 h-4" />
            <span>Kamera HP</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" disabled={loading} />
          </label>
          <label className="bg-slate-100 text-gray-700 border border-gray-200 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-200 transition flex items-center justify-center gap-1.5 shadow-sm">
            <ImageIcon className="w-4 h-4 text-slate-600" />
            <span>Galeri Foto</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={loading} />
          </label>
        </div>

        <button
          type="button"
          onClick={handlePasteFromClipboard}
          disabled={loading}
          className="w-full mt-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold py-2.5 px-3 rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Clipboard className="w-4 h-4 text-indigo-600" />
          <span>Tempel Foto dari Clipboard</span>
        </button>
      </div>

      {/* Indicator Loading */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-center gap-2.5 text-xs text-blue-700 font-semibold mb-4">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Gemini AI sedang membaca nominal, toko, & wallet...</span>
        </div>
      )}

      {/* Form Hasil Scan AI */}
      {isScanned && !loading && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3.5">
          <div className="flex items-center gap-1.5 text-green-600">
            <Check className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Hasil Ekstraksi AI</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Potong dari Wallet (Rekomendasi AI)</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-2.5 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 bg-blue-50/50 mt-1 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Kategori (Rekomendasi AI)</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2.5 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/50 mt-1 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Nama Merchant / Toko</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 mt-1 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Indomaret / Kedai Kopi"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Total Pengeluaran (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl font-bold text-sm text-gray-800 mt-1 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-xs hover:bg-green-700 transition shadow"
          >
            Simpan Transaksi
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}