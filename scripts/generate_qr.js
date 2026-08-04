const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://nisan-app-taupe.vercel.app';
const outputDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Soft Blue Ink extracted from user's invitation:
// Deep Blue Ink: #5a7cb6

async function generateQRCodes() {
  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 1,
    margin: 2,
    width: 1200,
    color: {
      dark: '#5a7cb6',  // Soft blue ink
      light: '#ffffff'  // Clean white
    }
  };

  const outputPath1 = path.join(outputDir, 'qr-code-blue.png');
  await QRCode.toFile(outputPath1, targetUrl, options);
  console.log('Generated QR code for:', targetUrl, 'at:', outputPath1);

  // Soft transparent version
  const optionsTransparent = {
    ...options,
    color: {
      dark: '#5a7cb6',
      light: '#00000000' // transparent background
    }
  };
  const outputPath2 = path.join(outputDir, 'qr-code-blue-transparent.png');
  await QRCode.toFile(outputPath2, targetUrl, optionsTransparent);
  console.log('Generated Transparent QR code at:', outputPath2);
}

generateQRCodes().catch(console.error);
