/**
 * Motor escalable de sincronización europea (football-data.org) y resolución de Jornadas
 * Soporta tanto Euro-Survivor (Doble Bala + Tarjetas Amarillas 🟨) como modo Clásico.
 *
 * Uso:
 *   node scripts/resolve_window_euro.js --sync 12     (Sincroniza cartelera/resultados con API)
 *   node scripts/resolve_window_euro.js --resolve 11  (Evalúa victorias, amarillas 🟨, rojas 🟥 y campeones)
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://haiexkgguayurvdzqqsv.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzQ5NjIsImV4cCI6MjA4OTM1MDk2Mn0.D5ARn8FX7np2YVzEILJ40f4pOsYTtQ8CAG3XkSM3s60';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_CODE_BY_SHORT_NAME = {
  laliga: 'PD',
  premier: 'PL',
  seriea: 'SA',
  bundesliga: 'BL1',
};

async function resolveJornada(jornadaNumber) {
  console.log(`\n⚡ Resolviendo Jornada/Ventana #${jornadaNumber} en todas las ligas y rondas...`);

  // 1. Obtener todos los partidos finalizados de la jornada
  const { data: matches, error: mErr } = await supabase
    .from('sur_matches')
    .select('id, home_team_id, away_team_id, home_score, away_score, status, competition_id')
    .eq('jornada', jornadaNumber);

  if (mErr || !matches || matches.length === 0) {
    console.error('❌ No hay partidos cargados para esa jornada.');
    return;
  }

  const teamResult = new Map();
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    const hOutcome =
      m.home_score > m.away_score ? 'win' : m.home_score === m.away_score ? 'draw_yellow' : 'loss_red';
    const aOutcome =
      m.away_score > m.home_score ? 'win' : m.home_score === m.away_score ? 'draw_yellow' : 'loss_red';

    teamResult.set(m.home_team_id, {
      outcome: hOutcome,
      pts: hOutcome === 'win' ? 3 : hOutcome === 'draw_yellow' ? 1 : 0,
      gf: m.home_score,
      yellow: hOutcome === 'draw_yellow' ? 1 : 0,
    });
    teamResult.set(m.away_team_id, {
      outcome: aOutcome,
      pts: aOutcome === 'win' ? 3 : aOutcome === 'draw_yellow' ? 1 : 0,
      gf: m.away_score,
      yellow: aOutcome === 'draw_yellow' ? 1 : 0,
    });
  }

  // 2. Obtener ligas y rondas activas
  const { data: leagues } = await supabase
    .from('sur_leagues')
    .select('id, name, competition:sur_competitions(short_name)');

  for (const lg of leagues || []) {
    const { data: entries } = await supabase
      .from('sur_entries')
      .select('*')
      .eq('league_id', lg.id)
      .eq('is_alive', true);

    if (!entries || entries.length === 0) continue;

    const isEuro = lg.competition?.short_name === 'euro_survivor';
    const suddenDeathActive = entries.length <= 3;

    const entryIds = entries.map((e) => e.id);
    const { data: sels } = await supabase
      .from('sur_selections')
      .select('*')
      .in('entry_id', entryIds)
      .eq('jornada', jornadaNumber);

    for (const entry of entries) {
      const mySels = (sels || []).filter((s) => s.entry_id === entry.id);
      const requiredSlots = isEuro ? ['home', 'euro'] : ['home'];

      let addedPts = 0;
      let addedGf = 0;
      let addedYellows = 0;
      let directRed = false;

      for (const reqSlot of requiredSlots) {
        const pick =
          mySels.find((s) => (s.slot || 'home') === reqSlot) ||
          (!isEuro ? mySels[0] : null);

        if (!pick) {
          directRed = true;
          continue;
        }

        const res = teamResult.get(pick.team_id);
        if (!res) continue;

        addedPts += res.pts;
        addedGf += res.gf;
        addedYellows += res.yellow;

        if (res.outcome === 'loss_red') {
          directRed = true;
        } else if (res.outcome === 'draw_yellow' && suddenDeathActive) {
          // Muerte súbita en tramo final (<=3 supervivientes)
          directRed = true;
        }
      }

      const newYellows = (entry.yellow_cards || 0) + addedYellows;
      const doubleYellowRed = newYellows >= 2;
      const stillAlive = !directRed && !doubleYellowRed;
      const reason = directRed
        ? 'loss_red'
        : doubleYellowRed
        ? 'double_yellow'
        : null;

      await supabase
        .from('sur_entries')
        .update({
          total_points: (entry.total_points || 0) + addedPts,
          total_gf: (entry.total_gf || 0) + addedGf,
          yellow_cards: newYellows,
          is_alive: stillAlive,
          ...(reason ? { elimination_reason: reason, eliminated_jornada: jornadaNumber } : {}),
        })
        .eq('id', entry.id);

      console.log(
        `  [${stillAlive ? '🟢 VIVO' : '🟥 RIP'}] ${lg.name} • ${entry.entry_name} | +${addedPts}pts +${addedGf}GF | 🟨 ${newYellows}/2`
      );
    }
  }

  console.log('\n✅ Resolución completada.');
}

async function syncFromFootballDataApi(matchdayNumber) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.log('ℹ️ Añade FOOTBALL_DATA_API_KEY en tu .env para sincronizar marcadores en vivo desde football-data.org.');
    return;
  }

  const { data: comps } = await supabase.from('sur_competitions').select('id, short_name');
  for (const comp of comps || []) {
    const code = API_CODE_BY_SHORT_NAME[comp.short_name];
    if (!code) continue;

    const url = `https://api.football-data.org/v4/competitions/${code}/matches?matchday=${matchdayNumber}`;
    const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });
    if (!res.ok) {
      console.warn(`⚠️ No se pudo sincronizar ${code}: HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    console.log(`🌍 ${comp.short_name.toUpperCase()}: recibidos ${(json.matches || []).length} partidos desde API.`);
  }
}

const args = process.argv.slice(2);
if (args[0] === '--resolve' && args[1]) {
  resolveJornada(parseInt(args[1], 10));
} else if (args[0] === '--sync' && args[1]) {
  syncFromFootballDataApi(parseInt(args[1], 10));
} else {
  console.log('Uso: node scripts/resolve_window_euro.js [--resolve <jornada> | --sync <jornada>]');
}
