import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const imageTypes = {
  'image/jpeg': { extension: 'jpg', matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', matches: (bytes: Uint8Array) => bytes.subarray(0, 8).join(',') === '137,80,78,71,13,10,26,10' },
  'image/webp': { extension: 'webp', matches: (bytes: Uint8Array) => String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP' },
} as const;

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Muqova yuklash uchun Supabase URL va service role key sozlanishi kerak.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json({ error: 'Muqova fayli 4 MB dan oshmasligi kerak.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Rasm faylini o‘qib bo‘lmadi.' }, { status: 400 });
  }

  const file = formData.get('cover');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Muqova rasmi tanlanmagan.' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Rasm bo‘sh yoki 4 MB dan katta.' }, { status: 400 });
  }

  const format = imageTypes[file.type as keyof typeof imageTypes];
  if (!format) {
    return NextResponse.json({ error: 'Faqat JPG, PNG yoki WebP rasm yuklash mumkin.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.matches(bytes)) {
    return NextResponse.json({ error: 'Fayl turi uning haqiqiy rasm formatiga mos emas.' }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: 'Supabase bilan bog‘lanib bo‘lmadi.' }, { status: 503 });

  const objectPath = `issues/${randomUUID()}.${format.extension}`;
  const { error } = await client.storage.from('journal-covers').upload(objectPath, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: 'Muqovani saqlab bo‘lmadi. 006 storage migratsiyasi bajarilganini tekshiring.' }, { status: 500 });
  }

  const { data } = client.storage.from('journal-covers').getPublicUrl(objectPath);
  return NextResponse.json({ url: data.publicUrl });
}
