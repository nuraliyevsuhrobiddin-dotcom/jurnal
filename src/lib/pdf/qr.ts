import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#102b3f',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQrPngBuffer(text: string): Promise<Buffer> {
  try {
    return await QRCode.toBuffer(text, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#102b3f',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('QR code buffer generation failed:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}
