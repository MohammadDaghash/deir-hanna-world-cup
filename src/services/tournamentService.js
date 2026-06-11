import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'

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
  return {
    id: row.id,
    country: row.country,
    code: row.code,
    group: row.group_code,
    color: row.color,
    secondary: row.secondary,
  }
}

function toPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    teamId: row.team_id,
    number: row.number,
    position: row.position,
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
    venue: row.venue,
    homeTeamId: row.home_team_id ?? undefined,
    awayTeamId: row.away_team_id ?? undefined,
    homeLabel: row.home_label ?? undefined,
    awayLabel: row.away_label ?? undefined,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    status: row.status,
    minute: row.minute ?? undefined,
    events: eventsByMatch[row.id] ?? [],
  }
}

function toEvent(row) {
  return {
    id: row.id,
    minute: row.minute,
    type: row.type,
    teamId: row.team_id ?? undefined,
    player: row.player,
    assist: row.assist ?? undefined,
  }
}

function emptyVotes() {
  return { home: 0, draw: 0, away: 0, userChoice: null }
}

function emptyTournamentVoteBucket() {
  return { total: 0, candidates: {}, userChoice: null }
}

function isMissingOptionalTable(error) {
  const message = error?.message?.toLowerCase() ?? ''

  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  )
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
    client.from('players').select('*').order('team_id').order('number'),
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

  return {
    teams: teamsResponse.data.map(toTeam),
    players: playersResponse.data.map(toPlayer),
    matches: allMatches.filter((match) => match.stage === 'Group'),
    knockoutMatches: allMatches.filter((match) => match.stage !== 'Group'),
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

export async function loadTournamentVotes() {
  const client = requireSupabase()
  const viewerId = getViewerId()
  const { data, error } = await client
    .from('tournament_votes')
    .select('vote_type, candidate_id, viewer_id')

  if (error) {
    if (isMissingOptionalTable(error)) {
      return {}
    }

    throwIfError(error)
  }

  return data.reduce((votes, vote) => {
    if (!votes[vote.vote_type]) {
      votes[vote.vote_type] = emptyTournamentVoteBucket()
    }

    const bucket = votes[vote.vote_type]
    bucket.total += 1
    bucket.candidates[vote.candidate_id] = (bucket.candidates[vote.candidate_id] ?? 0) + 1

    if (vote.viewer_id === viewerId) {
      bucket.userChoice = vote.candidate_id
    }

    return votes
  }, {})
}

export async function saveTeam(team) {
  const client = requireSupabase()
  const { error } = await client.from('teams').upsert({
    id: team.id,
    country: team.country,
    code: team.code,
    group_code: team.group,
    color: team.color,
    secondary: team.secondary,
  })

  throwIfError(error)
}

export async function savePlayer(player) {
  const client = requireSupabase()
  const { error } = await client.from('players').upsert({
    id: player.id,
    team_id: player.teamId,
    name: player.name,
    number: player.number,
    position: player.position,
    goals: player.goals ?? 0,
    assists: player.assists ?? 0,
    yellow_cards: player.yellowCards ?? 0,
    red_cards: player.redCards ?? 0,
  })

  throwIfError(error)
}

export async function saveMatch(match) {
  const client = requireSupabase()
  const { error } = await client.from('matches').upsert({
    id: match.id,
    stage: match.stage,
    group_code: match.stage === 'Group' ? match.group : null,
    matchday: match.matchday ?? null,
    date: match.date,
    time: match.time,
    venue: match.venue,
    home_team_id: nullIfEmpty(match.homeTeamId),
    away_team_id: nullIfEmpty(match.awayTeamId),
    home_label: nullIfEmpty(match.homeLabel),
    away_label: nullIfEmpty(match.awayLabel),
    home_score: match.homeScore ?? null,
    away_score: match.awayScore ?? null,
    status: match.status,
    minute: match.minute ?? null,
  })

  throwIfError(error)
}

export async function saveMatchEvents(matchId, events) {
  const client = requireSupabase()
  const { error: deleteError } = await client.from('match_events').delete().eq('match_id', matchId)

  throwIfError(deleteError)

  const rows = events
    .filter((event) => event.player?.trim() && Number.isFinite(Number(event.minute)))
    .map((event, index) => ({
      match_id: matchId,
      minute: Number(event.minute),
      type: event.type ?? 'goal',
      team_id: nullIfEmpty(event.teamId),
      player: event.player.trim(),
      assist: nullIfEmpty(event.assist?.trim()),
      sort_order: index,
    }))

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
  const choices = match.stage === 'Group' ? ['home', 'draw', 'away'] : ['home', 'away']

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

export async function saveTournamentVote(voteType, candidateId) {
  const client = requireSupabase()
  const { error } = await client.from('tournament_votes').upsert(
    {
      vote_type: voteType,
      candidate_id: candidateId,
      viewer_id: getViewerId(),
    },
    { onConflict: 'vote_type,viewer_id' },
  )

  if (isMissingOptionalTable(error)) {
    throw new Error('Tournament-wide voting needs the latest supabase/schema.sql migration.')
  }

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
