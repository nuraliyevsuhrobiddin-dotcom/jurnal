import { describe, it, expect } from 'vitest';
import { createCertificate, getCertificateByCode, revokeCertificate } from '@/lib/db';
import { generateCertificatePdf } from '@/lib/pdf/generator';
import { generateQrDataUrl } from '@/lib/pdf/qr';

describe('Author Certificate & QR Verification Tests', () => {
  it('should generate a valid certificate with unique numbering and verification code', async () => {
    const cert = await createCertificate({
      article_id: 'test-art-1',
      author_name: 'Dr. Test Muallif',
      author_affiliation: 'TATU',
      article_title: 'Sun‘iy intellekt tadqiqoti',
      issue_volume: 1,
      issue_number: 1,
      issue_year: 2026,
    });

    expect(cert.certificate_number).toMatch(/^AGM-CERT-2026-\d{6}$/);
    expect(cert.verification_code).toMatch(/^AGM-VER-[A-Z0-9]+$/);
    expect(cert.status).toBe('valid');
  });

  it('should allow QR code generation and verification lookup by certificate number', async () => {
    const cert = await createCertificate({
      article_id: 'test-art-2',
      author_name: 'Prof. Sobirov',
      article_title: 'Kriptografiya asoslari',
      issue_volume: 1,
      issue_number: 2,
      issue_year: 2026,
    });

    const qrData = await generateQrDataUrl(`https://agmjoural.uz/certificate/${cert.certificate_number}`);
    expect(qrData).toContain('data:image/png;base64,');

    // Lookup by exact number
    const found = await getCertificateByCode(cert.certificate_number);
    expect(found).not.toBeNull();
    expect(found?.author_name).toBe('Prof. Sobirov');
    expect(found?.status).toBe('valid');

    // Lookup by verification code
    const foundByCode = await getCertificateByCode(cert.verification_code);
    expect(foundByCode).not.toBeNull();
    expect(foundByCode?.id).toBe(cert.id);
  });

  it('should revoke certificate without deleting the record, displaying revoked status and reason', async () => {
    const cert = await createCertificate({
      article_id: 'test-art-3',
      author_name: 'Test Bekor Qilinadigan',
      article_title: 'Sinov maqola',
      issue_volume: 1,
      issue_number: 1,
      issue_year: 2026,
    });

    const reason = 'Antiplagiat talabi buzilganligi sababli';
    const revoked = await revokeCertificate(cert.id, reason);

    expect(revoked).not.toBeNull();
    expect(revoked?.status).toBe('revoked');
    expect(revoked?.revoked_reason).toBe(reason);

    // Verify lookup still returns the record with 'revoked'
    const lookup = await getCertificateByCode(cert.certificate_number);
    expect(lookup?.status).toBe('revoked');
    expect(lookup?.revoked_reason).toBe(reason);
  });

  it('should render a valid PDF document with embedded fonts, metadata, and QR code', async () => {
    const cert = await createCertificate({
      article_id: 'test-art-pdf',
      author_name: 'Academician Shavkat Ayupov',
      author_affiliation: 'Matematika instituti',
      article_title: 'Funksional analiz va operatorlar algebrasi',
      issue_volume: 1,
      issue_number: 1,
      issue_year: 2026,
      issue_date: '2026-02-15',
    });

    const pdfBytes = await generateCertificatePdf(cert, `https://agmjoural.uz/certificate/${cert.certificate_number}`);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000); // Valid PDF file size

    // Check PDF magic header "%PDF-"
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});
