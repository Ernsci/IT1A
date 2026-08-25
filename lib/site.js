const { supabase, dbReady } = require('./supabase');

const DEFAULT_SITE = {
  title: 'IT1A',
  tagline: 'BSIT · DORSU',
  heroText: 'The official den of IT1A — where code, chaos and camaraderie collide. We build projects, survive exams, and document every gloriously dumb moment in between.',
  about: 'IT1A is a section of BSIT students at Davao Oriental State University. By day we write programs and pass (most) exams — by night we turn everything ridiculous we did along the way into content. This site is our archive: the wins, the losses, and the memories that live rent-free in the class group chat.'
};

async function getSite() {
  if (!dbReady()) return { ...DEFAULT_SITE };
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'site')
      .maybeSingle();
    if (error) throw error;
    return { ...DEFAULT_SITE, ...(data && data.value ? data.value : {}) };
  } catch (err) {
    console.error('getSite failed:', err.message);
    return { ...DEFAULT_SITE };
  }
}

async function saveSite(patch) {
  const current = await getSite();
  const value = { ...current, ...patch };
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'site', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
  return value;
}

module.exports = { getSite, saveSite, DEFAULT_SITE };
