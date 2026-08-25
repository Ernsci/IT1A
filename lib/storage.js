const crypto = require('crypto');
const { supabase } = require('./supabase');

const BUCKET = 'media';
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileOk(file) {
  return file && ALLOWED.has(file.mimetype) && file.size <= 10 * 1024 * 1024;
}

async function uploadImage(file, folder) {
  if (!fileOk(file)) throw new Error('Invalid file. Use JPG, PNG, WEBP or GIF under 10MB.');
  const ext = ((file.originalname.match(/\.[a-z0-9]+$/i) || [])[0] || '.jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function deleteImage(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('storage remove failed:', error.message);
}

module.exports = { uploadImage, deleteImage, fileOk };
