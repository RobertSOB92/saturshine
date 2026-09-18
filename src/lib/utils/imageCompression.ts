import imageCompression from 'browser-image-compression';

/**
 * Kompresuje zdjęcie przed wysłaniem do Supabase Storage.
 * Docelowo: max 1.5MB, max 1920px dłuższy bok.
 * Zachowuje JPEG jako format wyjściowy.
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
    onProgress: undefined, // można przekazać callback jeśli potrzebny progress
  };

  try {
    const compressed = await imageCompression(file, options);

    // Upewniamy się, że zwracamy obiekt File (nie Blob)
    if (compressed instanceof File) {
      return compressed;
    }

    // Konwertuj Blob na File z zachowaniem nazwy
    const originalName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    return new File([compressed], originalName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Błąd kompresji zdjęcia:', error);
    // Fallback: zwróć oryginalne zdjęcie jeśli kompresja się nie powiedzie
    return file;
  }
}

/**
 * Tworzy Data URL z pliku (do podglądu miniatury przed wysyłką)
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
