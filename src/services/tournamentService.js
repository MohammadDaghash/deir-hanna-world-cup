import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'
import { getTeamGroupCode, isDrawAllowedStage, isLeagueStage, tournamentFormat } from '../config/tournamentFormat.js'
import {
  buildMatchEventRowsForSave,
  normalizeMatchDisciplineEvents,
  normalizePersistedEventType,
  summarizePlayerEventStats,
} from '../utils/liveMatch.js'

const viewerStorageKey = 'deir-hanna-world-cup-viewer-id'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(supabaseConfigError)
  }

  return supabase
}

function throwIfError(error) {
  if (error) {
    throw new Error(error.message)
  }
}

function nullIfEmpty(value) {
  return value === '' || value === undefined ? null : value
}

function toTeam(row) {
  const team = {
    id: row.id,
    country: row.country_en || row.country,
    countryEn: row.country_en || row.country,
    countryHe: row.country_he || '',
    countryAr: row.country_ar || '',
    code: row.code,
    group: row.group_code,
    color: row.color,
    secondary: row.secondary,
  }

  return {
    ...team,
    group: getTeamGroupCode(team),
  }
}

function toPlayer(row) {
  return {
    id: row.id,
    name: row.name_en || row.name,
    nameEn: row.name_en || row.name,
    nameHe: row.name_he || '',
    nameAr: row.name_ar || '',
    teamId: row.team_id,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    yellowCards: row.yellow_cards ?? 0,
    redCards: row.red_cards ?? 0,
  }
}

function toMatch(row, eventsByMatch) {
  return {
    id: row.id,
    stage: row.stage,
    group: row.group_code ?? undefined,
    matchday: row.matchday ?? undefined,
    date: row.date,
    time: row.time,
    venue: tournamentFormat.fixedVenueEn,
    venueEn: tournamentFormat.fixedVenueEn,
    venueHe: tournamentFormat.fixedVenueHe,
    venueAr: tournamentFormat.fixedVenueAr,
    homeTeamId: row.home_team_id ?? undefined,
    awayTeamId: row.away_team_id ?? undefined,
    homeLabel: row.home_label ?? undefined,
    awayLabel: row.away_label ?? undefined,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    status: row.status,
    minute: row.minute ?? undefined,
    matchPhase: row.match_phase ?? undefined,
    phaseStartedAt: row.phase_started_at ?? undefined,
    pauseStartedAt: row.pause_started_at ?? undefined,
    phasePausedSeconds: row.phase_paused_seconds ?? 0,
    previousPhase: row.previous_phase ?? undefined,
    matchStartTime: row.match_start_time ?? undefined,
    matchEndTime: row.match_end_time ?? undefined,
    firstHalfStartTime: row.first_half_start_time ?? undefined,
    firstHalfEndTime: row.first_half_end_time ?? undefined,
    secondHalfStartTime: row.second_half_start_time ?? undefined,
    secondHalfEndTime: row.second_half_end_time ?? undefined,
    events: normalizeMatchDisciplineEvents(eventsByMatch[row.id] ?? []),
  }
}

function toEvent(row) {
  return {
    id: row.id,
    minute: row.minute,
    eventPhase: row.event_phase ?? undefined,
    displayMinute: row.display_minute ?? undefined,
    type: normalizePersistedEventType(row),
    teamId: row.team_id ?? undefined,
    playerId: row.player_id ?? undefined,
    player: row.player,
    assistPlayerId: row.assist_player_id ?? undefined,
    assist: row.assist ?? undefined,
  }
}

function emptyVotes() {
  return { home: 0, draw: 0, away: 0, userChoice: null }
}

export function getViewerId() {
  if (typeof window === 'undefined') {
    return '00000000-0000-4000-8000-000000000000'
  }

  const storedViewerId = window.localStorage.getItem(viewerStorageKey)

  if (storedViewerId) {
    return storedViewerId
  }

  const viewerId = crypto.randomUUID()
  window.localStorage.setItem(viewerStorageKey, viewerId)
  return viewerId
}

export async function loadTournamentData() {
  const client = requireSupabase()

  const [
    teamsResponse,
    playersResponse,
    matchesResponse,
    eventsResponse,
    lineupsResponse,
    lineupPlayersResponse,
  ] = await Promise.all([
    client.from('teams').select('*').order('sort_order').order('country'),
    client.from('players').select('*').order('team_id').order('name_en'),
    client.from('matches').select('*').order('date').order('time'),
    client.from('match_events').select('*').order('sort_order').order('minute'),
    client.from('lineups').select('*'),
    client.from('lineup_players').select('*').order('role').order('slot'),
  ])

  ;[
    teamsResponse,
    playersResponse,
    matchesResponse,
    eventsResponse,
    lineupsResponse,
    lineupPlayersResponse,
  ].forEach(({ error }) => throwIfError(error))

  const eventsByMatch = eventsResponse.data.reduce((events, eventRow) => {
    if (!events[eventRow.match_id]) {
      events[eventRow.match_id] = []
    }

    events[eventRow.match_id].push(toEvent(eventRow))
    return events
  }, {})
  const allMatches = matchesResponse.data.map((row) => toMatch(row, eventsByMatch))
  const lineupsById = Object.fromEntries(lineupsResponse.data.map((lineup) => [lineup.id, lineup]))
  const appLineups = lineupsResponse.data.reduce((lineups, lineup) => {
    if (!lineups[lineup.match_id]) {
      lineups[lineup.match_id] = {}
    }

    lineups[lineup.match_id][lineup.side] = {
      formation: lineup.formation,
      starters: [],
      bench: [],
    }

    return lineups
  }, {})

  lineupPlayersResponse.data.forEach((lineupPlayer) => {
    const lineup = lineupsById[lineupPlayer.lineup_id]

    if (!lineup || !appLineups[lineup.match_id]?.[lineup.side]) {
      return
    }

    const target = lineupPlayer.role === 'starter' ? 'starters' : 'bench'
    appLineups[lineup.match_id][lineup.side][target].push(lineupPlayer.player_id)
  })

  const players = playersResponse.data.map(toPlayer)

  return {
    teams: teamsResponse.data.map(toTeam),
    players: summarizePlayerEventStats(players, allMatches),
    matches: allMatches.filter((match) => isLeagueStage(match.stage)),
    knockoutMatches: allMatches.filter((match) => !isLeagueStage(match.stage)),
    lineups: appLineups,
  }
}

export async function loadVotes() {
  const client = requireSupabase()
  const viewerId = getViewerId()
  const { data, error } = await client.from('match_votes').select('match_id, viewer_id, choice')

  throwIfError(error)

  return data.reduce((votes, vote) => {
    if (!votes[vote.match_id]) {
      votes[vote.match_id] = emptyVotes()
    }

    votes[vote.match_id][vote.choice] += 1

    if (vote.viewer_id === viewerId) {
      votes[vote.match_id].userChoice = vote.choice
    }

    return votes
  }, {})
}

export async function saveTeam(team) {
  const client = requireSupabase()
  const { error } = await client.from('teams').upsert({
    id: team.id,
    country: team.countryEn || team.country,
    country_en: team.countryEn || team.country,
    country_he: team.countryHe || '',
    country_ar: team.countryAr || '',
    code: team.code,
    group_code: getTeamGroupCode(team),
    color: team.color,
    secondary: team.secondary,
  })

  throwIfError(error)
}

export async function deleteTeam(teamId) {
  const client = requireSupabase()
  const { error } = await client.from('teams').delete().eq('id', teamId)

  throwIfError(error)
}

export async function savePlayer(player) {
  const client = requireSupabase()
  const { error } = await client.from('players').upsert({
    id: player.id,
    team_id: player.teamId,
    name: player.nameEn || player.name,
    name_en: player.nameEn || player.name,
    name_he: player.nameHe || '',
    name_ar: player.nameAr || '',
  })

  throwIfError(error)
}

export async function deletePlayer(playerId) {
  const client = requireSupabase()
  const { error } = await client.from('players').delete().eq('id', playerId)

  throwIfError(error)
}

export async function saveMatch(match) {
  const client = requireSupabase()
  const { error } = await client.from('matches').upsert({
    id: match.id,
    stage: match.stage,
    group_code: isLeagueStage(match.stage) ? match.group : null,
    matchday: match.matchday ?? null,
    date: match.date,
    time: match.time,
    venue: tournamentFormat.fixedVenueEn,
    venue_en: tournamentFormat.fixedVenueEn,
    venue_he: tournamentFormat.fixedVenueHe,
    venue_ar: tournamentFormat.fixedVenueAr,
    home_team_id: nullIfEmpty(match.homeTeamId),
    away_team_id: nullIfEmpty(match.awayTeamId),
    home_label: nullIfEmpty(match.homeLabel),
    away_label: nullIfEmpty(match.awayLabel),
    home_score: match.homeScore ?? null,
    away_score: match.awayScore ?? null,
    status: match.status,
    minute: match.minute ?? null,
    match_phase: match.matchPhase ?? null,
    phase_started_at: match.phaseStartedAt ?? null,
    pause_started_at: match.pauseStartedAt ?? null,
    phase_paused_seconds: match.phasePausedSeconds ?? 0,
    previous_phase: match.previousPhase ?? null,
    match_start_time: match.matchStartTime ?? null,
    match_end_time: match.matchEndTime ?? null,
    first_half_start_time: match.firstHalfStartTime ?? null,
    first_half_end_time: match.firstHalfEndTime ?? null,
    second_half_start_time: match.secondHalfStartTime ?? null,
    second_half_end_time: match.secondHalfEndTime ?? null,
  })

  throwIfError(error)
}

export async function deleteMatch(matchId) {
  const client = requireSupabase()
  const { error } = await client.from('matches').delete().eq('id', matchId)

  throwIfError(error)
}

export async function saveMatchEvents(matchId, events) {
  const client = requireSupabase()
  const { error: deleteError } = await client.from('match_events').delete().eq('match_id', matchId)

  throwIfError(deleteError)

  const rows = buildMatchEventRowsForSave(matchId, events)

  if (!rows.length) {
    return
  }

  const { error } = await client.from('match_events').insert(rows)
  throwIfError(error)
}

export async function saveLineup(matchId, side, lineup) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('lineups')
    .upsert(
      {
        match_id: matchId,
        side,
        formation: lineup.formation,
      },
      { onConflict: 'match_id,side' },
    )
    .select('id')
    .single()

  throwIfError(error)

  const { error: deletePlayersError } = await client
    .from('lineup_players')
    .delete()
    .eq('lineup_id', data.id)

  throwIfError(deletePlayersError)

  const rows = [
    ...lineup.starters.map((playerId, index) => ({
      lineup_id: data.id,
      player_id: playerId,
      role: 'starter',
      slot: index,
    })),
    ...lineup.bench.map((playerId, index) => ({
      lineup_id: data.id,
      player_id: playerId,
      role: 'bench',
      slot: index,
    })),
  ]

  if (!rows.length) {
    return
  }

  const { error: insertPlayersError } = await client.from('lineup_players').insert(rows)
  throwIfError(insertPlayersError)
}

export async function deleteLineups(matchId) {
  const client = requireSupabase()
  const { error } = await client.from('lineups').delete().eq('match_id', matchId)

  throwIfError(error)
}

export async function saveVote(match, choice) {
  const client = requireSupabase()
  const choices = isDrawAllowedStage(match.stage) ? ['home', 'draw', 'away'] : ['home', 'away']

  if (!choices.includes(choice)) {
    throw new Error('This vote choice is not valid for this match.')
  }

  const { error } = await client.from('match_votes').upsert(
    {
      match_id: match.id,
      viewer_id: getViewerId(),
      choice,
    },
    { onConflict: 'match_id,viewer_id' },
  )

  throwIfError(error)
}

export async function getCurrentSession() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()

  throwIfError(error)
  return data.session
}

export function onAuthSessionChange(callback) {
  const client = requireSupabase()
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session))

  return () => data.subscription.unsubscribe()
}

export async function signInAdmin(email) {
  const client = requireSupabase()
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })

  throwIfError(error)
}

export async function signOutAdmin() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()

  throwIfError(error)
}

export async function inviteAdmin(email) {
  const client = requireSupabase()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Admin email is required.')
  }

  const { error } = await client
    .from('admin_users')
    .upsert(
      { email: normalizedEmail },
      { ignoreDuplicates: true, onConflict: 'email' },
    )

  throwIfError(error)
  return normalizedEmail
}

export async function loadAdminAccess(session) {
  if (!session?.user?.email) {
    return false
  }

  const client = requireSupabase()
  const { data, error } = await client
    .from('admin_users')
    .select('email')
    .eq('email', session.user.email)
    .maybeSingle()

  throwIfError(error)
  return Boolean(data)
}
