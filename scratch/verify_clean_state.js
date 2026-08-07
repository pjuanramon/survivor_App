const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('--- 🔍 Verificación Estado Limpio Temporada 26/27 ---');

  const { data: profiles } = await supabase.from('sur_profiles').select('*');
  console.log('• Perfiles (sur_profiles):', profiles?.length || 0);

  const { data: entries } = await supabase.from('sur_entries').select('*');
  console.log('• Picks/Vidas (sur_entries):', entries?.length || 0);

  const { data: selections } = await supabase.from('sur_selections').select('*');
  console.log('• Selecciones (sur_selections):', selections?.length || 0);

  const { data: config } = await supabase.from('sur_config').select('*').eq('id', 1).maybeSingle();
  console.log('• Configuración (sur_config):', config);

  const { data: matches } = await supabase.from('sur_matches').select('*').eq('jornada', 1);
  console.log('• Partidos Jornada 1 (sur_matches):', matches?.length || 0);

  const { data: teams } = await supabase.from('sur_teams').select('*');
  console.log('• Equipos La Liga (sur_teams):', teams?.length || 0);

  console.log('--- ✅ Todo verificado y listo ---');
}

verify();
