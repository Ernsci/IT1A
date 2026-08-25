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

async function safe(query) {
  try {
    const { data, count, error } = await query;
    if (error) throw error;
    return { rows: data || [], count: count || 0 };
  } catch (err) {
    console.error('db query failed:', err.message);
    return { rows: [], count: 0 };
  }
}

router.get('/', async (req, res) => {
  let posts = [];
  let stats = { photos: 0, officers: 0, students: 0 };
  if (dbReady()) {
    const [postsRes, photosRes, officersRes, studentsRes] = await Promise.all([
      safe(supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(6)),
      safe(supabase.from('photos').select('id', { count: 'exact', head: true })),
      safe(supabase.from('officers').select('id', { count: 'exact', head: true })),
      safe(supabase.from('students').select('id', { count: 'exact', head: true }))
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
  let photos = [];
  let albums = [];
  if (dbReady()) {
    const [p, a] = await Promise.all([
      safe(supabase.from('photos').select('*').order('created_at', { ascending: false })),
      safe(supabase.from('albums').select('*').order('sort_order', { ascending: true }))
    ]);
    photos = p.rows;
    albums = a.rows;
  }
  res.render('pictures', { title: 'Pictures', active: 'pictures', photos, albums });
});

router.get('/officers', async (req, res) => {
  let officers = dbReady()
    ? (await safe(supabase.from('officers').select('*').order('sort_order', { ascending: true }))).rows
    : [];
  officers = officers.map(function (o) {
    return { ...o, bday: birthdayInfo(o.birthdate) };
  });
  res.render('officers', { title: 'Officers', active: 'officers', officers });
});

router.get('/students', async (req, res) => {
  let students = dbReady()
    ? (await safe(supabase.from('students').select('*').order('created_at', { ascending: true }))).rows
    : [];
  students = students.map(function (s) {
    return { ...s, bday: birthdayInfo(s.birthdate) };
  });
  res.render('students', { title: 'Students', active: 'students', students });
});

router.get('/notes', async (req, res) => {
  const notes = dbReady()
    ? (await safe(supabase.from('notes').select('*').order('created_at', { ascending: false }))).rows
    : [];
  res.render('notes', { title: 'Notes', active: 'notes', notes });
});

router.get('/special', async (req, res) => {
  const groupPhoto = dbReady() ? await getGroupPhoto() : null;
  res.render('special', { title: 'Special', active: 'special', groupPhoto });
});

module.exports = router;
