const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMatch() {
  console.log('--- Fixing Match #6 (Deportivo La Coruña vs Elche CF) ---');

  // 1. Get exact team ID for RC Deportivo de La Coruña
  const { data: teams } = await supabase.from('sur_teams').select('id, name');
  const depor = teams?.find(t => t.name.includes('Deportivo de La Coruña') || t.name === 'RC Deportivo de La Coruña');
  console.log('RC Deportivo de La Coruña team object:', depor);

  if (depor) {
    // 2. Update match e09ffbbd-3101-4a67-b4c4-7a383439dba7
    const { data, error } = await supabase
      .from('sur_matches')
      .update({ home_team_id: depor.id })
      .eq('id', 'e09ffbbd-3101-4a67-b4c4-7a383439dba7')
      .select(`
        id,
        jornada,
        home_team:sur_teams!home_team_id(id, name),
        away_team:sur_teams!away_team_id(id, name)
      `);

    if (error) console.log('Error updating match:', error.message);
    else console.log('Match updated successfully:', data[0]);
  } else {
    console.log('⚠️ Could not find RC Deportivo de La Coruña in sur_teams');
  }
}

fixMatch();
