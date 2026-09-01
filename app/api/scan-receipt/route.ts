import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // Ambil file yang dikirim oleh iOS Shortcut
    const file = formData.get('file') as File || formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file gambar' }, { status: 400 });
    }

    // Konversi file gambar ke Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Redirect langsung ke halaman scan PWA
    const response = NextResponse.redirect(new URL('/scan?shared=true', request.url), 303);
    
    // Simpan gambar di Cookie sementara (berlaku 5 menit)
    response.cookies.set('shared_receipt', base64Image, { 
      maxAge: 60 * 5,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}