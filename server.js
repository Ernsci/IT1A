require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const publicRoutes = require('./routes/public');
const adinRoutes = require('./routes/adin');
const apiRoutes = require('./routes/api');
const { getSite } = require('./lib/site');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    name: 'it1a.sid',
    secret: process.env.SESSION_SECRET || 'it1a-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 12 * 60 * 60 * 1000
    }
  })
);

app.use(async (req, res, next) => {
  res.locals.site = await getSite();
  res.locals.currentPath = req.path;
  next();
});

app.use('/adin/api', apiRoutes);
app.use('/adin', adinRoutes);
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/adin/api')) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  res.status(500).render('404', { title: 'Error', errorMessage: 'Something glitched in the matrix. Head back home.' });
});

app.listen(PORT, () => {
  console.log(`IT1A online → http://localhost:${PORT}`);
});
