const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- Checking Profiles ---');
  const { data: profiles, error: errProf } = await supabase.from('sur_profiles').select('*');
  console.log('Profiles:', profiles);
  if (errProf) console.log('Profiles Error:', errProf);

  console.log('--- Checking Entries ---');
  const { data: entries, error: errEnt } = await supabase.from('sur_entries').select('*');
  console.log('Entries:', entries);
  if (errEnt) console.log('Entries Error:', errEnt);
}

check();
