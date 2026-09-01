import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../Lib/Supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageData = body.imageBase64 || body.image || body.base64;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Tidak ada data gambar yang dikirim' },
        { status: 400 }
      );
    }

    // 1. Ambil daftar kategori pengeluaran dari Supabase
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'expense');

    const categoryOptions = categories 
      ? categories.map(c => `ID: "${c.id}" (Nama: "${c.name}")`).join(', ')
      : '';

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // 2. Prompt dengan instruksi otomatisasi kategori
    const prompt = `Anda adalah sistem AI analisis keuangan. Ekstrak data dari struk/m-banking ini dan tentukan kategorinya.

Daftar Kategori yang Tersedia:
[${categoryOptions}]

Ekstrak informasi dalam format JSON murni:
{
  "total_amount": "Nominal akhir/TOTAL BELANJA (hanya angka murni, contoh: 36200. Abaikan angka Tunai/Kembalian)",
  "store_name": "Nama toko / penerima transfer",
  "category_id": "Pilih SATU 'id' kategori yang paling cocok dari Daftar Kategori di atas berdasarkan barang/toko tersebut. Jika ragu, pilih yang paling mendekati."
}`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let textResponse = '';
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
        ]);

        textResponse = result.response.text();
        if (textResponse) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!textResponse) throw lastError || new Error('Gagal memproses AI');

    const cleanedJsonText = textResponse.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanedJsonText);

    return NextResponse.json({
      success: true,
      data: {
        total_amount: parsedData.total_amount ? parsedData.total_amount.toString().replace(/\D/g, '') : '',
        store_name: parsedData.store_name || 'Toko / Merchant',
        category_id: parsedData.category_id || '',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal menganalisis struk: ' + error.message },
      { status: 500 }
    );
  }
}