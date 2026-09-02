import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Inisialisasi Supabase Client di server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const imageStr = body.image || body.imageBase64 || body.file;

      if (!imageStr) {
        return NextResponse.json({ success: false, error: 'Gambar tidak ditemukan' }, { status: 400 });
      }

      if (imageStr.startsWith('data:')) {
        const parts = imageStr.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        base64Data = parts[1];
      } else {
        base64Data = imageStr;
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = (formData.get('file') || formData.get('image')) as File;

      if (!file) {
        return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      base64Data = Buffer.from(bytes).toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else {
      return NextResponse.json(
        { success: false, error: 'Format Content-Type tidak didukung' },
        { status: 400 }
      );
    }

    // 1. Ambil daftar Wallet/Rekening dari Supabase User
    const { data: userAccounts } = await supabase.from('accounts').select('id, account_name, account_type');
    const availableWallets = userAccounts || [];

    // Format opsi wallet untuk dijadikan acuan AI
    const walletListString = availableWallets
      .map((w) => `ID: "${w.id}", Nama: "${w.account_name}", Tipe: "${w.account_type}"`)
      .join('\n');

    // 2. Inisialisasi Model Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // 3. Prompt Khusus untuk Deteksi M-Banking / Struk
    const prompt = `
      Analisis gambar resi/bukti transaksi/screenshot M-Banking ini.
      
      Tugas utama:
      1. Ekstrak nominal total transaksi ("total_amount").
      2. Ekstrak nama toko, merchant, atau penerima ("store_name").
      3. Deteksi nama Bank atau E-Wallet yang digunakan untuk bertransaksi dari logo, watermark, atau teks (seperti BCA, Mandiri, BRI, BNI, BTN, GoPay, OVO, DANA, ShopeePay, dll).
      4. Cocokkan Bank/E-Wallet tersebut dengan daftar wallet user berikut:
      ---
      ${walletListString}
      ---
      
      Pilih ID wallet yang paling cocok dan masukkan ke "matched_account_id". Jika tidak ada yang cocok, kembalikan null.

      Kembalikan HANYA format JSON valid tanpa tanda backtick:
      {
        "total_amount": number,
        "store_name": string,
        "category": "Makanan / Belanja / Transportasi / Hiburan / Tagihan / Lainnya",
        "matched_account_id": "string atau null"
      }
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();

    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    return NextResponse.json({
      success: true,
      data: {
        total_amount: parsedData.total_amount || 0,
        store_name: parsedData.store_name || 'Transaksi Baru',
        category: parsedData.category || 'Lainnya',
        account_id: parsedData.matched_account_id || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}