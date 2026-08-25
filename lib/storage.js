const crypto = require('crypto');
const { supabase } = require('./supabase');

const BUCKET = 'media';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PDF_TYPE = 'application/pdf';
const IMAGE_MAX = 10 * 1024 * 1024;
const PDF_MAX = 25 * 1024 * 1024;

function isPdfMagic(buffer) {
  if (!buffer || buffer.length < 5) return false;
  const head = buffer.subarray(0, 1024).toString('latin1');
  return head.includes('%PDF-');
}

function fileOk(file, kind) {
  if (!file) return false;
  if (kind === 'pdf') {
    return file.mimetype === PDF_TYPE && file.size <= PDF_MAX && isPdfMagic(file.buffer);
  }
  return IMAGE_TYPES.has(file.mimetype) && file.size <= IMAGE_MAX;
}

async function uploadFile(file, folder, kind) {
  if (!fileOk(file, kind)) {
    throw new Error(
      kind === 'pdf'
        ? 'Invalid file. Only real PDF files up to 25MB are allowed.'
        : 'Invalid file. Use JPG, PNG, WEBP or GIF under 10MB.'
    );
  }
  const ext = kind === 'pdf' ? '.pdf' : ((file.originalname.match(/\.[a-z0-9]+$/i) || [])[0] || '.jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: kind === 'pdf' ? PDF_TYPE : file.mimetype,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

function uploadImage(file, folder) {
  return uploadFile(file, folder, 'image');
}

function uploadPdf(file, folder) {
  return uploadFile(file, folder, 'pdf');
}

async function deleteFile(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('storage remove failed:', error.message);
}

module.exports = { uploadImage, uploadPdf, deleteFile, fileOk };
