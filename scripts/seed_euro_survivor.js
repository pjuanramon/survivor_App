/**
 * RESET LIMPIO + SEED OFICIAL FUTVIVOR 2.0 (LAS 4 GRANDES LIGAS)
 * - Conserva intactas las cuentas de usuario (sur_profiles / auth.users).
 * - Limpia todas las selecciones, entradas, ligas antiguas y competiciones descartadas.
 * - Carga los 78 clubes exactos 2026/27 de:
 *     🇪🇸 LaLiga (20) | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League (20) | 🇮🇹 Serie A (20) | 🇩🇪 Bundesliga (18)
 * - Carga los partidos reales verificados de Jornada 1 (6-8 Nov 2026) y Jornada 2 (20-23 Nov 2026).
 * - Inaugura la primera Sala Abierta Oficial (30 jugadores máx, código EURO01).
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BIG_4_DATA = {
  laliga: {
    meta: { name: 'LaLiga 26/27', short_name: 'laliga', country: 'ES', season: '2026-27', total_jornadas: 38 },
    teams: [
      'Deportivo Alavés', 'Athletic Club', 'Atlético de Madrid', 'FC Barcelona', 'RC Celta de Vigo',
      'RC Deportivo de La Coruña', 'Elche CF', 'RCD Espanyol', 'Getafe CF', 'Levante UD',
      'Málaga CF', 'CA Osasuna', 'Racing de Santander', 'Rayo Vallecano', 'Real Betis',
      'Real Madrid', 'Real Sociedad', 'Sevilla FC', 'Valencia CF', 'Villarreal CF',
    ],
    // Ventana 1 (6-8 Nov 2026)
    j1: [
      ['Sevilla FC', 'Deportivo Alavés'],
      ['Málaga CF', 'Racing de Santander'],
      ['RCD Espanyol', 'RC Deportivo de La Coruña'],
      ['CA Osasuna', 'Athletic Club'],
      ['Valencia CF', 'Real Madrid'],
      ['Elche CF', 'Real Betis'],
      ['Real Sociedad', 'Rayo Vallecano'],
      ['RC Celta de Vigo', 'Levante UD'],
      ['Villarreal CF', 'Getafe CF'],
      ['Atlético de Madrid', 'FC Barcelona'],
    ],
    // Ventana 2 (20-23 Nov 2026)
    j2: [
      ['Athletic Club', 'RCD Espanyol'],
      ['Deportivo Alavés', 'RC Deportivo de La Coruña'],
      ['Rayo Vallecano', 'Valencia CF'],
      ['Sevilla FC', 'Real Betis'],
      ['Real Madrid', 'RC Celta de Vigo'],
      ['FC Barcelona', 'Villarreal CF'],
      ['Racing de Santander', 'Real Sociedad'],
      ['CA Osasuna', 'Málaga CF'],
      ['Getafe CF', 'Atlético de Madrid'],
      ['Levante UD', 'Elche CF'],
    ],
  },
  premier: {
    meta: { name: 'Premier League 26/27', short_name: 'premier', country: 'EN', season: '2026-27', total_jornadas: 38 },
    teams: [
      'Arsenal FC', 'Aston Villa', 'AFC Bournemouth', 'Brentford FC', 'Brighton & Hove Albion',
      'Chelsea FC', 'Coventry City', 'Crystal Palace', 'Everton FC', 'Fulham FC',
      'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool FC', 'Manchester City',
      'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland AFC', 'Tottenham Hotspur',
    ],
    // Ventana 1 (6-8 Nov 2026)
    j1: [
      ['Everton FC', 'Coventry City'],
      ['Leeds United', 'Tottenham Hotspur'],
      ['Arsenal FC', 'Hull City'],
      ['Fulham FC', 'Newcastle United'],
      ['Nottingham Forest', 'Manchester City'],
      ['Brighton & Hove Albion', 'Brentford FC'],
      ['Crystal Palace', 'Liverpool FC'],
      ['Ipswich Town', 'AFC Bournemouth'],
      ['Sunderland AFC', 'Chelsea FC'],
      ['Manchester United', 'Aston Villa'],
    ],
    // Ventana 2 (21-23 Nov 2026)
    j2: [
      ['Manchester City', 'Fulham FC'],
      ['AFC Bournemouth', 'Nottingham Forest'],
      ['Aston Villa', 'Sunderland AFC'],
      ['Chelsea FC', 'Leeds United'],
      ['Coventry City', 'Crystal Palace'],
      ['Tottenham Hotspur', 'Ipswich Town'],
      ['Newcastle United', 'Arsenal FC'],
      ['Hull City', 'Brighton & Hove Albion'],
      ['Liverpool FC', 'Manchester United'],
      ['Brentford FC', 'Everton FC'],
    ],
  },
  seriea: {
    meta: { name: 'Serie A 26/27', short_name: 'seriea', country: 'IT', season: '2026-27', total_jornadas: 38 },
    teams: [
      'AC Milan', 'ACF Fiorentina', 'AS Roma', 'Atalanta BC', 'Bologna FC',
      'Cagliari Calcio', 'Como 1907', 'Frosinone Calcio', 'Genoa CFC', 'Inter de Milán',
      'Juventus FC', 'AC Monza', 'SSC Napoli', 'Parma Calcio', 'US Sassuolo',
      'SS Lazio', 'US Lecce', 'Torino FC', 'Udinese Calcio', 'Venezia FC',
    ],
    // Ventana 1 (6-8 Nov 2026)
    j1: [
      ['Venezia FC', 'Udinese Calcio'],
      ['Torino FC', 'US Lecce'],
      ['Cagliari Calcio', 'Frosinone Calcio'],
      ['Parma Calcio', 'Bologna FC'],
      ['AS Roma', 'US Sassuolo'],
      ['SSC Napoli', 'SS Lazio'],
      ['AC Monza', 'Atalanta BC'],
      ['Genoa CFC', 'AC Milan'],
      ['Inter de Milán', 'Como 1907'],
      ['ACF Fiorentina', 'Juventus FC'],
    ],
    // Ventana 2 (21-23 Nov 2026)
    j2: [
      ['SS Lazio', 'US Lecce'],
      ['Como 1907', 'Cagliari Calcio'],
      ['Parma Calcio', 'AS Roma'],
      ['SSC Napoli', 'Torino FC'],
      ['Juventus FC', 'Venezia FC'],
      ['US Sassuolo', 'Genoa CFC'],
      ['Bologna FC', 'Udinese Calcio'],
      ['AC Milan', 'Frosinone Calcio'],
      ['Atalanta BC', 'Inter de Milán'],
      ['AC Monza', 'ACF Fiorentina'],
    ],
  },
  bundesliga: {
    meta: { name: 'Bundesliga 26/27', short_name: 'bundesliga', country: 'DE', season: '2026-27', total_jornadas: 34 },
    teams: [
      'FC Bayern München', 'Bayer 04 Leverkusen', 'Borussia Dortmund', 'RB Leipzig', 'VfB Stuttgart',
      'Eintracht Frankfurt', 'SC Freiburg', 'SV Werder Bremen', 'TSG Hoffenheim', '1. FSV Mainz 05',
      'Borussia Mönchengladbach', 'FC Augsburg', '1. FC Union Berlin', '1. FC Köln', 'Hamburger SV',
      'FC Schalke 04', 'SC Paderborn 07', 'SV Elversberg',
    ],
    // Ventana 1 (6-8 Nov 2026)
    j1: [
      ['Hamburger SV', 'Borussia Mönchengladbach'],
      ['Borussia Dortmund', 'SV Elversberg'],
      ['RB Leipzig', 'FC Augsburg'],
      ['1. FSV Mainz 05', 'FC Bayern München'],
      ['SC Paderborn 07', 'Eintracht Frankfurt'],
      ['VfB Stuttgart', 'SV Werder Bremen'],
      ['1. FC Köln', 'Bayer 04 Leverkusen'],
      ['SC Freiburg', '1. FC Union Berlin'],
      ['TSG Hoffenheim', 'FC Schalke 04'],
    ],
    // Ventana 2 (20-22 Nov 2026)
    j2: [
      ['FC Bayern München', '1. FC Köln'],
      ['Bayer 04 Leverkusen', 'SC Paderborn 07'],
      ['Eintracht Frankfurt', 'TSG Hoffenheim'],
      ['1. FC Union Berlin', 'RB Leipzig'],
      ['Borussia Mönchengladbach', 'Borussia Dortmund'],
      ['SV Elversberg', 'SC Freiburg'],
      ['FC Schalke 04', 'VfB Stuttgart'],
      ['FC Augsburg', '1. FSV Mainz 05'],
      ['SV Werder Bremen', 'Hamburger SV'],
    ],
  },
};

async function cleanAndInitializeBig4() {
  console.log('===========================================================');
  console.log('🧹 LIMPIEZA TOTAL Y ARRANQUE FUTVIVOR 2.0 (4 GRANDES LIGAS)');
  console.log('===========================================================\n');

  const NOT_NULL_UUID = '00000000-0000-0000-0000-000000000000';

  // 1. Limpiar selecciones, entradas, rondas (si existen), miembros, ligas y partidos previos
  console.log('1️⃣ Limpiando partidas estancadas, selecciones y equipos duplicados...');
  await supabase.from('sur_selections').delete().neq('id', NOT_NULL_UUID);
  await supabase.from('sur_entries').delete().neq('id', NOT_NULL_UUID);
  await supabase.from('sur_rounds').delete().neq('id', NOT_NULL_UUID);
  await supabase.from('sur_league_members').delete().neq('league_id', NOT_NULL_UUID);
  await supabase.from('sur_leagues').delete().neq('id', NOT_NULL_UUID);
  await supabase.from('sur_matches').delete().neq('id', NOT_NULL_UUID);
  await supabase.from('sur_teams').delete().neq('id', NOT_NULL_UUID);

  // Eliminar competiciones fuera de las 4 Grandes Ligas (ligamx, ligue1)
  await supabase
    .from('sur_competitions')
    .delete()
    .not('short_name', 'in', '("euro_survivor","laliga","premier","seriea","bundesliga")');

  // 2. Registrar únicamente Euro-Survivor + Las 4 Grandes Ligas
  console.log('2️⃣ Configurando Euro-Survivor y las 4 Ligas Principales...');
  const compRows = [
    {
      name: 'Euro-Survivor (4 Grandes Ligas)',
      short_name: 'euro_survivor',
      country: 'EU',
      season: '2026-27',
      total_jornadas: 38,
      is_active: true,
    },
    ...Object.values(BIG_4_DATA).map((c) => ({ ...c.meta, is_active: true })),
  ];

  const { data: comps, error: compErr } = await supabase
    .from('sur_competitions')
    .upsert(compRows, { onConflict: 'short_name' })
    .select();

  if (compErr) {
    console.error('❌ Error registrando competiciones:', compErr.message);
    return;
  }

  const compMap = {};
  comps.forEach((c) => {
    compMap[c.short_name] = c.id;
  });

  // 3. Configurar Jornada 1 activa (Cierre Viernes 6 Nov 20:00 UTC / 21:00 CET)
  const j1Deadline = '2026-11-06T20:00:00.000Z';
  for (const shortName of ['euro_survivor', 'laliga', 'premier', 'seriea', 'bundesliga']) {
    await supabase.from('sur_competition_config').upsert({
      competition_id: compMap[shortName],
      current_jornada: 1,
      picks_open: true,
      picks_deadline: j1Deadline,
    });
  }
  // Sincronizar también sur_config legado si existiera
  await supabase.from('sur_config').upsert({
    id: 1,
    current_jornada: 1,
    picks_open: true,
    picks_deadline: j1Deadline,
  });

  // 4. Insertar los 78 clubes exactos (sin duplicados) y Jornadas 1 y 2 reales
  console.log('3️⃣ Insertando los 78 clubes oficiales y carteleras reales J1 y J2...');
  for (const [shortName, payload] of Object.entries(BIG_4_DATA)) {
    const compId = compMap[shortName];
    const teamInserts = payload.teams.map((name) => ({ name, competition_id: compId }));

    const { data: insertedTeams, error: tErr } = await supabase
      .from('sur_teams')
      .insert(teamInserts)
      .select('id, name');

    if (tErr) {
      console.error(`❌ Error insertando equipos de ${shortName}:`, tErr.message);
      continue;
    }

    const idByName = new Map();
    insertedTeams.forEach((t) => idByName.set(t.name, t.id));

    const j1Rows = payload.j1.map(([home, away]) => ({
      competition_id: compId,
      jornada: 1,
      home_team_id: idByName.get(home),
      away_team_id: idByName.get(away),
      status: 'SCHEDULED',
    }));

    const j2Rows = payload.j2.map(([home, away]) => ({
      competition_id: compId,
      jornada: 2,
      home_team_id: idByName.get(home),
      away_team_id: idByName.get(away),
      status: 'SCHEDULED',
    }));

    const { error: mErr } = await supabase.from('sur_matches').insert([...j1Rows, ...j2Rows]);
    if (mErr) {
      console.error(`❌ Error insertando partidos de ${shortName}:`, mErr.message);
    } else {
      console.log(
        `   ✅ ${shortName.toUpperCase()}: ${insertedTeams.length} clubes | ${j1Rows.length} partidos J1 + ${j2Rows.length} partidos J2`
      );
    }
  }

  // 5. Inaugurar la Sala Abierta Oficial #1 (30 jugadores máx)
  const { data: adminProfile } = await supabase
    .from('sur_profiles')
    .select('id, username')
    .eq('username', 'pjuanramon')
    .maybeSingle();

  const fallbackProfile = adminProfile || (await supabase.from('sur_profiles').select('id, username').limit(1).maybeSingle()).data;

  if (fallbackProfile?.id) {
    const { data: openLeague, error: openErr } = await supabase
      .from('sur_leagues')
      .insert({
        name: 'Sala Euro-Survivor #1 (Abierta)',
        invite_code: 'EURO01',
        competition_id: compMap.euro_survivor,
        creator_id: fallbackProfile.id,
        max_players: 30,
        is_public: true,
        avatar_emoji: '🌍',
      })
      .select()
      .single();

    if (!openErr && openLeague) {
      console.log(`\n🌍 Sala Abierta inaugurada: "${openLeague.name}" (Código: EURO01, Cupo: 30)`);
    }
  }

  const { count: profilesCount } = await supabase
    .from('sur_profiles')
    .select('id', { count: 'exact', head: true });

  console.log(`👤 Perfiles de jugadores conservados intactos: ${profilesCount}`);
  console.log('\n🎉 ¡Base de datos limpia y lista para arrancar en Jornada 1 con las 4 Grandes Ligas!');
}

cleanAndInitializeBig4();
