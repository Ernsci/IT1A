const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuthApi } = require('../lib/auth');
const { supabase, dbReady } = require('../lib/supabase');
const { uploadImage, deleteImage } = require('../lib/storage');
const { getSite, saveSite } = require('../lib/site');

router.use(requireAuthApi);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
  }
});

function dbCheck(res) {
  if (!dbReady()) {
    res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.' });
    return false;
  }
  return true;
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function fail(res, err) {
  console.error('api error:', err.message);
  res.status(500).json({ error: err.message });
}

const listOrder = {
  posts: { col: 'created_at', asc: false },
  photos: { col: 'created_at', asc: false },
  officers: { col: 'sort_order', asc: true },
  students: { col: 'created_at', asc: true }
};

for (const table of Object.keys(listOrder)) {
  router.get(`/${table}`, async (req, res) => {
    if (!dbCheck(res)) return;
    const { col, asc } = listOrder[table];
    try {
      const { data, error } = await supabase.from(table).select('*').order(col, { ascending: asc });
      if (error) throw error;
      res.json({ items: data || [] });
    } catch (err) {
      fail(res, err);
    }
  });
}

router.post('/posts', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const title = str(req.body.title);
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    let cover = { url: str(req.body.cover_url), path: str(req.body.cover_path) };
    if (req.file) cover = await uploadImage(req.file, 'posts');
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        body: str(req.body.body),
        category: req.body.category === 'dumb' ? 'dumb' : 'activity',
        cover_url: cover.url,
        cover_path: cover.path,
        event_date: str(req.body.event_date) || null
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/posts/:id', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const title = str(req.body.title);
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const patch = {
      title,
      body: str(req.body.body),
      category: req.body.category === 'dumb' ? 'dumb' : 'activity',
      event_date: str(req.body.event_date) || null
    };
    if (req.file) {
      const { data: existing } = await supabase.from('posts').select('cover_path').eq('id', id).maybeSingle();
      const cover = await uploadImage(req.file, 'posts');
      patch.cover_url = cover.url;
      patch.cover_path = cover.path;
      if (existing && existing.cover_path) await deleteImage(existing.cover_path);
    }
    const { data, error } = await supabase.from('posts').update(patch).eq('id', id).select().single();
    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/posts/:id', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('posts').select('cover_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
    if (existing && existing.cover_path) await deleteImage(existing.cover_path);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/photos', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    if (!req.file) return res.status(400).json({ error: 'Pick an image to upload.' });
    const { url, path } = await uploadImage(req.file, 'pictures');
    const { data, error } = await supabase
      .from('photos')
      .insert({
        title: str(req.body.title),
        caption: str(req.body.caption),
        album: str(req.body.album) || 'General',
        url,
        path
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/photos/:id', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('photos').select('path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    if (existing && existing.path) await deleteImage(existing.path);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/officers', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const name = str(req.body.name);
    const position = str(req.body.position);
    if (!name || !position) return res.status(400).json({ error: 'Name and position are required.' });
    let photo = { url: str(req.body.photo_url), path: str(req.body.photo_path) };
    if (req.file) photo = await uploadImage(req.file, 'officers');
    const { data, error } = await supabase
      .from('officers')
      .insert({
        name,
        position,
        quote: str(req.body.quote),
        photo_url: photo.url,
        photo_path: photo.path,
        sort_order: parseInt(req.body.sort_order, 10) || 0
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/officers/:id', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const name = str(req.body.name);
    const position = str(req.body.position);
    if (!name || !position) return res.status(400).json({ error: 'Name and position are required.' });
    const patch = {
      name,
      position,
      quote: str(req.body.quote),
      sort_order: parseInt(req.body.sort_order, 10) || 0
    };
    if (req.file) {
      const { data: existing } = await supabase.from('officers').select('photo_path').eq('id', id).maybeSingle();
      const photo = await uploadImage(req.file, 'officers');
      patch.photo_url = photo.url;
      patch.photo_path = photo.path;
      if (existing && existing.photo_path) await deleteImage(existing.photo_path);
    }
    const { data, error } = await supabase.from('officers').update(patch).eq('id', id).select().single();
    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/officers/:id', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('officers').select('photo_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('officers').delete().eq('id', id);
    if (error) throw error;
    if (existing && existing.photo_path) await deleteImage(existing.photo_path);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/students', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const name = str(req.body.name);
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    let photo = { url: str(req.body.photo_url), path: str(req.body.photo_path) };
    if (req.file) photo = await uploadImage(req.file, 'students');
    const { data, error } = await supabase
      .from('students')
      .insert({ name, nickname: str(req.body.nickname), photo_url: photo.url, photo_path: photo.path })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/students/:id', upload.single('file'), async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const name = str(req.body.name);
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const patch = { name, nickname: str(req.body.nickname) };
    if (req.file) {
      const { data: existing } = await supabase.from('students').select('photo_path').eq('id', id).maybeSingle();
      const photo = await uploadImage(req.file, 'students');
      patch.photo_url = photo.url;
      patch.photo_path = photo.path;
      if (existing && existing.photo_path) await deleteImage(existing.photo_path);
    }
    const { data, error } = await supabase.from('students').update(patch).eq('id', id).select().single();
    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/students/:id', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('students').select('photo_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    if (existing && existing.photo_path) await deleteImage(existing.photo_path);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/settings', async (req, res) => {
  res.json({ site: await getSite() });
});

router.put('/settings', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const patch = {};
    for (const k of ['title', 'tagline', 'heroText', 'about']) {
      if (typeof req.body[k] === 'string') patch[k] = req.body[k].trim();
    }
    const site = await saveSite(patch);
    res.json({ site });
  } catch (err) {
    fail(res, err);
  }
});

module.exports = router;
