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
  const [categoryId, setCategoryId] = useState(''); // State Kategori Tambahan
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // List Kategori
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
    return new Promise((resolve, reject) => {
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

  const processImage = async (base64Image: string) => {
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
        if (result.data.category_id) {
          setCategoryId(result.data.category_id); // Otomatis pilih kategori rekomendasi AI
        }
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
      alert('Mohon pilih wallet dan isi nominal!');
      return;
    }

    const { error } = await supabase.from('transactions').insert([
      {
        account_id: accountId,
        category_id: categoryId || null, // Sertakan Category ID
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
      <h1 className="text-xl font-bold mb-4 text-gray-800">Scan Struk (Auto Categorize)</h1>

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

        <div className="grid grid-cols-2 gap-3 mt-2">
          <label className="bg-blue-600 text-white text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-sm">
            <Camera className="w-4 h-4" />
            <span>Kamera HP</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" disabled={loading} />
          </label>
          <label className="bg-slate-100 text-gray-700 border border-gray-200 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-200 transition flex items-center justify-center gap-1.5 shadow-sm">
            <ImageIcon className="w-4 h-4 text-slate-600" />
            <span>Dari Galeri</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={loading} />
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-blue-600 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> menganalisis nominal & kategori...
        </div>
      )}

      {isScanned && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Hasil AI Auto-Categorize</p>

          <div>
            <label className="text-xs text-gray-500 font-medium">Potong dari Wallet</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white mt-1"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Selector Kategori yang dipilih Otomatis oleh AI */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Kategori Transaksi (Rekomendasi AI)</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 mt-1"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
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