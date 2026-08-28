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

  var audio = document.createElement('audio');
  audio.src = '/music/' + name + '.mp3';
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.45;
  audio.setAttribute('aria-hidden', 'true');
  document.body.appendChild(audio);

  function start() {
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.catch(function () {
        var go = function () {
          document.removeEventListener('click', go);
          document.removeEventListener('keydown', go);
          document.removeEventListener('touchstart', go);
          audio.play().catch(function () {});
        };
        document.addEventListener('click', go);
        document.addEventListener('keydown', go);
        document.addEventListener('touchstart', go);
      });
    }
  }

  start();
})();
