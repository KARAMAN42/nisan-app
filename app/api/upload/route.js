export async function POST(request) {
  try {
    const { image, filename } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı." }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Dosya yükleme mantığını kontrol edin
    // Örneğin, dosyanın boyutunu kontrol etmek için:
    if (buffer.length > 10 * 1024 * 1024) { // 10 MB limiti
      return NextResponse.json({ error: "Dosya boyutu 10 MB'dan büyük olamaz." }, { status: 400 });
    }

    // Dosyayı kaydetmek için kodunuzu buraya ekleyin

    return NextResponse.json({ message: "Fotoğraf başarıyla yüklendi." }, { status: 200 });
  } catch (error) {
    console.error("Dosya yükleme hatası:", error);
    return NextResponse.json({ error: "Bir hata oluştu." }, { status: 500 });
  }
}
