import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı." }, { status: 400 });
    }

    // Base64 verisini Buffer'a çeviriyoruz
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const uniqueFilename = `nisan-${Date.now()}-${filename || 'foto.jpg'}`;

    // Doğrudan Blob depoya kaydediyoruz
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error("Yükleme hatası:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }
}