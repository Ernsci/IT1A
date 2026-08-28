(function () {
  'use strict';

  /* route slug -> music track filename (without extension) */
  var TRACK = {
    '': 'home',
    'home': 'home',
    'pictures': 'pictures',
    'officers': 'officers',
    'students': 'students',
    'notes': 'note',
    'special': 'special'
  };

  var seg = (location.pathname || '/').split('/')[1] || '';
  var name = TRACK[seg];
  if (!name) return; /* no track for this route (e.g. /video) */

  var src = '/music/' + name + '.mp3';
  var STORE = 'it1a-bgm-off';

  var audio = document.createElement('audio');
  audio.src = src;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.45;
  audio.setAttribute('aria-hidden', 'true');
  document.body.appendChild(audio);

  var btn = document.getElementById('music-toggle');
  var label = btn ? btn.querySelector('.music-label') : null;
  var userWantsOff = localStorage.getItem(STORE) === '1';
  var blocked = false;

  function setState(state) {
    if (!btn) return;
    if (state === 'playing') {
      btn.classList.add('is-playing');
      btn.classList.remove('is-blocked');
      btn.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = 'mute';
    } else if (state === 'blocked') {
      btn.classList.add('is-blocked');
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = 'tap ↻';
    } else {
      btn.classList.remove('is-playing', 'is-blocked');
      btn.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = 'play';
    }
  }

  function start() {
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { setState('playing'); })
       .catch(function () { blocked = true; setState('blocked'); waitForGesture(); });
    }
  }

  function waitForGesture() {
    if (userWantsOff) return;
    var go = function () {
      document.removeEventListener('click', go);
      document.removeEventListener('keydown', go);
      document.removeEventListener('touchstart', go);
      start();
    };
    document.addEventListener('click', go);
    document.addEventListener('keydown', go);
    document.addEventListener('touchstart', go);
  }

  audio.addEventListener('pause', function () {
    if (!audio.ended) setState(userWantsOff ? 'off' : 'paused');
  });

  if (btn) {
    btn.addEventListener('click', function () {
      if (audio.paused) {
        userWantsOff = false;
        localStorage.removeItem(STORE);
        start();
      } else {
        userWantsOff = true;
        localStorage.setItem(STORE, '1');
        audio.pause();
        setState('off');
      }
    });
  }

  if (userWantsOff) {
    setState('off');
  } else {
    start();
  }
})();
