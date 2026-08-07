const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setup() {
  console.log('--- 🚀 Insertando partidos Jornada 1 La Liga 26/27 ---');

  const { data: teams } = await supabase.from('sur_teams').select('id, name');
  const getTeamId = (query) => teams?.find(t => t.name.toLowerCase().includes(query.toLowerCase()))?.id;

  const matchesJ1 = [
    { home: 'Alavés', away: 'Getafe' },
    { home: 'Sevilla', away: 'Rayo' },
    { home: 'Racing', away: 'Villarreal' },
    { home: 'Espanyol', away: 'Levante' },
    { home: 'Celta', away: 'Osasuna' },
    { home: 'Deportivo', away: 'Elche' },
    { home: 'Atlético', away: 'Málaga' },
    { home: 'Valencia', away: 'Betis' },
    { home: 'Real Madrid', away: 'Sociedad' },
    { home: 'Barcelona', away: 'Athletic' },
  ];

  for (const m of matchesJ1) {
    const homeId = getTeamId(m.home);
    const awayId = getTeamId(m.away);
    if (homeId && awayId) {
      const { data, error } = await supabase.from('sur_matches').insert({
        jornada: 1,
        home_team_id: homeId,
        away_team_id: awayId,
      }).select();
      if (error) console.log(`  - Error insertando ${m.home} vs ${m.away}:`, error.message);
      else console.log(`  + Partido insertado: ${m.home} vs ${m.away} (ID: ${data[0].id})`);
    } else {
      console.log(`  ⚠️ No se encontró ID para: ${m.home} (${homeId}) o ${m.away} (${awayId})`);
    }
  }

  console.log('--- ✅ Partidos insertados correctamente ---');
}

setup();
