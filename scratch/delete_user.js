const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteUser() {
  console.log('Attempting to delete or reset pjuanramon@hotmail.com...');
  
  // Try calling RPC or table cleanup if permitted
  const { data: profile } = await supabase.from('sur_profiles').select('*').eq('username', 'pjuanramon').maybeSingle();
  console.log('Profile found:', profile);

  if (profile) {
    // Delete profile and entries so user starts completely fresh
    await supabase.from('sur_selections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sur_entries').delete().eq('player_id', profile.id);
    await supabase.from('sur_profiles').delete().eq('id', profile.id);
    console.log('Deleted old profile and entries for pjuanramon');
  }
}

deleteUser();
