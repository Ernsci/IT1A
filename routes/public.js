const express = require('express');
const router = express.Router();
const { supabase, dbReady } = require('../lib/supabase');
const { getGroupPhoto } = require('../lib/site');

function birthdayInfo(bd) {
  if (!bd) return null;
  const d = new Date(bd + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const hadBirthday =
    now.getMonth() > d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBirthday) age -= 1;
  return {
    date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    short: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    age: Math.max(age, 0),
    isBirthday: now.getMonth() === d.getMonth() && now.getDate() === d.getDate()
  };
}

async function dbQuery(query, res) {
  const { data, count, error } = await query;
  if (error) {
    console.error('db query failed:', error.message);
    throw error;
  }
  return { rows: data || [], count: count || 0 };
}

router.get('/', async (req, res) => {
  let posts = [];
  let stats = { photos: 0, officers: 0, students: 0 };
  if (dbReady()) {
    const [postsRes, photosRes, officersRes, studentsRes] = await Promise.all([
      dbQuery(supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(6), res),
      dbQuery(supabase.from('photos').select('id', { count: 'exact', head: true }), res),
      dbQuery(supabase.from('officers').select('id', { count: 'exact', head: true }), res),
      dbQuery(supabase.from('students').select('id', { count: 'exact', head: true }), res)
    ]);
    posts = postsRes.rows;
    stats = {
      photos: photosRes.count,
      officers: officersRes.count,
      students: studentsRes.count
    };
  }
  res.render('home', { title: 'Home', active: 'home', posts, stats });
});

router.get('/pictures', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 24));
  const offset = (page - 1) * limit;

  let photos = [];
  let albums = [];
  let totalPhotos = 0;
  if (dbReady()) {
    const [p, a, countRes] = await Promise.all([
      dbQuery(supabase.from('photos').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1), res),
      dbQuery(supabase.from('albums').select('*').order('sort_order', { ascending: true }), res),
      dbQuery(supabase.from('photos').select('id', { count: 'exact', head: true }), res)
    ]);
    photos = p.rows;
    albums = a.rows;
    totalPhotos = countRes.count || 0;
  }
  res.render('pictures', { 
    title: 'Pictures', 
    active: 'pictures', 
    photos, 
    albums,
    pagination: {
      page,
      limit,
      total: totalPhotos,
      totalPages: Math.ceil(totalPhotos / limit)
    }
  });
});

router.get('/officers', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 24));
  const offset = (page - 1) * limit;

  let officers = [];
  let totalOfficers = 0;
  if (dbReady()) {
    const [p, countRes] = await Promise.all([
      dbQuery(supabase.from('officers').select('*').order('sort_order', { ascending: true }).range(offset, offset + limit - 1), res),
      dbQuery(supabase.from('officers').select('id', { count: 'exact', head: true }), res)
    ]);
    officers = p.rows.map(function (o) {
      return { ...o, bday: birthdayInfo(o.birthdate) };
    });
    totalOfficers = countRes.count || 0;
  }
  res.render('officers', { 
    title: 'Officers', 
    active: 'officers', 
    officers,
    pagination: {
      page,
      limit,
      total: totalOfficers,
      totalPages: Math.ceil(totalOfficers / limit)
    }
  });
});

router.get('/students', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 24));
  const offset = (page - 1) * limit;

  let students = [];
  let totalStudents = 0;
  if (dbReady()) {
    const [p, countRes] = await Promise.all([
      dbQuery(supabase.from('students').select('*').order('created_at', { ascending: true }).range(offset, offset + limit - 1), res),
      dbQuery(supabase.from('students').select('id', { count: 'exact', head: true }), res)
    ]);
    students = p.rows.map(function (s) {
      return { ...s, bday: birthdayInfo(s.birthdate) };
    });
    totalStudents = countRes.count || 0;
  }
  res.render('students', { 
    title: 'Students', 
    active: 'students', 
    students,
    pagination: {
      page,
      limit,
      total: totalStudents,
      totalPages: Math.ceil(totalStudents / limit)
    }
  });
});

router.get('/notes', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  let notes = [];
  let totalNotes = 0;
  if (dbReady()) {
    const [p, countRes] = await Promise.all([
      dbQuery(supabase.from('notes').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1), res),
      dbQuery(supabase.from('notes').select('id', { count: 'exact', head: true }), res)
    ]);
    notes = p.rows;
    totalNotes = countRes.count || 0;
  }
  res.render('notes', { 
    title: 'Notes', 
    active: 'notes', 
    notes,
    pagination: {
      page,
      limit,
      total: totalNotes,
      totalPages: Math.ceil(totalNotes / limit)
    }
  });
});

router.get('/notes/:id/download', async (req, res) => {
  if (!dbReady()) return res.status(503).send('Database not configured');
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).send('Invalid note id');
    const { data: existing, error: dbErr } = await supabase.from('notes').select('title, path').eq('id', id).maybeSingle();
    if (dbErr) throw dbErr;
    if (!existing || !existing.path) return res.status(404).send('File not found');
    const { data, error } = await supabase.storage.from('media').download(existing.path);
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    const safeName = (existing.title || 'note').replace(/[^a-z0-9 _.-]/gi, '').trim() || 'note';
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Length', buffer.length);
    res.set('Content-Disposition', `inline; filename="${safeName}.pdf"`);
    res.send(buffer);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/special', async (req, res) => {
  const groupPhoto = dbReady() ? await getGroupPhoto() : null;
  res.render('special', { title: 'Special', active: 'special', groupPhoto });
});

router.get('/video', async (req, res) => {
  res.render('video', { title: 'Video', active: 'video' });
});

module.exports = router;
