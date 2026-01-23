import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path: node image-to-b64.js <path-to-image>');
  process.exit(1);
}

try {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  
  const base64Image = fs.readFileSync(absolutePath, { encoding: 'base64' });
  const dataUri = `data:${mimeType};base64,${base64Image}`;
  
  const { execSync } = await import('child_process');
  execSync('pbcopy', { input: dataUri });
  
  console.log(`✅ Success! Base64 data URI for "${path.basename(filePath)}" copied to clipboard.`);
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}