const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deletePick3() {
  const pick3Id = 'fb3c80a4-dbca-4606-868b-030f24f5a75d'; // Pick 3 of poncho.faure
  console.log('Deleting Pick 3 of poncho.faure (ID:', pick3Id, ')...');

  // 1. Delete selections for this pick if any
  const { error: errSel } = await supabase.from('sur_selections').delete().eq('entry_id', pick3Id);
  if (errSel) console.log('Selections delete notice:', errSel.message);

  // 2. Delete entry
  const { data, error: errEnt } = await supabase.from('sur_entries').delete().eq('id', pick3Id).select();
  if (errEnt) {
    console.log('Error deleting Pick 3:', errEnt.message);
  } else {
    console.log('✅ Pick 3 for poncho.faure deleted successfully:', data);
  }
}

deletePick3();
