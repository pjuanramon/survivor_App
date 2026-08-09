const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectJ1() {
  console.log('--- Inspecting sur_matches Jornada 1 ---');
  const { data: matches } = await supabase
    .from('sur_matches')
    .select(`
      id,
      jornada,
      home_team:sur_teams!home_team_id(id, name),
      away_team:sur_teams!away_team_id(id, name)
    `)
    .eq('jornada', 1);

  console.log('Total J1 matches:', matches?.length);
  matches?.forEach((m, idx) => {
    console.log(`${idx + 1}. [ID: ${m.id}] ${m.home_team?.name} vs ${m.away_team?.name}`);
  });
}

inspectJ1();
