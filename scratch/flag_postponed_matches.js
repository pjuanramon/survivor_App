const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function flagMatches() {
  console.log('--- Checking sur_matches ---');
  const { data: matches } = await supabase
    .from('sur_matches')
    .select(`
      id,
      jornada,
      home_team:sur_teams!home_team_id(name),
      away_team:sur_teams!away_team_id(name)
    `)
    .eq('jornada', 1);

  console.log('Matches J1 count:', matches?.length);
  matches?.forEach(m => {
    console.log(`- ${m.home_team.name} vs ${m.away_team.name} (ID: ${m.id})`);
  });
}

flagMatches();
