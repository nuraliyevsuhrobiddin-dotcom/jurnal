import { NextRequest, NextResponse } from 'next/server';
import { getCertificateByCode } from '@/lib/db';
import { generateCertificatePdf } from '@/lib/pdf/generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cert = await getCertificateByCode(code);

    if (!cert) {
      return new NextResponse('Certificate not found', { status: 404 });
    }
    if (cert.status === 'revoked') return new NextResponse('Certificate revoked', { status: 410 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const verificationUrl = `${baseUrl}/certificate/${cert.certificate_number}`;

    const pdfBytes = await generateCertificatePdf(cert, verificationUrl);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cert.certificate_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
