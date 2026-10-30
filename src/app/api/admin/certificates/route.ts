import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { getAllCertificatesAdmin, createCertificate, revokeCertificate, getArticleById, deleteCertificate } from '@/lib/db';
import { generateQrDataUrl } from '@/lib/pdf/qr';
import { randomUUID } from 'node:crypto';
import { articleText } from '@/lib/scholarly-feeds';
import { certificatePublicationState } from '@/lib/publication-state';

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const certs = await getAllCertificatesAdmin();
    return NextResponse.json(certs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const body = await request.json();

    // Revoke action
    if (body.action === 'revoke') {
      const { id, reason } = body;
      if (!id || !reason) {
        return NextResponse.json({ error: 'ID and reason are required' }, { status: 400 });
      }
      const revoked = await revokeCertificate(id, reason);
      if (!revoked) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      return NextResponse.json(revoked);
    }

    // Generate certificates for an article
    const { article_id, author_name } = body;
    const article = await getArticleById(article_id);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status !== 'published') {
      return NextResponse.json({
        error: 'Nashr sertifikati faqat nashr qilingan maqolalar uchun chiqariladi'
      }, { status: 400 });
    }
    const name = author_name || article.authors?.[0]?.full_name;
    if (!name || !article.authors?.some(author => author.full_name === name)) {
      return NextResponse.json({ error: 'Maqola muallifini tanlang' }, { status: 400 });
    }
    const existing = (await getAllCertificatesAdmin()).find(cert => cert.article_id === article.id && cert.author_name === name && cert.status === 'valid');
    if (existing && certificatePublicationState(existing, article).valid) return NextResponse.json(existing);
    if (existing) await revokeCertificate(existing.id, 'Nashr ma’lumotlari yangilangan. Yangi sertifikat bilan almashtirildi.');

    if (!article.issue || !article.publication_date) return NextResponse.json({ error: 'Avval jurnal soni va nashr sanasini belgilang.' }, { status: 400 });
    const author = article.authors.find(author => author.full_name === name)!;
    const vol = article.issue.volume;
    const iss = article.issue.issue_number;
    const yr = article.issue.year;

    // Verification URL preview for QR code
    const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    const tempVerCode = `AGM-VER-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const qrDataUrl = await generateQrDataUrl(`${baseUrl}/certificate/${tempVerCode}`);

    const newCert = await createCertificate({
      article_id: article.id,
      author_name: name,
      author_affiliation: author.affiliation || '',
      article_title: articleText(article, article.original_language).title,
      issue_volume: vol,
      issue_number: iss,
      issue_year: yr,
      issue_date: article.publication_date || new Date().toISOString().split('T')[0],
      qr_code_data_url: qrDataUrl,
      verification_code: tempVerCode,
    });

    return NextResponse.json(newCert, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const deleted = await deleteCertificate(id);
    return deleted ? NextResponse.json({ success: true, id }) : NextResponse.json({ error: 'Sertifikat topilmadi' }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
