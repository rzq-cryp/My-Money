import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Gunakan 'gemini-2.5-flash' atau 'gemini-1.5-flash-latest'
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analisis gambar ini (bisa berupa foto struk belanja toko fisik ATAU screenshot bukti transfer/pembayaran m-banking/e-wallet).
Ekstrak data dalam format JSON murni tanpa markdown/backticks:
{
  "total_amount": "ambil nominal utama transaksi/transfer yang dibayarkan atau ditransfer (hanya angka murni, contoh: 50000. Jangan ambil nomor rekening, nomor referensi, atau saldo akhir)",
  "store_name": "nama toko, nama penerima transfer, atau nama layanan m-banking/e-wallet (contoh: 'Transfer ke Budi' atau 'BCA Mobile' atau 'Indomaret')"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const textResponse = result.response.text();
    const cleanedJsonText = textResponse.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanedJsonText);

    return NextResponse.json({
      success: true,
      data: {
        total_amount: parsedData.total_amount.toString().replace(/\D/g, ''),
        store_name: parsedData.store_name || 'Toko / Minimarket',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal menganalisis struk: ' + error.message },
      { status: 500 }
    );
  }
}