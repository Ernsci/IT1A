require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const publicRoutes = require('./routes/public');
const adinRoutes = require('./routes/adin');
const apiRoutes = require('./routes/api');
const { getSite } = require('./lib/site');

if (!process.env.ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD environment variable is not set');
  process.exit(1);
}

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set');
  process.exit(1);
}

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
    store: new FileStore({
      path: path.join(__dirname, '.sessions'),
      ttl: 12 * 60 * 60,
      retries: 0,
      logFn: () => {}
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
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
