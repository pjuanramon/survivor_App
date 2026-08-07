const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://haiexkgguayurvdzqqsv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60'
);

async function inspect() {
  console.log('--- Teams ---');
  const { data: teams } = await supabase.from('sur_teams').select('*');
  console.log('Teams count:', teams?.length);
  console.log('Sample team:', teams?.[0]);

  console.log('--- Matches ---');
  const { data: matches } = await supabase.from('sur_matches').select('*').limit(2);
  console.log('Sample match:', matches?.[0]);
}

inspect();
