const express = require('express');
const router = express.Router();
const { checkPassword, requireAuth, loginLimiter } = require('../lib/auth');
const { supabase, dbReady } = require('../lib/supabase');

router.get('/', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/adin/dashboard');
  res.render('adin/login', { title: 'Access Terminal', error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};
  if (!checkPassword(password)) {
    return res.status(401).render('adin/login', {
      title: 'Access Terminal',
      error: 'ACCESS DENIED — wrong password.'
    });
  }
  req.session.admin = true;
  res.redirect('/adin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/adin'));
});

router.get('/dashboard', requireAuth, async (req, res) => {
  let data = { posts: [], photos: [], officers: [], students: [], notes: [] };
  if (dbReady()) {
    try {
      const [posts, photos, officers, students, notes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('photos').select('*').order('created_at', { ascending: false }),
        supabase.from('officers').select('*').order('sort_order', { ascending: true }),
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('notes').select('*').order('created_at', { ascending: false })
      ]);
      data = {
        posts: posts.data || [],
        photos: photos.data || [],
        officers: officers.data || [],
        students: students.data || [],
        notes: notes.data || []
      };
    } catch (err) {
      console.error('dashboard load failed:', err.message);
    }
  }
  res.render('adin/dashboard', {
    title: 'Admin Console',
    data,
    dbReady: dbReady()
  });
});

module.exports = router;
