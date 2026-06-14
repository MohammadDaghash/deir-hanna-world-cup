import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Expand,
  Goal,
  LockKeyhole,
  Medal,
  PencilLine,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Share2,
  Smartphone,
  Star,
  Table2,
  Timer,
  Trophy,
  UserRound,
  Users,
  X,
  Search,
} from 'lucide-react'
import './App.css'
import {
  isSupabaseConfigured,
  supabaseConfigError,
} from './lib/supabase'
import {
  deleteLineups,
  getCurrentSession,
  loadAdminAccess,
  loadTournamentData,
  loadTournamentVotes,
  loadVotes,
  onAuthSessionChange,
  saveLineup,
  saveMatch,
  saveMatchEvents,
  savePlayer,
  saveTeam,
  saveTournamentVote,
  saveVote,
  signInAdmin,
  signOutAdmin,
} from './services/tournamentService'
import {
  calculateStandings,
  getLeaderboards,
  getMatchTeam,
  getPlayersById,
  getPlayersByTeam,
  getTournamentStats,
  getUpcomingMatches,
  isScoredMatch,
  resolveLineup,
} from './utils/tournament'
import {
  isDrawAllowedStage,
  isLeagueStage,
  knockoutStageFilters,
  roundFilterOptions,
  stageLabels,
  stageOptions,
  tournamentFormat,
} from './config/tournamentFormat'

const navItems = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'matches', label: 'Matches', icon: CalendarDays },
  { id: 'tables', label: 'Standings', icon: Table2 },
  { id: 'knockout', label: 'Knockout', icon: Trophy },
  { id: 'leaders', label: 'Stats', icon: Medal },
  { id: 'admin', label: 'Admin', icon: Settings },
]

const statIcons = [Users, ClipboardList, Goal, Timer]
const maxSquadPlayers = 10
const starterCount = 7
const statusOptions = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Live', value: 'live' },
  { label: 'Final', value: 'final' },
]
const positionOptions = [
  { label: 'GK', value: 'GK' },
  { label: 'DF', value: 'DF' },
  { label: 'MF', value: 'MF' },
  { label: 'FW', value: 'FW' },
  { label: 'WG', value: 'WG' },
]
const emptyTournamentData = {
  teams: [],
  players: [],
  matches: [],
  knockoutMatches: [],
  lineups: {},
}
const matchFilterModes = [
  { id: 'date', label: 'By date' },
  { id: 'round', label: 'By round' },
  { id: 'team', label: 'By team' },
]
const detailTabs = ['Details', 'Lineups', 'Standings', 'Matches']
const teamPageTabs = ['Matches', 'Standings', 'Players', 'Statistics']
function parseHashRoute() {
  if (typeof window === 'undefined') {
    return { type: 'main' }
  }

  const hash = window.location.hash.replace(/^#\/?/, '')
  const [type, id] = hash.split('/')

  if (['match', 'team', 'player'].includes(type) && id) {
    return { type, id: decodeURIComponent(id) }
  }

  return { type: 'main' }
}

function setHashRoute(type, id) {
  if (typeof window === 'undefined') {
    return
  }

  window.location.hash = `#/${type}/${encodeURIComponent(id)}`
}

function clearHashRoute() {
  if (typeof window === 'undefined') {
    return
  }

  window.history.pushState('', document.title, window.location.pathname + window.location.search)
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function makeUniqueId(prefix, label, existingIds) {
  const base = slugify(label) || prefix
  let id = `${prefix}-${base}`
  let index = 2

  while (existingIds.has(id)) {
    id = `${prefix}-${base}-${index}`
    index += 1
  }

  return id
}

function makeLineupForTeam(teamId, players) {
  const playerIds = players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => a.number - b.number)
    .map((player) => player.id)

  return {
    formation: '3-3-1',
    starters: playerIds.slice(0, starterCount),
    bench: playerIds.slice(starterCount, maxSquadPlayers),
  }
}

function normalizeScore(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  return Number(value)
}

function compareMatchDate(a, b) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatTournamentYear(matches) {
  const firstMatch = [...matches].sort(compareMatchDate)[0]
  return firstMatch?.date ? new Date(`${firstMatch.date}T12:00:00`).getFullYear() : 2026
}

function getCurrentStage(matches) {
  const live = matches.find((match) => match.status === 'live')
  if (live) return isLeagueStage(live.stage) ? 'League stage' : getMatchRoundLabel(live)

  const upcoming = getUpcomingMatches(matches)[0]
  if (upcoming) return isLeagueStage(upcoming.stage) ? 'League stage' : getMatchRoundLabel(upcoming)

  return 'Completed'
}

function getMatchRoundLabel(match) {
  if (isLeagueStage(match.stage)) {
    return `Round ${match.matchday ?? 1}`
  }

  return stageLabels[match.stage] ?? match.stage
}

function getMatchCompetitionLabel(match) {
  if (isLeagueStage(match.stage)) {
    return `Deir Hanna World Cup, ${tournamentFormat.tableLabel}`
  }

  return `Deir Hanna World Cup, ${getMatchRoundLabel(match)}`
}

function matchBelongsToRound(match, roundId) {
  if (roundId.startsWith('league-')) {
    return isLeagueStage(match.stage) && Number(match.matchday ?? 1) === Number(roundId.replace('league-', ''))
  }

  return match.stage === roundId
}

function getRoundOptionLabel(roundId) {
  return roundFilterOptions.find((round) => round.id === roundId)?.label ?? roundId
}

function groupMatches(matches, getGroup) {
  const grouped = matches.reduce((sections, match) => {
    const key = getGroup(match)
    if (!sections[key]) {
      sections[key] = []
    }

    sections[key].push(match)
    return sections
  }, {})

  return Object.entries(grouped).map(([title, sectionMatches]) => ({
    title,
    matches: sectionMatches.sort(compareMatchDate),
  }))
}

function getTeamMatches(allMatches, teamId) {
  return allMatches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .sort(compareMatchDate)
}

function getTeamStandingRow(standings, teamId) {
  return Object.values(standings)
    .flat()
    .find((row) => row.team.id === teamId)
}

function getTeamRecord(allMatches, teamId) {
  return getTeamMatches(allMatches, teamId)
    .filter(isScoredMatch)
    .reduce(
      (record, match) => {
        const isHome = match.homeTeamId === teamId
        const ownGoals = isHome ? match.homeScore : match.awayScore
        const againstGoals = isHome ? match.awayScore : match.homeScore

        record.played += 1
        record.goalsFor += ownGoals
        record.goalsAgainst += againstGoals

        if (ownGoals > againstGoals) record.wins += 1
        else if (ownGoals < againstGoals) record.losses += 1
        else record.draws += 1

        return record
      },
      { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    )
}

function getTeamForm(allMatches, teamId) {
  return getTeamMatches(allMatches, teamId)
    .filter(isScoredMatch)
    .slice(-5)
    .map((match) => {
      const isHome = match.homeTeamId === teamId
      const ownGoals = isHome ? match.homeScore : match.awayScore
      const againstGoals = isHome ? match.awayScore : match.homeScore

      if (ownGoals > againstGoals) return 'W'
      if (ownGoals < againstGoals) return 'L'
      return 'D'
    })
}

function getPlayerTeam(player, teams) {
  return teams.find((team) => team.id === player?.teamId)
}

function getPlayerContributions(player, allMatches) {
  return allMatches
    .flatMap((match) =>
      (match.events ?? [])
        .filter((event) => event.player === player.name || event.assist === player.name)
        .map((event) => ({
          ...event,
          match,
          contribution: event.player === player.name ? 'Goal' : 'Assist',
        })),
    )
    .sort((a, b) => `${b.match.date} ${b.minute}`.localeCompare(`${a.match.date} ${a.minute}`))
}

function getVotePercent(count, total) {
  return total ? Math.round((count / total) * 100) : 0
}

function getCandidateVoteData(tournamentVotes, voteType, candidateId) {
  const bucket = tournamentVotes[voteType] ?? { total: 0, candidates: {}, userChoice: null }
  const votes = bucket.candidates?.[candidateId] ?? 0

  return {
    active: bucket.userChoice === candidateId,
    percent: getVotePercent(votes, bucket.total),
    total: bucket.total,
    votes,
  }
}

function App() {
  const [tournamentData, setTournamentData] = useState(emptyTournamentData)
  const [votes, setVotes] = useState({})
  const [tournamentVotes, setTournamentVotes] = useState({})
  const [route, setRoute] = useState(() => parseHashRoute())
  const [activeView, setActiveView] = useState('overview')
  const [session, setSession] = useState(null)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appError, setAppError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const { teams, players, matches, knockoutMatches, lineups } = tournamentData
  const allMatches = useMemo(
    () => [...matches, ...knockoutMatches],
    [knockoutMatches, matches],
  )

  const standings = useMemo(() => calculateStandings(teams, matches), [matches, teams])
  const leaderboards = useMemo(() => getLeaderboards(players, teams), [players, teams])
  const playersById = useMemo(() => getPlayersById(players), [players])
  const playersByTeam = useMemo(() => getPlayersByTeam(players), [players])
  const stats = useMemo(
    () => getTournamentStats(allMatches, teams, players),
    [allMatches, players, teams],
  )
  const upcomingMatches = useMemo(
    () => getUpcomingMatches(allMatches),
    [allMatches],
  )
  const liveMatch = allMatches.find((match) => match.status === 'live') ?? allMatches[0]
  const latestResults = useMemo(
    () =>
      allMatches
        .filter((match) => match.status === 'final')
        .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
        .slice(0, 3),
    [allMatches],
  )

  const reloadTournament = useCallback(async ({ silent = false } = {}) => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setAppError(supabaseConfigError)
      return
    }

    if (!silent) {
      setLoading(true)
    }

    try {
      const [nextTournamentData, nextVotes, nextTournamentVotes] = await Promise.all([
        loadTournamentData(),
        loadVotes(),
        loadTournamentVotes(),
      ])

      setTournamentData(nextTournamentData)
      setVotes(nextVotes)
      setTournamentVotes(nextTournamentVotes)
      setAppError('')
    } catch (error) {
      setAppError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadInitialTournament() {
      await reloadTournament()
    }

    loadInitialTournament()
  }, [reloadTournament])

  useEffect(() => {
    function handleHashChange() {
      setRoute(parseHashRoute())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }

    let mounted = true

    getCurrentSession()
      .then((currentSession) => {
        if (mounted) {
          setSession(currentSession)
        }
      })
      .catch((error) => setAppError(error.message))

    const unsubscribe = onAuthSessionChange((nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    loadAdminAccess(session)
      .then(setAdminUnlocked)
      .catch((error) => {
        setAdminUnlocked(false)
        setAppError(error.message)
      })
  }, [session])

  async function runMutation(action) {
    setAppError('')

    try {
      await action()
      await reloadTournament({ silent: true })
    } catch (error) {
      setAppError(error.message)
      throw error
    }
  }

  async function handleVote(matchId, choice) {
    const match = allMatches.find((item) => item.id === matchId)

    if (!match) {
      setAppError('Match not found.')
      return
    }

    await runMutation(async () => {
      await saveVote(match, choice)
    })
  }

  async function handleTournamentVote(voteType, candidateId) {
    await runMutation(async () => {
      await saveTournamentVote(voteType, candidateId)
    })
  }

  function handleViewSelect(viewId) {
    clearHashRoute()
    setRoute({ type: 'main' })
    setActiveView(viewId)
  }

  function openMatch(matchId) {
    setHashRoute('match', matchId)
  }

  function openTeam(teamId) {
    setHashRoute('team', teamId)
  }

  function openPlayer(playerId) {
    setHashRoute('player', playerId)
  }

  async function handleAddTeam(teamDraft) {
    const id = makeUniqueId(
      'team',
      teamDraft.code || teamDraft.country,
      new Set(teams.map((team) => team.id)),
    )

    await runMutation(async () => {
      await saveTeam({
        id,
        country: teamDraft.country.trim(),
        code: teamDraft.code.trim().toUpperCase(),
        group: tournamentFormat.tableKey,
        color: teamDraft.color,
        secondary: teamDraft.secondary,
      })
    })
  }

  async function handleAddPlayer(playerDraft) {
    const teamPlayerCount = players.filter(
      (player) => player.teamId === playerDraft.teamId,
    ).length

    if (teamPlayerCount >= maxSquadPlayers) {
      return
    }

    const id = makeUniqueId(
      'p',
      `${playerDraft.teamId}-${playerDraft.name}`,
      new Set(players.map((player) => player.id)),
    )
    const player = {
      id,
      name: playerDraft.name.trim(),
      teamId: playerDraft.teamId,
      number: Number(playerDraft.number),
      position: playerDraft.position,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    }
    const nextPlayers = [...players, player]
    const affectedMatches = allMatches.filter(
      (match) =>
        match.homeTeamId === playerDraft.teamId || match.awayTeamId === playerDraft.teamId,
    )

    await runMutation(async () => {
      await savePlayer(player)

      await Promise.all(
        affectedMatches.flatMap((match) => {
          const updates = []

          if (match.homeTeamId === playerDraft.teamId) {
            updates.push(saveLineup(match.id, 'home', makeLineupForTeam(playerDraft.teamId, nextPlayers)))
          }

          if (match.awayTeamId === playerDraft.teamId) {
            updates.push(saveLineup(match.id, 'away', makeLineupForTeam(playerDraft.teamId, nextPlayers)))
          }

          return updates
        }),
      )
    })
  }

  function normalizeMatchDraft(matchDraft) {
    return {
      ...matchDraft,
      group: isLeagueStage(matchDraft.stage) ? tournamentFormat.tableKey : undefined,
      matchday: Number(matchDraft.matchday),
      homeTeamId: matchDraft.homeTeamId || undefined,
      awayTeamId: matchDraft.awayTeamId || undefined,
      homeScore: normalizeScore(matchDraft.homeScore),
      awayScore: normalizeScore(matchDraft.awayScore),
      minute: matchDraft.minute === '' ? undefined : Number(matchDraft.minute),
      events: (matchDraft.events ?? []).map((event) => ({
        ...event,
        minute: Number(event.minute),
        type: event.type ?? 'goal',
      })),
    }
  }

  async function saveMatchAndLineups(match) {
    await saveMatch(match)
    await saveMatchEvents(match.id, match.events ?? [])

    if (match.homeTeamId && match.awayTeamId) {
      await Promise.all([
        saveLineup(match.id, 'home', makeLineupForTeam(match.homeTeamId, players)),
        saveLineup(match.id, 'away', makeLineupForTeam(match.awayTeamId, players)),
      ])
    } else {
      await deleteLineups(match.id)
    }
  }

  async function handleSaveMatch(matchDraft) {
    const match = normalizeMatchDraft(matchDraft)

    await runMutation(async () => {
      await saveMatchAndLineups(match)
    })
  }

  async function handleAddMatch(matchDraft) {
    const id = makeUniqueId(
      'match',
      `${matchDraft.homeTeamId}-${matchDraft.awayTeamId}-${matchDraft.date}`,
      new Set(allMatches.map((match) => match.id)),
    )
    const match = normalizeMatchDraft({
      ...matchDraft,
      id,
      venue: matchDraft.venue.trim(),
      events: [],
    })

    await runMutation(async () => {
      await saveMatchAndLineups(match)
    })
  }

  async function handleSignIn(email) {
    setAppError('')
    setAuthNotice('')

    try {
      await signInAdmin(email)
      setAuthNotice('Check your email for the Supabase login link.')
    } catch (error) {
      setAppError(error.message)
    }
  }

  async function handleSignOut() {
    setAppError('')

    try {
      await signOutAdmin()
      setAdminUnlocked(false)
      setAuthNotice('')
    } catch (error) {
      setAppError(error.message)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <SetupState
        detail="Create .env.local from .env.example and add VITE_SUPABASE_URL plus VITE_SUPABASE_ANON_KEY."
        title="Supabase is not configured"
      />
    )
  }

  if (loading) {
    return <LoadingState />
  }

  if (appError && (!teams.length || !allMatches.length)) {
    return <SetupState detail={appError} title="Could not load tournament data" />
  }

  if (!teams.length || !allMatches.length) {
    return (
      <SetupState
        detail="Run supabase/schema.sql in Supabase, generate seed SQL with npm run seed:sql, then run that output in the Supabase SQL editor."
        title="No tournament data found"
      />
    )
  }

  const routeMatch = route.type === 'match'
    ? allMatches.find((match) => match.id === route.id)
    : null
  const routeTeam = route.type === 'team'
    ? teams.find((team) => team.id === route.id)
    : null
  const routePlayer = route.type === 'player'
    ? playersById[route.id]
    : null
  const isDetailRoute = route.type !== 'main'

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#14201b]">
      <Header activeView={activeView} onViewSelect={handleViewSelect} />

      {!isDetailRoute && activeView !== 'admin' && (
        <TournamentHeader
          allMatches={allMatches}
          liveMatch={liveMatch}
          stats={stats}
          teams={teams}
        />
      )}

      <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        {appError && <ErrorBanner message={appError} onDismiss={() => setAppError('')} />}
        {route.type === 'match' && routeMatch && (
          <MatchCenterPage
            allMatches={allMatches}
            lineups={lineups}
            match={routeMatch}
            onBack={() => handleViewSelect('matches')}
            onTeamSelect={openTeam}
            onVote={handleVote}
            playersById={playersById}
            standings={standings}
            teams={teams}
            votes={votes}
          />
        )}
        {route.type === 'team' && routeTeam && (
          <TeamPage
            allMatches={allMatches}
            onBack={() => handleViewSelect('teams')}
            onMatchSelect={openMatch}
            onPlayerSelect={openPlayer}
            players={playersByTeam[routeTeam.id] ?? []}
            standings={standings}
            team={routeTeam}
            teams={teams}
          />
        )}
        {route.type === 'player' && routePlayer && (
          <PlayerPage
            allMatches={allMatches}
            onBack={() => handleViewSelect('leaders')}
            onMatchSelect={openMatch}
            onTeamSelect={openTeam}
            player={routePlayer}
            teams={teams}
          />
        )}
        {isDetailRoute && !routeMatch && !routeTeam && !routePlayer && (
          <NotFoundPanel onBack={() => handleViewSelect('overview')} />
        )}
        {!isDetailRoute && activeView === 'overview' && (
          <Overview
            allMatches={allMatches}
            knockoutMatches={knockoutMatches}
            leaderboards={leaderboards}
            latestResults={latestResults}
            lineups={lineups}
            liveMatch={liveMatch}
            onMatchSelect={openMatch}
            onPlayerSelect={openPlayer}
            onTeamSelect={openTeam}
            onTournamentVote={handleTournamentVote}
            onVote={handleVote}
            playersById={playersById}
            standings={standings}
            stats={stats}
            teams={teams}
            tournamentVotes={tournamentVotes}
            upcomingMatches={upcomingMatches}
            votes={votes}
          />
        )}
        {!isDetailRoute && activeView === 'teams' && (
          <TeamsBoard
            onTeamSelect={openTeam}
            playersByTeam={playersByTeam}
            teams={teams}
          />
        )}
        {!isDetailRoute && activeView === 'matches' && (
          <MatchesBoard
            lineups={lineups}
            matches={allMatches}
            onMatchSelect={openMatch}
            onVote={handleVote}
            playersById={playersById}
            teams={teams}
            votes={votes}
          />
        )}
        {!isDetailRoute && activeView === 'tables' && (
          <TablesBoard standings={standings} />
        )}
        {!isDetailRoute && activeView === 'knockout' && (
          <KnockoutBoard matches={knockoutMatches} onMatchSelect={openMatch} teams={teams} />
        )}
        {!isDetailRoute && activeView === 'leaders' && (
          <LeadersBoard leaderboards={leaderboards} onPlayerSelect={openPlayer} />
        )}
        {!isDetailRoute && activeView === 'admin' && (
          <AdminBoard
            adminEmail={session?.user?.email}
            adminUnlocked={adminUnlocked}
            allMatches={allMatches}
            authNotice={authNotice}
            onAddMatch={handleAddMatch}
            onAddPlayer={handleAddPlayer}
            onAddTeam={handleAddTeam}
            onSaveMatch={handleSaveMatch}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            players={players}
            teams={teams}
          />
        )}
      </section>
    </main>
  )
}

function Header({ activeView, onViewSelect }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#dce1d7] bg-[#f6f7f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#163428] text-white shadow-sm">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#14201b]">
              Deir Hanna World Cup
            </p>
            <p className="truncate text-xs text-[#65756b]">Local tournament dashboard</p>
          </div>
        </div>
        <nav className="scrollbar-none -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:pb-0" aria-label="Main views">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-[#14201b] shadow-sm after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-[#163428]'
                    : 'text-[#65756b] hover:bg-white hover:text-[#14201b]'
                }`}
                onClick={() => onViewSelect(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function TournamentHeader({ allMatches, liveMatch, stats, teams }) {
  const year = formatTournamentYear(allMatches)
  const currentStage = getCurrentStage(allMatches)
  const nextMatch = getUpcomingMatches(allMatches)[0]
  const matchCount = allMatches.length

  return (
    <section className="border-b border-[#10261d] bg-[#10261d] text-white">
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)] lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/10 text-[#ffdb70] shadow-sm">
            <Trophy className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#cfe7d8]">Deir Hanna World Cup</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold leading-none sm:text-3xl">{year}</h1>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#cfe7d8]">
                {currentStage}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#cfe7d8]">
              <span>{teams.length} teams</span>
              <span>1 league table</span>
              <span>{matchCount} matches</span>
              <span>Top {tournamentFormat.qualifyingTeams} advance</span>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          {nextMatch && (
            <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-[#cfe7d8]">Next match</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {formatLongDate(nextMatch.date)} / {nextMatch.time}
              </p>
            </div>
          )}
          <StatsStrip stats={stats} />
          {liveMatch && <LiveMatch match={liveMatch} teams={teams} />}
        </div>
      </div>
    </section>
  )
}

function StatsStrip({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-white/10 px-2 py-2 text-center">
          <p className="text-base font-semibold leading-none text-white">{stat.value}</p>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase text-[#cfe7d8]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function NotFoundPanel({ onBack }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold text-[#14201b]">Page not found</h1>
      <p className="mt-2 text-sm text-[#65756b]">
        This tournament page could not be found. It may have been removed or the link may be old.
      </p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tournament
      </button>
    </section>
  )
}

function SetupState({ detail, title }) {
  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-10 text-[#14201b]">
      <section className="mx-auto max-w-2xl rounded-lg border border-[#dce1d7] bg-white p-6 shadow-sm">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#eef3e9] text-[#1f6d4d]">
          <Settings className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#65756b]">{detail}</p>
        <div className="mt-5 rounded-md bg-[#f8faf5] p-4 text-sm text-[#34433a]">
          Required setup: create the Supabase project, run `supabase/schema.sql`, add your
          admin email to `admin_users`, then seed the database.
        </div>
      </section>
    </main>
  )
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f2] px-4 text-[#14201b]">
      <section className="rounded-lg border border-[#dce1d7] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#eef3e9] text-[#1f6d4d]">
          <Timer className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold">Loading tournament data</h1>
        <p className="mt-2 text-sm text-[#65756b]">Connecting to Supabase.</p>
      </section>
    </main>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#e4b4b4] bg-[#fff7f7] p-4 text-sm text-[#7b2b2b] sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        className="rounded-md border border-[#e4b4b4] bg-white px-3 py-1.5 text-xs font-semibold"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  )
}

function Overview({
  allMatches,
  knockoutMatches,
  leaderboards,
  latestResults,
  lineups,
  liveMatch,
  onMatchSelect,
  onPlayerSelect,
  onTeamSelect,
  onTournamentVote,
  onVote,
  playersById,
  standings,
  stats,
  teams,
  tournamentVotes,
  upcomingMatches,
  votes,
}) {
  return (
    <div className="grid min-w-0 gap-6">
      <ViewerFocus
        latestResults={latestResults}
        lineups={lineups}
        liveMatch={liveMatch}
        onMatchSelect={onMatchSelect}
        onVote={onVote}
        playersById={playersById}
        standings={standings}
        teams={teams}
        upcomingMatches={upcomingMatches}
        votes={votes}
      />
      <StatsGrid stats={stats} />
      <TournamentPredictionsPanel
        leaderboards={leaderboards}
        onVote={onTournamentVote}
        teams={teams}
        tournamentVotes={tournamentVotes}
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
        <GroupSnapshot onTeamSelect={onTeamSelect} standings={standings} />
        <TopContributors
          onPlayerSelect={onPlayerSelect}
          players={leaderboards.contributions.slice(0, 5)}
        />
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
        <UpcomingPanel
          matches={upcomingMatches.slice(0, 6)}
          onMatchSelect={onMatchSelect}
          onVote={onVote}
          teams={teams}
          votes={votes}
        />
        <MatchTimeline match={liveMatch} teams={teams} />
      </div>
      <KnockoutPanel matches={knockoutMatches} teams={teams} />
      <InsightsPanel allMatches={allMatches} leaderboards={leaderboards} teams={teams} />
    </div>
  )
}

function ViewerFocus({
  latestResults,
  lineups,
  liveMatch,
  onMatchSelect,
  onVote,
  playersById,
  standings,
  teams,
  upcomingMatches,
  votes,
}) {
  const [openResultId, setOpenResultId] = useState(latestResults[0]?.id ?? null)
  const focusMatch = liveMatch?.status === 'live' ? liveMatch : upcomingMatches[0]

  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader
          icon={focusMatch?.status === 'live' ? Timer : CalendarDays}
          title={focusMatch?.status === 'live' ? 'Live Now' : 'Next Match'}
          detail={focusMatch ? `${formatDate(focusMatch.date)} / ${focusMatch.time}` : 'Schedule'}
        />
        <div className="border-t border-[#e5e9e0] p-4">
          {focusMatch ? (
            <FocusMatchCard
              match={focusMatch}
              onMatchSelect={onMatchSelect}
              onVote={onVote}
              teams={teams}
              votes={votes}
            />
          ) : (
            <EmptyState text="No match scheduled yet." />
          )}
        </div>
      </div>
      <div className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Trophy} title="Qualification Race" detail={`Top ${tournamentFormat.qualifyingTeams}`} />
        <div className="grid gap-2 border-t border-[#e5e9e0] p-4">
          <QualificationRow rows={standings[tournamentFormat.tableKey] ?? []} />
        </div>
      </div>
      <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm lg:col-span-2">
        <PanelHeader icon={Clock} title="Latest Results" detail="Completed games" />
        <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
          {latestResults.length ? (
            latestResults.map((match) => {
              const matchOpen = openResultId === match.id

              return (
                <div key={match.id}>
                  <MatchRow
                    expanded
                    match={match}
                    matchOpen={matchOpen}
                    onMatchSelect={onMatchSelect}
                    onToggleDetails={() =>
                      setOpenResultId((currentId) =>
                        currentId === match.id ? null : match.id,
                      )
                    }
                    teams={teams}
                  />
                  {matchOpen && (
                    <MatchDetailsPanel
                      lineups={lineups}
                      match={match}
                      playersById={playersById}
                      teams={teams}
                    />
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-4">
              <EmptyState text="No completed games yet." />
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

function FocusMatchCard({ match, onMatchSelect, onVote, teams, votes }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const goals = (match.events ?? []).filter((event) => event.type === 'goal').length

  return (
    <div className="grid gap-4">
      <button
        type="button"
        className="grid gap-3 rounded-lg bg-[#f8faf5] p-4 text-left transition hover:bg-[#eef3e9] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
        onClick={() => onMatchSelect?.(match.id)}
      >
        <TeamBlock team={home} align="right" />
        <ScoreCell match={match} />
        <TeamBlock team={away} />
      </button>
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetric label="Venue" value={match.venue} />
        <AdminMetric label="Status" value={match.status} />
        <AdminMetric label="Goals" value={goals} />
      </div>
      {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
        <PredictionVote
          match={match}
          onVote={onVote}
          teams={teams}
          votes={votes}
        />
      )}
    </div>
  )
}

function TournamentPredictionsPanel({ leaderboards, onVote, teams, tournamentVotes }) {
  const topPlayers = leaderboards.contributions.slice(0, 5)

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Star} title="Community Predictions" detail="Tournament picks" />
      <div className="grid gap-4 border-t border-[#e5e9e0] p-4 lg:grid-cols-3">
        <TournamentVoteCard
          candidates={teams}
          getLabel={(team) => team.country}
          getMeta={() => tournamentFormat.tableLabel}
          getVisual={(team) => <FlagMark team={team} small />}
          onVote={onVote}
          title="Tournament winner"
          tournamentVotes={tournamentVotes}
          voteType="tournament_winner"
        />
        <TournamentVoteCard
          candidates={leaderboards.goals.slice(0, 5)}
          getLabel={(player) => player.name}
          getMeta={(player) => `${player.goals} goals / ${player.team?.country ?? 'Team'}`}
          getVisual={(player) => <PlayerAvatar player={player} small />}
          onVote={onVote}
          title="Top scorer"
          tournamentVotes={tournamentVotes}
          voteType="top_scorer"
        />
        <TournamentVoteCard
          candidates={topPlayers}
          getLabel={(player) => player.name}
          getMeta={(player) => `${player.contributions} G+A / ${player.team?.country ?? 'Team'}`}
          getVisual={(player) => <PlayerAvatar player={player} small />}
          onVote={onVote}
          title="Best player"
          tournamentVotes={tournamentVotes}
          voteType="best_player"
        />
      </div>
    </section>
  )
}

function TournamentVoteCard({
  candidates,
  getLabel,
  getMeta,
  getVisual,
  onVote,
  title,
  tournamentVotes,
  voteType,
}) {
  const bucket = tournamentVotes[voteType] ?? { total: 0, candidates: {}, userChoice: null }

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-[#fbfdf9] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#14201b]">{title}</h3>
          <p className="text-xs text-[#65756b]">
            {bucket.total ? `${bucket.total} vote${bucket.total === 1 ? '' : 's'}` : 'No votes yet'}
          </p>
        </div>
        <TrendingVoteBadge bucket={bucket} />
      </div>
      <div className="grid gap-2">
        {candidates.slice(0, 6).map((candidate) => {
          const vote = getCandidateVoteData(tournamentVotes, voteType, candidate.id)

          return (
            <button
              key={`${voteType}-${candidate.id}`}
              type="button"
              className={`relative min-h-14 overflow-hidden rounded-md border bg-white px-3 text-left transition ${
                vote.active
                  ? 'border-[#17633f] ring-2 ring-[#b8dcc7]'
                  : 'border-[#dce1d7] hover:border-[#9cb4a5]'
              }`}
              onClick={() => onVote?.(voteType, candidate.id)}
            >
              <span
                className="absolute inset-y-0 left-0 bg-[#dff1e6]"
                style={{ width: `${vote.percent}%` }}
                aria-hidden="true"
              />
              <span className="relative z-10 grid min-w-0 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3">
                {getVisual(candidate)}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#14201b]">
                    {getLabel(candidate)}
                  </span>
                  <span className="block truncate text-xs text-[#65756b]">
                    {getMeta(candidate)}
                  </span>
                </span>
                <span className="text-xs font-semibold text-[#17633f]">
                  {vote.percent}%
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TrendingVoteBadge({ bucket }) {
  const entries = Object.entries(bucket.candidates ?? {}).sort((a, b) => b[1] - a[1])
  const top = entries[0]

  return (
    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#65756b]">
      {top ? `${getVotePercent(top[1], bucket.total)}% top` : 'Open'}
    </span>
  )
}

function InsightsPanel({ allMatches, leaderboards, teams }) {
  const nextMatch = getUpcomingMatches(allMatches)[0]
  const scoredMatches = allMatches.filter(isScoredMatch)

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={BarChart3} title="Tournament Insights" detail="Live context" />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetric label="Current stage" value={getCurrentStage(allMatches)} />
        <AdminMetric
          label="Next kickoff"
          value={nextMatch ? `${formatDate(nextMatch.date)} / ${nextMatch.time}` : 'No upcoming'}
        />
        <AdminMetric label="Completed" value={`${scoredMatches.length}/${allMatches.length}`} />
        <AdminMetric
          label="Top scorer"
          value={leaderboards.goals[0] ? `${leaderboards.goals[0].name} (${leaderboards.goals[0].goals})` : 'None'}
        />
        <AdminMetric label="Teams" value={teams.length} />
        <AdminMetric label="Table" value={tournamentFormat.tableLabel} />
        <AdminMetric
          label="Goals"
          value={scoredMatches.reduce((total, match) => total + match.homeScore + match.awayScore, 0)}
        />
        <AdminMetric label="Format" value={`Top ${tournamentFormat.qualifyingTeams} qualify`} />
      </div>
    </section>
  )
}

function QualificationRow({ rows }) {
  const leaders = rows.slice(0, tournamentFormat.qualifyingTeams)

  return (
    <div className="grid min-h-12 grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold uppercase text-[#65756b]">Top 4</span>
      <div className="flex min-w-0 flex-wrap gap-2">
        {leaders.map((row) => (
          <span
            key={row.team.id}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md bg-white px-2 text-xs font-semibold text-[#34433a]"
          >
            <FlagMark team={row.team} small />
            <span className="truncate">{row.team.code}</span>
            <span>{row.points} pts</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function TeamsBoard({ onTeamSelect, playersByTeam, teams }) {
  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title="Teams & Squads" icon={Users}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          {teams.length} teams
        </span>
      </Toolbar>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            players={playersByTeam[team.id] ?? []}
            onClick={() => onTeamSelect?.(team.id)}
            team={team}
          />
        ))}
      </div>
    </div>
  )
}

function TeamCard({ onClick, team, players }) {
  return (
    <button
      type="button"
      aria-label={`Open ${team.country} team page`}
      className="min-w-0 overflow-hidden rounded-lg border border-[#dce1d7] bg-white text-left shadow-sm transition hover:border-[#9cb4a5] hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <FlagMark team={team} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#14201b]">{team.country}</h2>
            <p className="truncate text-xs text-[#65756b]">
              {tournamentFormat.tableLabel} / {players.length} players
            </p>
          </div>
        </div>
        <span className="rounded-md bg-[#eef3e9] px-2.5 py-1 text-xs font-semibold text-[#34433a]">
          {team.code}
        </span>
      </div>
      <div className="grid grid-cols-3 border-t border-[#e5e9e0] bg-[#fbfdf9]">
        <TeamCardMetric label="Starters" value={Math.min(players.length, starterCount)} />
        <TeamCardMetric
          label="Bench"
          value={Math.max(0, Math.min(players.length - starterCount, 3))}
        />
        <TeamCardMetric label="Max" value={maxSquadPlayers} />
      </div>
    </button>
  )
}

function TeamCardMetric({ label, value }) {
  return (
    <div className="border-r border-[#e5e9e0] px-3 py-3 last:border-r-0">
      <p className="text-[11px] font-semibold uppercase text-[#65756b] sm:text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#14201b]">{value}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd5c6] bg-[#fbfdf9] p-4 text-sm text-[#65756b]">
      {text}
    </div>
  )
}

function EventDetailRow({ event, teams }) {
  const team = teams.find((item) => item.id === event.teamId)
  const primaryText =
    event.contribution === 'Goal'
      ? `Goal: ${event.player}`
      : `Assist: ${event.assist}`
  const secondaryText =
    event.contribution === 'Goal'
      ? `Assist: ${event.assist ?? 'Unassisted'}`
      : `Goal: ${event.player}`

  return (
    <div className="grid min-h-12 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold text-[#65756b]">{event.minute}'</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#14201b]">{primaryText}</p>
        <p className="truncate text-xs text-[#65756b]">
          {secondaryText} / {event.match.stage}
        </p>
      </div>
      {team && <FlagMark team={team} small />}
    </div>
  )
}

function StatsGrid({ stats }) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = statIcons[index] ?? BarChart3

        return (
          <div
            key={stat.label}
            className="min-w-0 rounded-lg border border-[#dce1d7] bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#65756b]">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#14201b]">{stat.value}</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef3e9] text-[#1f6d4d]">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LiveMatch({ match, teams }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const label =
    match.status === 'live'
      ? 'Live match'
      : match.status === 'scheduled'
        ? 'Next match'
        : 'Featured match'
  const detail = match.status === 'live' && match.minute
    ? `${match.venue} / ${match.minute}'`
    : `${formatDate(match.date)} / ${match.time}`

  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white text-[#14201b] shadow-md">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#e5e9e0] px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
          <p className="mt-1 truncate text-sm text-[#34433a]">
            {detail}
          </p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="grid gap-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <TeamBlock team={home} align="right" />
        <div className="min-w-24 rounded-lg bg-[#14201b] px-4 py-3 text-center text-white">
          <p className="text-3xl font-semibold leading-none">
            {isScoredMatch(match) ? `${match.homeScore}-${match.awayScore}` : match.time}
          </p>
          <p className="mt-1 text-xs text-[#cfe7d8]">
            {match.status === 'live' ? 'Now' : match.status === 'scheduled' ? 'Kickoff' : 'Final'}
          </p>
        </div>
        <TeamBlock team={away} />
      </div>
    </div>
  )
}

function TeamBlock({ team, align = 'left' }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${
        align === 'right' ? 'justify-end text-right' : ''
      }`}
    >
      {align === 'right' && <TeamName team={team} />}
      <FlagMark team={team} />
      {align !== 'right' && <TeamName team={team} />}
    </div>
  )
}

function TeamName({ team }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[#14201b]">{team.country}</p>
      <p className="text-xs text-[#65756b]">{team.code}</p>
    </div>
  )
}

function FlagMark({ team, small = false }) {
  return (
    <span
      className={`flag-mark ${small ? 'flag-mark-small' : ''}`}
      style={{ '--flag-a': team.color, '--flag-b': team.secondary }}
      aria-hidden="true"
    >
      {team.code}
    </span>
  )
}

function StatusPill({ status }) {
  const styles = {
    live: 'bg-[#bd1f36] text-white',
    final: 'bg-[#e8ede3] text-[#34433a]',
    scheduled: 'bg-[#fff2cc] text-[#6f5200]',
  }

  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold uppercase ${
        styles[status] ?? styles.scheduled
      }`}
    >
      {status}
    </span>
  )
}

function GroupSnapshot({ onTeamSelect, standings }) {
  const tableRows = standings[tournamentFormat.tableKey] ?? []

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Table2} title="League Table" detail={`Top ${tournamentFormat.qualifyingTeams} advance`} />
      <div className="border-t border-[#e5e9e0] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{tournamentFormat.tableLabel}</h2>
          <span className="text-xs font-semibold text-[#65756b]">P / GD / PTS</span>
        </div>
        <div className="grid gap-2">
          {tableRows.slice(0, tournamentFormat.qualifyingTeams).map((row) => (
            <CompactStandingRow
              key={row.team.id}
              onTeamSelect={onTeamSelect}
              row={row}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function CompactStandingRow({ onTeamSelect, row }) {
  return (
    <button
      type="button"
      className="grid min-h-12 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-[#f8faf5] px-3 text-left transition hover:bg-[#eef3e9] sm:gap-3"
      onClick={() => onTeamSelect?.(row.team.id)}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
          row.qualified ? 'bg-[#dff1e6] text-[#17633f]' : 'bg-[#ecefe8] text-[#65756b]'
        }`}
      >
        {row.rank}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <FlagMark team={row.team} small />
        <span className="truncate text-sm font-medium">{row.team.country}</span>
      </div>
      <span className="text-xs font-semibold text-[#34433a]">
        {row.played} / {row.goalDifference > 0 ? '+' : ''}
        {row.goalDifference} / {row.points}
      </span>
    </button>
  )
}

function TopContributors({ onPlayerSelect, players }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Medal} title="Goal Contributions" detail="Goals + assists" />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {players.length ? (
          players.map((player, index) => (
            <PlayerStatRow
              key={player.id}
              onPlayerSelect={onPlayerSelect}
              player={player}
              index={index}
              value={player.contributions}
              label={`${player.goals} G / ${player.assists} A`}
            />
          ))
        ) : (
          <div className="p-4">
            <EmptyState text="No player contributions recorded yet." />
          </div>
        )}
      </div>
    </section>
  )
}

function UpcomingPanel({ matches, onMatchSelect, onVote, teams, votes }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={CalendarDays} title="Upcoming Matches" detail="Schedule" />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {matches.length ? (
          matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              onMatchSelect={onMatchSelect}
              onVote={onVote}
              teams={teams}
              votes={votes}
            />
          ))
        ) : (
          <div className="p-4">
            <EmptyState text="No upcoming matches scheduled." />
          </div>
        )}
      </div>
    </section>
  )
}

function MatchTimeline({ match, teams }) {
  const events = match?.events ?? []
  const detail = match?.status === 'live' && match.minute ? `${match.minute}'` : 'Updates'

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Clock} title="Match Timeline" detail={detail} />
      <div className="grid min-w-0 gap-3 border-t border-[#e5e9e0] p-4">
        {events.length ? (
          events.map((event) => {
            const team = teams.find((item) => item.id === event.teamId)

            return (
              <div key={`${event.minute}-${event.player}`} className="timeline-event">
                <span className="timeline-dot"></span>
                <span className="w-10 text-xs font-semibold text-[#65756b]">{event.minute}'</span>
                <FlagMark team={team} small />
                <span className="min-w-0 truncate text-sm font-medium">{event.player}</span>
                <span className="text-xs uppercase text-[#65756b]">{event.type}</span>
              </div>
            )
          })
        ) : (
          <EmptyState text="No match events recorded yet." />
        )}
      </div>
    </section>
  )
}

function MatchesBoard({ matches, onMatchSelect, onVote, teams, votes }) {
  const [mode, setMode] = useState('date')
  const [selectedRound, setSelectedRound] = useState('league-1')
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '')
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]
  const sortedMatches = useMemo(() => [...matches].sort(compareMatchDate), [matches])

  const sections = useMemo(() => {
    if (mode === 'round') {
      return groupMatches(
        sortedMatches.filter((match) => matchBelongsToRound(match, selectedRound)),
        () => getRoundOptionLabel(selectedRound),
      )
    }

    if (mode === 'team' && selectedTeam) {
      return groupMatches(
        sortedMatches.filter(
          (match) =>
            match.homeTeamId === selectedTeam.id || match.awayTeamId === selectedTeam.id,
        ),
        getMatchRoundLabel,
      )
    }

    return groupMatches(sortedMatches, (match) => formatLongDate(match.date))
  }, [mode, selectedRound, selectedTeam, sortedMatches])

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title="Matches" icon={CalendarDays}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          {matches.length} fixtures
        </span>
      </Toolbar>
      <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-[#10261d] shadow-sm">
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3">
          {matchFilterModes.map((item) => (
            <FilterChip
              active={mode === item.id}
              key={item.id}
              label={item.label}
              onClick={() => setMode(item.id)}
            />
          ))}
        </div>
        <div className="grid gap-3 border-b border-white/10 px-3 py-3">
          {mode === 'round' && (
            <FilterSelect
              label="Select round"
              onChange={setSelectedRound}
              options={roundFilterOptions.map((round) => ({
                label: round.label,
                value: round.id,
              }))}
              value={selectedRound}
            />
          )}
          {mode === 'team' && (
            <TeamSearchSelector
              onChange={setSelectedTeamId}
              selectedTeamId={selectedTeam?.id}
              teams={teams}
            />
          )}
        </div>
        <MatchSectionList
          onMatchSelect={onMatchSelect}
          onVote={onVote}
          sections={sections}
          teams={teams}
          votes={votes}
        />
      </section>
    </div>
  )
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
        active ? 'bg-white text-[#14201b]' : 'bg-black/25 text-white hover:bg-white/15'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function FilterSelect({ label, onChange, options, value }) {
  return (
    <label className="relative grid max-w-xs gap-1 text-xs font-semibold uppercase text-[#9fb5aa]">
      {label}
      <select
        className="min-h-12 w-full appearance-none rounded-lg border border-white/15 bg-black/20 px-3 pr-10 text-sm font-semibold normal-case text-white outline-none focus:border-white/40"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 text-white" />
    </label>
  )
}

function TeamSearchSelector({ onChange, selectedTeamId, teams }) {
  const [query, setQuery] = useState('')
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]
  const normalizedQuery = query.trim().toLowerCase()
  const visibleTeams = teams.filter((team) =>
    [team.country, team.code].join(' ').toLowerCase().includes(normalizedQuery),
  )

  return (
    <div className="grid gap-2 rounded-lg bg-black/20 p-3">
      <label className="relative grid gap-1 text-xs font-semibold uppercase text-[#9fb5aa]">
        Select team
        <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-[#9fb5aa]" />
        <input
          className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0b1813] pl-10 pr-3 text-sm font-semibold normal-case text-white outline-none focus:border-white/40"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedTeam ? selectedTeam.country : 'Search teams'}
          value={query}
        />
      </label>
      {selectedTeam && !query && (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white">
          <FlagMark team={selectedTeam} small />
          <span className="truncate text-sm font-semibold">{selectedTeam.country}</span>
        </div>
      )}
      <div className="grid max-h-56 gap-1 overflow-y-auto">
        {(query ? visibleTeams : teams).map((team) => (
          <button
            key={team.id}
            type="button"
            className={`grid min-h-11 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${
              selectedTeamId === team.id ? 'bg-white text-[#14201b]' : 'bg-white/10 text-white'
            }`}
            onClick={() => {
              onChange(team.id)
              setQuery('')
            }}
          >
            <FlagMark team={team} small />
            <span className="truncate">{team.country}</span>
            <span className="text-xs opacity-70">{team.code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MatchSectionList({ onMatchSelect, onVote, sections, teams, votes }) {
  if (!sections.length) {
    return (
      <div className="p-4">
        <EmptyState text="No matches found for this filter." />
      </div>
    )
  }

  return (
    <div className="grid gap-3 bg-[#07100d] p-3">
      {sections.map((section) => (
        <section
          key={section.title}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#111f19]"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">{section.title}</h3>
          </div>
          <div className="divide-y divide-white/10">
            {section.matches.map((match) => (
              <div key={match.id} className="bg-white">
                <MatchRow
                  match={match}
                  onMatchSelect={onMatchSelect}
                  onVote={onVote}
                  teams={teams}
                  votes={votes}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MatchRow({
  match,
  expanded = false,
  matchOpen = false,
  onMatchSelect,
  onVote,
  onToggleDetails,
  teams,
  votes,
}) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const goalCount = (match.events ?? []).filter((event) => event.type === 'goal').length
  const matchLabel = `Open match ${home.country} vs ${away.country}, ${getMatchRoundLabel(match)}`
  const clickableProps = expanded || onMatchSelect
    ? {
        'aria-label': matchLabel,
        role: 'button',
        tabIndex: 0,
        onClick: () => {
          if (onMatchSelect) {
            onMatchSelect(match.id)
          } else {
            onToggleDetails?.()
          }
        },
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (onMatchSelect) {
              onMatchSelect(match.id)
            } else {
              onToggleDetails?.()
            }
          }
        },
      }
    : {}

  return (
    <article
      className={`min-w-0 ${expanded || onMatchSelect ? 'cursor-pointer transition hover:bg-[#fbfdf9]' : ''}`}
      {...clickableProps}
    >
      <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:px-4">
        <div className="min-w-0 text-center sm:text-left">
          <p className="truncate text-xs font-semibold text-[#65756b]">
            {formatDate(match.date)}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14201b]">{match.time}</p>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase text-[#65756b]">
            {getMatchRoundLabel(match)}
          </p>
        </div>
        <div className="grid min-w-0 gap-1 border-l border-[#dce1d7] pl-3">
          <p className="mb-1 truncate text-xs font-semibold text-[#65756b]">
            {getMatchCompetitionLabel(match)}
          </p>
          <MatchTeamLine team={home} />
          <MatchTeamLine team={away} />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <ScoreCell match={match} />
          <StatusPill status={match.status} />
          {goalCount > 0 && (
            <span className="hidden min-h-7 items-center rounded-md bg-[#eef3e9] px-2.5 text-xs font-semibold text-[#34433a] sm:inline-flex">
              {goalCount} goals
            </span>
          )}
          {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
            <div className="hidden sm:block">
              <VoteSummaryPill match={match} votes={votes} />
            </div>
          )}
          {expanded && (
            <button
              type="button"
              className={`hidden min-h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold sm:inline-flex ${
                matchOpen
                  ? 'border-[#163428] bg-[#163428] text-white'
                  : 'border-[#d4dace] bg-[#fbfdf9] text-[#34433a]'
              }`}
              onClick={(event) => {
                event.stopPropagation()
                onToggleDetails?.()
              }}
              aria-expanded={matchOpen}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Details
            </button>
          )}
          {match.status === 'scheduled' && (
            <Bell className="h-4 w-4 text-[#7b61ff]" aria-label="Reminder" />
          )}
        </div>
      </div>
      {!expanded && match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
        <div className="px-4 pb-4">
          <PredictionVote
            compact
            match={match}
            onVote={onVote}
            teams={teams}
            votes={votes}
          />
        </div>
      )}
    </article>
  )
}

function getVoteBreakdown(votes, match) {
  const matchVotes = votes?.[match.id] ?? { home: 0, draw: 0, away: 0, userChoice: null }
  const hasDraw = isDrawAllowedStage(match.stage)
  const homeVotes = matchVotes.home ?? 0
  const drawVotes = hasDraw ? matchVotes.draw ?? 0 : 0
  const awayVotes = matchVotes.away ?? 0
  const totalVotes = homeVotes + drawVotes + awayVotes
  const homePercent = totalVotes ? Math.round((homeVotes / totalVotes) * 100) : 0
  const drawPercent = hasDraw && totalVotes ? Math.round((drawVotes / totalVotes) * 100) : 0
  const awayPercent = totalVotes ? 100 - homePercent - drawPercent : 0

  return {
    awayPercent,
    awayVotes,
    drawPercent,
    drawVotes,
    hasDraw,
    homePercent,
    homeVotes,
    totalVotes,
    userChoice: matchVotes.userChoice ?? null,
  }
}

function VoteSummaryPill({ match, votes }) {
  const breakdown = getVoteBreakdown(votes, match)
  const summary = breakdown.hasDraw
    ? `${breakdown.homePercent}% - ${breakdown.drawPercent}% - ${breakdown.awayPercent}%`
    : `${breakdown.homePercent}% - ${breakdown.awayPercent}%`

  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-[#e7f3ec] px-2.5 text-xs font-semibold text-[#17633f]">
      {breakdown.totalVotes ? summary : 'Vote'}
    </span>
  )
}

function PredictionVote({ compact = false, match, onVote, teams, votes }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const breakdown = getVoteBreakdown(votes, match)
  const summary = breakdown.hasDraw
    ? `${breakdown.homePercent}% - ${breakdown.drawPercent}% - ${breakdown.awayPercent}%`
    : `${breakdown.homePercent}% - ${breakdown.awayPercent}%`

  return (
    <section
      className={`min-w-0 rounded-lg border border-[#dce1d7] bg-white ${
        compact ? 'p-3' : 'p-4'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#14201b]">Who will win?</h3>
          {breakdown.hasDraw && (
            <p className="text-xs font-medium text-[#34433a]">Draw is available for league games</p>
          )}
          <p className="text-xs text-[#65756b]">
            {breakdown.totalVotes
              ? `${breakdown.totalVotes} vote${breakdown.totalVotes === 1 ? '' : 's'}`
              : 'Be first to vote'}
          </p>
        </div>
        {breakdown.totalVotes > 0 && (
          <span className="rounded-md bg-[#eef3e9] px-2.5 py-1 text-xs font-semibold text-[#34433a]">
            {summary}
          </span>
        )}
      </div>
      <div
        className={`grid min-w-0 gap-2 ${
          breakdown.hasDraw
            ? 'sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]'
            : 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
        } sm:items-center`}
      >
        <VoteTeamButton
          active={breakdown.userChoice === 'home'}
          onClick={() => onVote?.(match.id, 'home')}
          percent={breakdown.homePercent}
          team={home}
          votes={breakdown.homeVotes}
        />
        {breakdown.hasDraw ? (
          <VoteDrawButton
            active={breakdown.userChoice === 'draw'}
            onClick={() => onVote?.(match.id, 'draw')}
            percent={breakdown.drawPercent}
            votes={breakdown.drawVotes}
          />
        ) : (
          <span className="hidden text-center text-xs font-semibold uppercase text-[#65756b] sm:block">
            vs
          </span>
        )}
        <VoteTeamButton
          active={breakdown.userChoice === 'away'}
          align="right"
          onClick={() => onVote?.(match.id, 'away')}
          percent={breakdown.awayPercent}
          team={away}
          votes={breakdown.awayVotes}
        />
      </div>
    </section>
  )
}

function VoteDrawButton({ active, onClick, percent, votes }) {
  return (
    <button
      type="button"
      className={`relative min-h-16 min-w-0 overflow-hidden rounded-lg border px-3 py-3 text-center transition ${
        active
          ? 'border-[#17633f] bg-[#f2fbf5]'
          : 'border-[#dce1d7] bg-[#fbfdf9] hover:border-[#9cb4a5]'
      }`}
      onClick={onClick}
    >
      <span
        className="absolute inset-x-0 bottom-0 bg-[#dff1e6] transition-all"
        style={{ height: `${percent}%` }}
        aria-hidden="true"
      />
      <span className="relative z-10 block text-sm font-semibold text-[#14201b]">Draw</span>
      <span className="relative z-10 block text-xs text-[#65756b]">
        {percent}% / {votes} votes
      </span>
    </button>
  )
}

function VoteTeamButton({ active, align = 'left', onClick, percent, team, votes }) {
  return (
    <button
      type="button"
      className={`relative min-h-16 min-w-0 overflow-hidden rounded-lg border px-3 py-3 text-left transition ${
        active
          ? 'border-[#17633f] bg-[#f2fbf5]'
          : 'border-[#dce1d7] bg-[#fbfdf9] hover:border-[#9cb4a5]'
      }`}
      onClick={onClick}
    >
      <span
        className={`absolute inset-y-0 ${
          align === 'right' ? 'right-0' : 'left-0'
        } bg-[#dff1e6] transition-all`}
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      />
      <span
        className={`relative z-10 flex min-w-0 items-center gap-3 ${
          align === 'right' ? 'justify-end text-right' : ''
        }`}
      >
        {align === 'right' && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#14201b]">
              {team.country}
            </span>
            <span className="block text-xs text-[#65756b]">
              {percent}% / {votes} votes
            </span>
          </span>
        )}
        <FlagMark team={team} small />
        {align !== 'right' && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#14201b]">
              {team.country}
            </span>
            <span className="block text-xs text-[#65756b]">
              {percent}% / {votes} votes
            </span>
          </span>
        )}
      </span>
    </button>
  )
}

function MatchDetailsPanel({ lineups, match, onVote, playersById, teams, votes }) {
  return (
    <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] bg-[#fbfdf9] px-3 py-4 sm:px-4">
      {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
        <PredictionVote match={match} onVote={onVote} teams={teams} votes={votes} />
      )}
      <ScoringSummary match={match} teams={teams} />
      <LineupsPanel lineups={lineups} match={match} playersById={playersById} teams={teams} />
    </div>
  )
}

function ScoringSummary({ match, teams }) {
  const scoringEvents = (match.events ?? []).filter((event) => event.type === 'goal')

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#14201b]">Scorers & Assists</h3>
          <p className="text-xs text-[#65756b]">
            {formatDate(match.date)} / {match.time}
          </p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="grid gap-2 p-4">
        {scoringEvents.length ? (
          scoringEvents.map((event) => (
            <GoalEventRow key={`${match.id}-${event.minute}-${event.player}`} event={event} teams={teams} />
          ))
        ) : (
          <EmptyState text="No scorer or assist details recorded for this match yet." />
        )}
      </div>
    </section>
  )
}

function GoalEventRow({ event, teams }) {
  const team = teams.find((item) => item.id === event.teamId)

  return (
    <div className="grid min-h-12 grid-cols-[42px_30px_minmax(0,1fr)] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold text-[#65756b]">{event.minute}'</span>
      {team && <FlagMark team={team} small />}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#14201b]">{event.player}</p>
        <p className="truncate text-xs text-[#65756b]">
          Assist: {event.assist ?? 'Unassisted'}
        </p>
      </div>
    </div>
  )
}

function LineupsPanel({ lineups, match, playersById, teams }) {
  const matchLineups = lineups[match.id]
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')

  if (!matchLineups) {
    return (
      <div>
        <div className="rounded-lg border border-dashed border-[#cbd5c6] bg-white p-4 text-sm text-[#65756b]">
          Lineups will appear when both teams are confirmed.
        </div>
      </div>
    )
  }

  const homeLineup = resolveLineup(matchLineups.home, playersById)
  const awayLineup = resolveLineup(matchLineups.away, playersById)

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <LineupTeamColumn lineup={homeLineup} side="home" team={home} />
      <LineupTeamColumn lineup={awayLineup} side="away" team={away} />
    </div>
  )
}

function LineupTeamColumn({ team, lineup, side }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FlagMark team={team} small />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[#14201b]">{team.country}</h3>
            <p className="truncate text-xs text-[#65756b]">
              {side === 'home' ? 'Home' : 'Away'} / {lineup.formation}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-[#eef3e9] px-2 py-1 text-xs font-semibold text-[#34433a]">
          VII
        </span>
      </div>
      <div className="grid gap-3 p-4">
        <LineupList title="Starting Seven" players={lineup.starters} />
        <LineupList title="Bench" players={lineup.bench} />
      </div>
    </section>
  )
}

function LineupList({ title, players }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase text-[#65756b]">{title}</h4>
        <span className="text-xs font-semibold text-[#65756b]">{players.length}</span>
      </div>
      <ol className="grid gap-2">
        {players.map((player) => (
          <LineupPlayerRow key={player.id} player={player} />
        ))}
      </ol>
    </div>
  )
}

function LineupPlayerRow({ player }) {
  return (
    <li className="grid min-h-10 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-[#f8faf5] px-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-xs font-semibold text-[#34433a]">
        {player.number}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[#14201b]">{player.name}</span>
      <span className="rounded-md bg-[#eef3e9] px-2 py-1 text-xs font-semibold text-[#65756b]">
        {player.position}
      </span>
    </li>
  )
}

function MatchTeamLine({ team }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <FlagMark team={team} small />
      <span className="min-w-0 truncate text-sm font-semibold text-[#14201b]">
        {team.country}
      </span>
    </div>
  )
}

function ScoreCell({ match }) {
  if (isScoredMatch(match)) {
    return (
      <div className="grid min-h-10 min-w-16 place-items-center rounded-md bg-[#14201b] px-3 text-sm font-semibold text-white">
        {match.homeScore}-{match.awayScore}
      </div>
    )
  }

  return (
    <div className="grid min-h-10 min-w-16 place-items-center rounded-md bg-[#eef3e9] px-3 text-xs font-semibold text-[#65756b]">
      {match.time}
    </div>
  )
}

function TablesBoard({ standings }) {
  const selectedRows = standings[tournamentFormat.tableKey] ?? []

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title="League Table" icon={Table2}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          Top {tournamentFormat.qualifyingTeams} qualify
        </span>
      </Toolbar>
      <QualificationRules />
      <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Table2} title={tournamentFormat.tableLabel} detail={`Top ${tournamentFormat.qualifyingTeams} advance`} />
        <div className="overflow-x-auto border-t border-[#e5e9e0]">
          <table className="w-full min-w-[560px] border-collapse text-xs sm:min-w-[680px] sm:text-sm">
            <thead className="bg-[#f3f7f0] text-[10px] uppercase text-[#65756b] sm:text-xs">
              <tr>
                <th className="w-10 px-2 py-2 text-center font-semibold sm:w-12">#</th>
                <th className="min-w-36 px-2 py-2 text-left font-semibold sm:px-3">Team</th>
                <th className="px-2 py-2 text-center font-semibold">P</th>
                <th className="px-2 py-2 text-center font-semibold">W</th>
                <th className="px-2 py-2 text-center font-semibold">D</th>
                <th className="px-2 py-2 text-center font-semibold">L</th>
                <th className="px-2 py-2 text-center font-semibold">GF:GA</th>
                <th className="px-2 py-2 text-center font-semibold">GD</th>
                <th className="px-2 py-2 text-center font-semibold sm:px-3">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9e0]">
              {selectedRows.map((row) => (
                <tr
                  key={row.team.id}
                  className={row.qualified ? 'bg-[#f3fbf6]' : 'bg-white'}
                >
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`mx-auto grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
                        row.qualified
                          ? 'bg-[#dff1e6] text-[#17633f]'
                          : 'bg-[#ecefe8] text-[#65756b]'
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FlagMark team={row.team} small />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#14201b]">{row.team.country}</p>
                        <p className="truncate text-[10px] text-[#65756b] sm:text-xs">{row.team.code}</p>
                      </div>
                    </div>
                  </td>
                  <StatCell value={row.played} />
                  <StatCell value={row.won} />
                  <StatCell value={row.drawn} />
                  <StatCell value={row.lost} />
                  <StatCell value={`${row.goalsFor}:${row.goalsAgainst}`} />
                  <StatCell
                    value={`${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}`}
                  />
                  <td className="px-2 py-2 text-center text-sm font-bold text-[#14201b] sm:px-3">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function QualificationRules() {
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <button
        type="button"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-sm font-semibold text-[#14201b]">Qualification Rules</span>
          <span className="block text-xs text-[#65756b]">Top {tournamentFormat.qualifyingTeams} advance from the league table</span>
        </span>
        <ChevronDown className={`h-5 w-5 text-[#65756b] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid gap-2 border-t border-[#e5e9e0] px-4 py-3 text-sm text-[#34433a]">
          <p>1. Top {tournamentFormat.qualifyingTeams} teams from the league table qualify for the knockout stage.</p>
          <p>2. Tiebreakers: points, goal difference, goals scored, then head-to-head if available.</p>
          <p>3. If teams are still tied, fair play ranking and organizer decision can be used.</p>
        </div>
      )}
    </section>
  )
}

function StatCell({ value }) {
  return <td className="px-2 py-2 text-center font-medium text-[#34433a]">{value}</td>
}

function LeadersBoard({ leaderboards, onPlayerSelect }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Leaderboard
        title="Top Scorers"
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.goals}
        valueKey="goals"
        label="Goals"
      />
      <Leaderboard
        title="Most Assists"
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.assists}
        valueKey="assists"
        label="Assists"
      />
      <Leaderboard
        title="Contributions"
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.contributions}
        valueKey="contributions"
        label="G + A"
      />
    </div>
  )
}

function Leaderboard({ title, onPlayerSelect, players, valueKey, label }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Medal} title={title} detail={label} />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {players.slice(0, 8).map((player, index) => (
          <PlayerStatRow
            key={player.id}
            onPlayerSelect={onPlayerSelect}
            player={player}
            index={index}
            value={player[valueKey]}
            label={`${player.goals} G / ${player.assists} A`}
          />
        ))}
      </div>
    </section>
  )
}

function PlayerStatRow({ onPlayerSelect, player, index, value, label }) {
  return (
    <button
      type="button"
      className="grid min-h-16 w-full min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#fbfdf9]"
      onClick={() => onPlayerSelect?.(player.id)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#eef3e9] text-xs font-semibold text-[#34433a]">
        {index + 1}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <FlagMark team={player.team} small />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#14201b]">{player.name}</p>
          <p className="truncate text-xs text-[#65756b]">
            {player.team.country} / #{player.number} / {player.position}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-[#14201b]">{value}</p>
        <p className="text-xs text-[#65756b]">{label}</p>
      </div>
    </button>
  )
}

function KnockoutPanel({ matches, teams }) {
  const semiFinals = matches.filter((match) => match.stage === tournamentFormat.stages.semiFinal)
  const thirdPlaceMatch = matches.find((match) => match.stage === tournamentFormat.stages.thirdPlace)
  const finalMatch = matches.find((match) => match.stage === tournamentFormat.stages.final)

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Trophy} title="Knockout Path" detail="Single-game bracket" />
      <div className="hidden min-w-0 overflow-x-auto border-t border-[#e5e9e0] p-4 lg:block">
        <div className="grid min-w-[760px] gap-6">
          <div className="grid grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] items-center gap-6">
            <BracketRound
              matches={semiFinals.slice(0, 1)}
              side="left"
              teams={teams}
              title="1st vs 4th"
            />
            <FinalNode match={finalMatch} teams={teams} />
            <BracketRound
              matches={semiFinals.slice(1, 2)}
              side="right"
              teams={teams}
              title="2nd vs 3rd"
            />
          </div>
          {thirdPlaceMatch && (
            <div className="mx-auto w-full max-w-sm">
              <p className="mb-3 text-center text-xs font-semibold uppercase text-[#65756b]">Third Place</p>
              <BracketMatchNode match={thirdPlaceMatch} teams={teams} />
            </div>
          )}
        </div>
      </div>
      <MobileKnockoutPath
        finalMatch={finalMatch}
        semiFinals={semiFinals}
        teams={teams}
        thirdPlaceMatch={thirdPlaceMatch}
      />
    </section>
  )
}

function getNeutralTeamLabel(match, teams, side) {
  const team = getMatchTeam(match, teams, side)
  return team?.country ?? 'TBD'
}

function MobileKnockoutPath({ finalMatch, semiFinals, teams, thirdPlaceMatch }) {
  const stages = [
    {
      title: 'Semi-finals',
      detail: '1st vs 4th / 2nd vs 3rd',
      matches: semiFinals,
    },
    {
      title: 'Third Place',
      detail: 'Semi-final losers',
      matches: thirdPlaceMatch ? [thirdPlaceMatch] : [],
    },
    {
      title: 'Final',
      detail: 'Semi-final winners',
      matches: finalMatch ? [finalMatch] : [],
      finalStage: true,
    },
  ].filter((stage) => stage.matches.length)

  return (
    <div className="grid gap-4 border-t border-[#e5e9e0] p-3 lg:hidden">
      {stages.map((stage, index) => (
        <div key={stage.title} className="grid gap-3">
          {index > 0 && <MobileAdvanceConnector label={stage.title === 'Third Place' ? 'Losers play' : 'Winners advance'} />}
          <MobileBracketStage
            detail={stage.detail}
            finalStage={stage.finalStage}
            matches={stage.matches}
            teams={teams}
            title={stage.title}
          />
        </div>
      ))}
    </div>
  )
}

function MobileAdvanceConnector({ label }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <span className="h-6 w-px bg-[#94aa9c]" aria-hidden="true" />
      <span className="rounded-md bg-[#eef3e9] px-3 py-1 text-xs font-semibold uppercase text-[#65756b]">
        {label}
      </span>
    </div>
  )
}

function MobileBracketStage({ detail, finalStage = false, matches, teams, title }) {
  return (
    <section className="grid gap-3">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase text-[#14201b]">{title}</h3>
          <p className="truncate text-xs text-[#65756b]">{detail}</p>
        </div>
        <span className="rounded-md bg-[#f8faf5] px-2.5 py-1 text-xs font-semibold text-[#65756b]">
          {matches.length} game{matches.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="grid gap-3">
        {matches.map((match) => (
          <MobileBracketMatch
            finalStage={finalStage}
            key={match.id}
            match={match}
            teams={teams}
          />
        ))}
      </div>
    </section>
  )
}

function MobileBracketMatch({ finalStage = false, match, teams }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')

  return (
    <article className="rounded-lg border border-[#dce1d7] bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate text-xs font-semibold uppercase text-[#65756b]">
          {formatDate(match.date)} / {match.time}
        </span>
        <StatusPill status={match.status} />
      </div>
      <div className="mt-3 grid gap-2">
        <MobileBracketTeam team={home} />
        <MobileBracketTeam team={away} />
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-[#e5e9e0] pt-3">
        <p className="truncate text-xs text-[#65756b]">{match.venue}</p>
        <span className="shrink-0 text-xs font-semibold text-[#17633f]">
          {finalStage ? 'Champion decided' : 'Winner advances'}
        </span>
      </div>
    </article>
  )
}

function MobileBracketTeam({ team }) {
  const displayTeam = team ?? {
    country: 'TBD',
    code: 'TBD',
    color: '#bfc9bb',
    secondary: '#eef3e9',
  }

  return (
    <div className="grid min-h-11 grid-cols-[30px_minmax(0,1fr)] items-center gap-3 rounded-md bg-[#f8faf5] px-3">
      <FlagMark team={displayTeam} small />
      <span className="truncate text-sm font-semibold text-[#34433a]">
        {displayTeam.country}
      </span>
    </div>
  )
}

function BracketRound({ center = false, matches, pathOnly = false, side, teams, title }) {
  return (
    <div className={`bracket-round ${center ? 'center' : ''} ${side ?? ''}`}>
      <p className="text-center text-xs font-semibold uppercase text-[#65756b]">{title}</p>
      {matches.map((match) => (
        <BracketMatchNode
          key={match.id}
          match={match}
          pathOnly={pathOnly}
          side={side}
          teams={teams}
        />
      ))}
    </div>
  )
}

function FinalNode({ match, teams }) {
  if (!match) {
    return null
  }

  return (
    <div className="bracket-final-node">
      <Trophy className="mx-auto h-6 w-6 text-[#1f6d4d]" />
      <BracketMatchNode match={match} teams={teams} />
    </div>
  )
}

function BracketMatchNode({ match, pathOnly = false, side, teams }) {
  return (
    <div className={`bracket-match-node ${pathOnly ? 'path-only' : ''} ${side ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-[#65756b]">{match.stage}</span>
        <span className="text-xs text-[#65756b]">{formatDate(match.date)}</span>
      </div>
      {pathOnly ? (
        <div className="rounded-md bg-[#f8faf5] px-3 py-3">
          <p className="truncate text-sm font-semibold text-[#14201b]">{match.time}</p>
          <p className="mt-1 truncate text-xs text-[#65756b]">{match.venue}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          <PlaceholderTeam label={getNeutralTeamLabel(match, teams, 'home')} />
          <PlaceholderTeam label={getNeutralTeamLabel(match, teams, 'away')} />
        </div>
      )}
    </div>
  )
}

function PlaceholderTeam({ label }) {
  return (
    <div className="bracket-team-slot flex min-h-10 items-center gap-3 rounded-md bg-[#f8faf5] px-3">
      <ShieldCheck className="h-4 w-4 text-[#65756b]" />
      <span className="truncate text-sm font-medium text-[#34433a]">{label}</span>
    </div>
  )
}

function MatchCenterPage({
  allMatches,
  lineups,
  match,
  onBack,
  onTeamSelect,
  onVote,
  playersById,
  standings,
  teams,
  votes,
}) {
  const [activeTab, setActiveTab] = useState('Details')
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const relatedMatches = allMatches
    .filter(
      (item) =>
        item.id !== match.id &&
        [item.homeTeamId, item.awayTeamId].some((teamId) =>
          [match.homeTeamId, match.awayTeamId].includes(teamId),
        ),
    )
    .slice(0, 5)

  return (
    <div className="grid min-w-0 gap-4">
      <DetailTopBar onBack={onBack} title="Match Center" />
      <section className="overflow-hidden rounded-xl border border-[#dce1d7] bg-[#10261d] text-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {getMatchCompetitionLabel(match)}
          </span>
          <div className="flex gap-2">
            <IconButton icon={Share2} label="Share match" />
            <IconButton icon={Bell} label="Set reminder" />
            <IconButton icon={Star} label="Favorite match" />
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 pb-5 pt-2">
          <MatchHeroTeam align="right" onTeamSelect={onTeamSelect} team={home} />
          <div className="rounded-xl bg-white px-4 py-3 text-center text-[#14201b] shadow-sm">
            <p className="text-2xl font-semibold leading-none">
              {isScoredMatch(match) ? `${match.homeScore}-${match.awayScore}` : match.time}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase text-[#65756b]">{match.status}</p>
          </div>
          <MatchHeroTeam onTeamSelect={onTeamSelect} team={away} />
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-center text-xs font-semibold text-[#cfe7d8]">
          {formatLongDate(match.date)} / {match.venue}
        </div>
      </section>
      <TabStrip activeTab={activeTab} onChange={setActiveTab} tabs={detailTabs} />
      {activeTab === 'Details' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <MatchCompetitionCard match={match} />
            {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
              <PredictionVote match={match} onVote={onVote} teams={teams} votes={votes} />
            )}
            <TeamComparisonCard allMatches={allMatches} away={away} home={home} standings={standings} />
            <ScoringSummary match={match} teams={teams} />
          </div>
          <div className="grid content-start gap-4">
            <StandingsPreview match={match} onTeamSelect={onTeamSelect} standings={standings} />
            <RecentFormCard allMatches={allMatches} away={away} home={home} />
          </div>
        </div>
      )}
      {activeTab === 'Lineups' && (
        <LineupsPanel lineups={lineups} match={match} playersById={playersById} teams={teams} />
      )}
      {activeTab === 'Standings' && (
        <StandingsPreview large match={match} onTeamSelect={onTeamSelect} standings={standings} />
      )}
      {activeTab === 'Matches' && (
        <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title="Related Matches" detail="Both teams" />
          <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
            {relatedMatches.length ? (
              relatedMatches.map((item) => (
                <MatchRow
                  key={item.id}
                  match={item}
                  onMatchSelect={(matchId) => setHashRoute('match', matchId)}
                  teams={teams}
                  votes={votes}
                />
              ))
            ) : (
              <div className="p-4">
                <EmptyState text="No related matches yet." />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function DetailTopBar({ onBack, title }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#d4dace] bg-white px-3 text-sm font-semibold text-[#34433a]"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="truncate text-lg font-semibold text-[#14201b]">{title}</h1>
    </div>
  )
}

function IconButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      className="grid h-10 w-10 place-items-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function MatchHeroTeam({ align = 'left', onTeamSelect, team }) {
  return (
    <button
      type="button"
      className={`grid min-w-0 justify-items-center gap-2 text-center ${
        align === 'right' ? 'sm:justify-items-end sm:text-right' : 'sm:justify-items-start sm:text-left'
      }`}
      onClick={() => team?.id && onTeamSelect?.(team.id)}
    >
      <FlagMark team={team} />
      <span className="max-w-full truncate text-sm font-semibold sm:text-base">{team.country}</span>
    </button>
  )
}

function TabStrip({ activeTab, onChange, tabs }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-[#dce1d7]">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`relative min-h-11 shrink-0 px-3 text-sm font-semibold ${
            activeTab === tab
              ? 'text-[#14201b] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#163428]'
              : 'text-[#65756b]'
          }`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function MatchCompetitionCard({ match }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Trophy} title="Competition" detail={getMatchRoundLabel(match)} />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2">
        <AdminMetric label="Tournament" value="Deir Hanna World Cup" />
        <AdminMetric label="Round" value={getMatchRoundLabel(match)} />
        <AdminMetric label="Date" value={formatLongDate(match.date)} />
        <AdminMetric label="Time" value={match.time} />
        <AdminMetric label="Venue" value={match.venue} />
        <AdminMetric label="Status" value={match.status} />
      </div>
    </section>
  )
}

function StandingsPreview({ large = false, match, onTeamSelect, standings }) {
  const rows = isLeagueStage(match.stage) ? standings[tournamentFormat.tableKey] ?? [] : []

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader
        icon={Table2}
        title={large ? 'League Standings' : 'Standings Preview'}
        detail={isLeagueStage(match.stage) ? tournamentFormat.tableLabel : 'Knockout match'}
      />
      <div className="border-t border-[#e5e9e0] p-3">
        {rows.length ? (
          <div className="grid gap-2">
            {rows.map((row) => (
              <CompactStandingRow
                key={row.team.id}
                onTeamSelect={onTeamSelect}
                row={row}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="Standings are available for league matches." />
        )}
      </div>
    </section>
  )
}

function TeamComparisonCard({ allMatches, away, home, standings }) {
  const homeRecord = getTeamRecord(allMatches, home.id)
  const awayRecord = getTeamRecord(allMatches, away.id)
  const homeStanding = getTeamStandingRow(standings, home.id)
  const awayStanding = getTeamStandingRow(standings, away.id)

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={BarChart3} title="Compare Teams" detail="Tournament form" />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
        <ComparisonRow away={awayStanding?.rank ?? '-'} home={homeStanding?.rank ?? '-'} label="Ranking" />
        <ComparisonRow away={awayRecord.goalsFor} home={homeRecord.goalsFor} label="Goals scored" />
        <ComparisonRow away={awayRecord.goalsAgainst} home={homeRecord.goalsAgainst} label="Goals conceded" />
        <ComparisonRow away={awayRecord.wins} home={homeRecord.wins} label="Wins" />
        <ComparisonRow away={awayRecord.draws} home={homeRecord.draws} label="Draws" />
        <ComparisonRow away={awayRecord.losses} home={homeRecord.losses} label="Losses" />
      </div>
    </section>
  )
}

function ComparisonRow({ away, home, label }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-3 text-sm">
      <span className="text-center font-semibold text-[#14201b]">{home}</span>
      <span className="truncate text-center text-xs font-semibold uppercase text-[#65756b]">{label}</span>
      <span className="text-center font-semibold text-[#14201b]">{away}</span>
    </div>
  )
}

function RecentFormCard({ allMatches, away, home }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Activity} title="Recent Form" detail="Last matches" />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
        <FormLine form={getTeamForm(allMatches, home.id)} team={home} />
        <FormLine form={getTeamForm(allMatches, away.id)} team={away} />
      </div>
    </section>
  )
}

function FormLine({ form, team }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-[#f8faf5] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <FlagMark team={team} small />
        <span className="truncate text-sm font-semibold">{team.country}</span>
      </div>
      <div className="flex gap-1">
        {(form.length ? form : ['-', '-', '-']).map((item, index) => (
          <span
            key={`${team.id}-form-${index}`}
            className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
              item === 'W'
                ? 'bg-[#dff1e6] text-[#17633f]'
                : item === 'L'
                  ? 'bg-[#ffe4e4] text-[#9b2f2f]'
                  : 'bg-[#ecefe8] text-[#65756b]'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function TeamPage({ allMatches, onBack, onMatchSelect, onPlayerSelect, players, standings, team, teams }) {
  const [activeTab, setActiveTab] = useState('Matches')
  const [playerQuery, setPlayerQuery] = useState('')
  const teamMatches = getTeamMatches(allMatches, team.id)
  const standing = getTeamStandingRow(standings, team.id)
  const filteredPlayers = players.filter((player) =>
    [player.name, player.number].join(' ').toLowerCase().includes(playerQuery.trim().toLowerCase()),
  )

  return (
    <div className="grid min-w-0 gap-4">
      <DetailTopBar onBack={onBack} title="Team Page" />
      <section className="overflow-hidden rounded-xl border border-[#dce1d7] bg-[#10261d] text-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <FlagMark team={team} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{team.country}</h1>
              <p className="mt-1 text-sm text-[#cfe7d8]">{tournamentFormat.tableLabel} / {players.length} players</p>
            </div>
          </div>
          <div className="flex gap-2">
            <IconButton icon={Share2} label="Share team" />
            <IconButton icon={Star} label="Favorite team" />
          </div>
        </div>
      </section>
      <TabStrip activeTab={activeTab} onChange={setActiveTab} tabs={teamPageTabs} />
      {activeTab === 'Matches' && (
        <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title="Matches" detail={`${teamMatches.length} fixtures`} />
          <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
            {teamMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                onMatchSelect={onMatchSelect}
                teams={teams}
              />
            ))}
          </div>
        </section>
      )}
      {activeTab === 'Standings' && (
        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Table2} title="Standings" detail={tournamentFormat.tableLabel} />
          <div className="grid gap-2 border-t border-[#e5e9e0] p-3">
            {(standings[tournamentFormat.tableKey] ?? []).map((row) => (
              <CompactStandingRow key={row.team.id} row={row} />
            ))}
          </div>
        </section>
      )}
      {activeTab === 'Players' && (
        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Users} title="Players" detail="Search players" />
          <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
            <SearchInput
              onChange={setPlayerQuery}
              placeholder="Search players"
              value={playerQuery}
            />
            <div className="grid gap-2">
              {filteredPlayers.map((player) => (
                <CleanPlayerCard
                  key={player.id}
                  onClick={() => onPlayerSelect(player.id)}
                  player={player}
                  team={team}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      {activeTab === 'Statistics' && (
        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={BarChart3} title="Statistics" detail="Tournament totals" />
          <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetric label="Position" value={standing ? `#${standing.rank}` : '-'} />
            <AdminMetric label="Points" value={standing?.points ?? 0} />
            <AdminMetric label="Goals" value={`${standing?.goalsFor ?? 0}:${standing?.goalsAgainst ?? 0}`} />
            <AdminMetric label="Form" value={getTeamForm(allMatches, team.id).join(' ') || '-'} />
          </div>
        </section>
      )}
    </div>
  )
}

function SearchInput({ onChange, placeholder, value }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65756b]" />
      <input
        className="min-h-11 w-full rounded-lg border border-[#d4dace] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function CleanPlayerCard({ onClick, player, team }) {
  return (
    <button
      type="button"
      aria-label={`Open ${player.name} player profile`}
      className="grid min-h-16 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#dce1d7] bg-white px-3 text-left transition hover:border-[#9cb4a5]"
      onClick={onClick}
    >
      <PlayerAvatar player={player} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#14201b]">{player.name}</span>
        <span className="block truncate text-xs text-[#65756b]">
          #{player.number} / {team.country}
        </span>
      </span>
      <FlagMark team={team} small />
    </button>
  )
}

function PlayerAvatar({ player, small = false }) {
  const initials = player?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[#eef3e9] font-semibold text-[#34433a] ${
        small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
      }`}
      aria-hidden="true"
    >
      {initials || <UserRound className="h-4 w-4" />}
    </span>
  )
}

function PlayerPage({ allMatches, onBack, onMatchSelect, onTeamSelect, player, teams }) {
  const team = getPlayerTeam(player, teams)
  const contributions = getPlayerContributions(player, allMatches)
  const playerMatches = getTeamMatches(allMatches, player.teamId)
  const chartRows = playerMatches.slice(-6).map((match) => {
    const matchEvents = (match.events ?? []).filter(
      (event) => event.player === player.name || event.assist === player.name,
    )

    return {
      label: formatDate(match.date),
      goals: matchEvents.filter((event) => event.player === player.name).length,
      assists: matchEvents.filter((event) => event.assist === player.name).length,
    }
  })

  return (
    <div className="grid min-w-0 gap-4">
      <DetailTopBar onBack={onBack} title="Player Profile" />
      <section className="overflow-hidden rounded-xl border border-[#dce1d7] bg-[#10261d] text-white shadow-sm">
        <div className="flex min-w-0 items-center gap-4 px-4 py-5">
          <PlayerAvatar player={player} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{player.name}</h1>
            <button
              type="button"
              className="mt-1 flex min-w-0 items-center gap-2 text-sm text-[#cfe7d8]"
              onClick={() => team?.id && onTeamSelect(team.id)}
            >
              {team && <FlagMark team={team} small />}
              <span className="truncate">{team?.country} / #{player.number}</span>
            </button>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={BarChart3} title="Tournament Stats" detail="Current data" />
        <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Matches" value={playerMatches.filter(isScoredMatch).length} />
          <AdminMetric label="Goals" value={player.goals} />
          <AdminMetric label="Assists" value={player.assists} />
          <AdminMetric label="Yellow cards" value={player.yellowCards ?? 0} />
          <AdminMetric label="Red cards" value={player.redCards ?? 0} />
          <AdminMetric label="Minutes" value="Pending stats" />
          <AdminMetric label="Shots" value="Pending stats" />
          <AdminMetric label="Pass accuracy" value="Pending stats" />
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Activity} title="Goals / Assists by Match" detail="Recent fixtures" />
        <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
          {chartRows.length ? <PlayerMiniChart rows={chartRows} /> : <EmptyState text="No chart data yet." />}
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Clock} title="Match History" detail="Previous matches" />
        <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
          {playerMatches.length ? (
            playerMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                onMatchSelect={onMatchSelect}
                teams={teams}
              />
            ))
          ) : (
            <div className="p-4">
              <EmptyState text="No match history yet." />
            </div>
          )}
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Goal} title="Contributions" detail="Goals and assists" />
        <div className="grid gap-2 border-t border-[#e5e9e0] p-4">
          {contributions.length ? (
            contributions.map((event) => (
              <EventDetailRow
                key={`${event.match.id}-${event.minute}-${event.contribution}`}
                event={event}
                teams={teams}
              />
            ))
          ) : (
            <EmptyState text="No goals or assists recorded yet." />
          )}
        </div>
      </section>
    </div>
  )
}

function PlayerMiniChart({ rows }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.goals + row.assists))

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const total = row.goals + row.assists

        return (
          <div key={row.label} className="grid grid-cols-[58px_minmax(0,1fr)_52px] items-center gap-3">
            <span className="text-xs font-semibold text-[#65756b]">{row.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[#eef3e9]">
              <div
                className="h-full rounded-full bg-[#1f6d4d]"
                style={{ width: `${(total / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-right text-xs font-semibold text-[#34433a]">
              {row.goals}G {row.assists}A
            </span>
          </div>
        )
      })}
    </div>
  )
}

function KnockoutBoard({ matches, onMatchSelect, teams }) {
  const [activeStage, setActiveStage] = useState(tournamentFormat.stages.semiFinal)
  const [expanded, setExpanded] = useState(false)
  const stageMatches = matches
    .filter((match) => match.stage === activeStage)
    .sort(compareMatchDate)

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title="Knockout" icon={Trophy}>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#163428] px-3 text-sm font-semibold text-white"
          onClick={() => setExpanded(true)}
        >
          <Expand className="h-4 w-4" />
          Expand
        </button>
      </Toolbar>
      <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-[#10261d] shadow-sm">
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3">
          {knockoutStageFilters.map((stage) => (
            <FilterChip
              active={activeStage === stage.id}
              key={stage.id}
              label={stage.label}
              onClick={() => setActiveStage(stage.id)}
            />
          ))}
        </div>
        <div className="grid gap-3 bg-[#07100d] p-3">
          <section className="overflow-hidden rounded-xl border border-white/10 bg-white">
            <div className="border-b border-[#e5e9e0] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#14201b]">
                {knockoutStageFilters.find((stage) => stage.id === activeStage)?.label}
              </h3>
            </div>
            <div className="divide-y divide-[#e5e9e0]">
              {stageMatches.length ? (
                stageMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    onMatchSelect={onMatchSelect}
                    teams={teams}
                  />
                ))
              ) : (
                <div className="p-4">
                  <EmptyState text="No matches available for this stage yet." />
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
      <div className="hidden lg:block">
        <KnockoutPanel matches={matches} teams={teams} />
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 bg-[#07100d] p-4 text-white">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#9fb5aa]">Bracket viewer</p>
              <h2 className="text-lg font-semibold">Knockout path</h2>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md bg-white/10"
              onClick={() => setExpanded(false)}
              aria-label="Close bracket"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100vh-84px)] overflow-auto rounded-xl border border-white/10 bg-white p-4 text-[#14201b]">
            <KnockoutPanel matches={matches} teams={teams} />
          </div>
        </div>
      )}
    </div>
  )
}

function createNewMatchDraft(teams) {
  return {
    stage: tournamentFormat.stages.league,
    group: tournamentFormat.tableKey,
    matchday: 1,
    date: '2026-06-20',
    time: '19:30',
    venue: 'Deir Hanna Stadium',
    homeTeamId: teams[0]?.id ?? '',
    awayTeamId: teams[1]?.id ?? '',
    homeScore: '',
    awayScore: '',
    status: 'scheduled',
    minute: '',
  }
}

function matchToAdminDraft(match) {
  if (!match) {
    return null
  }

  return {
    ...match,
    events: (match.events ?? []).map((event) => ({
      minute: event.minute,
      type: event.type ?? 'goal',
      teamId: event.teamId ?? '',
      player: event.player ?? '',
      assist: event.assist ?? '',
    })),
    group: match.group ?? tournamentFormat.tableKey,
    matchday: match.matchday ?? 1,
    homeTeamId: match.homeTeamId ?? '',
    awayTeamId: match.awayTeamId ?? '',
    homeScore: match.homeScore ?? '',
    awayScore: match.awayScore ?? '',
    minute: match.minute ?? '',
  }
}

function AdminBoard({
  adminEmail,
  adminUnlocked,
  allMatches,
  authNotice,
  onAddMatch,
  onAddPlayer,
  onAddTeam,
  onSaveMatch,
  onSignIn,
  onSignOut,
  players,
  teams,
}) {
  const [adminEmailDraft, setAdminEmailDraft] = useState('')
  const [teamDraft, setTeamDraft] = useState({
    country: '',
    code: '',
    group: tournamentFormat.tableKey,
    color: '#1f6d4d',
    secondary: '#eef3e9',
  })
  const [playerDraft, setPlayerDraft] = useState({
    teamId: teams[0]?.id ?? '',
    name: '',
    number: 13,
    position: 'MF',
  })
  const [newMatchDraft, setNewMatchDraft] = useState(() => createNewMatchDraft(teams))
  const [selectedMatchId, setSelectedMatchId] = useState(allMatches[0]?.id ?? '')
  const effectivePlayerTeamId = teams.some((team) => team.id === playerDraft.teamId)
    ? playerDraft.teamId
    : teams[0]?.id ?? ''
  const effectiveSelectedMatchId = allMatches.some((match) => match.id === selectedMatchId)
    ? selectedMatchId
    : allMatches[0]?.id ?? ''
  const selectedMatch = allMatches.find((match) => match.id === effectiveSelectedMatchId)
  const selectedTeamPlayerCount = players.filter(
    (player) => player.teamId === effectivePlayerTeamId,
  ).length
  const selectedTeamIsFull = selectedTeamPlayerCount >= maxSquadPlayers

  const teamOptions = teams.map((team) => ({
    label: `${team.country} (${team.code})`,
    value: team.id,
  }))
  const matchOptions = allMatches.map((match) => {
    const home = getMatchTeam(match, teams, 'home')
    const away = getMatchTeam(match, teams, 'away')

    return {
      label: `${formatDate(match.date)} / ${home.country} vs ${away.country}`,
      value: match.id,
    }
  })
  const disabled = !adminUnlocked

  async function submitAdminLogin(event) {
    event.preventDefault()

    if (!adminEmailDraft.trim()) {
      return
    }

    await onSignIn(adminEmailDraft.trim())
  }

  async function submitTeam(event) {
    event.preventDefault()

    if (!teamDraft.country.trim() || !teamDraft.code.trim()) {
      return
    }

    await onAddTeam(teamDraft)
    setTeamDraft((draft) => ({ ...draft, country: '', code: '' }))
  }

  async function submitPlayer(event) {
    event.preventDefault()

    if (!playerDraft.name.trim() || !effectivePlayerTeamId) {
      return
    }

    await onAddPlayer({ ...playerDraft, teamId: effectivePlayerTeamId })
    setPlayerDraft((draft) => ({
      ...draft,
      name: '',
      number: Number(draft.number) + 1,
    }))
  }

  async function submitNewMatch(event) {
    event.preventDefault()
    await onAddMatch(newMatchDraft)
    setNewMatchDraft(createNewMatchDraft(teams))
  }

  const adminAccessCard = (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={LockKeyhole} title="Admin Access" detail="Control panel" />
      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4">
        {adminEmail ? (
          <div className="grid gap-3">
            <div className="rounded-md bg-[#eef3e9] px-3 py-3 text-sm text-[#34433a]">
              Signed in as {adminEmail}
              <span className="mt-1 block text-xs text-[#65756b]">
                {adminUnlocked
                  ? 'Admin access confirmed.'
                  : 'This email is signed in but is not listed in admin_users.'}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d4dace] bg-white px-4 text-sm font-semibold text-[#34433a]"
              onClick={onSignOut}
            >
              <LockKeyhole className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : (
          <form className="grid min-w-0 gap-3" onSubmit={submitAdminLogin}>
            <AdminTextInput
              disabled={false}
              label="Admin email"
              onChange={setAdminEmailDraft}
              placeholder="name@example.com"
              type="email"
              value={adminEmailDraft}
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white"
            >
              <LockKeyhole className="h-4 w-4" />
              Send login link
            </button>
          </form>
        )}
        {authNotice && (
          <div className="rounded-md bg-[#f8faf5] px-3 py-3 text-sm text-[#34433a]">
            {authNotice}
          </div>
        )}
        {adminUnlocked && (
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <AdminMetric label="Teams" value={teams.length} />
            <AdminMetric label="Players" value={players.length} />
          </div>
        )}
      </div>
    </section>
  )

  if (!adminUnlocked) {
    return <div className="grid min-w-0 gap-6">{adminAccessCard}</div>
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {adminAccessCard}

        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={PencilLine} title="Edit Match" detail="Score and details" />
          <EditMatchForm
            key={effectiveSelectedMatchId}
            disabled={disabled}
            match={selectedMatch}
            matchOptions={matchOptions}
            onSaveMatch={onSaveMatch}
            selectedMatchId={effectiveSelectedMatchId}
            setSelectedMatchId={setSelectedMatchId}
            teamOptions={teamOptions}
          />
        </section>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={ShieldCheck} title="Add Team" detail="Tournament setup" />
          <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitTeam}>
            <AdminTextInput
              disabled={disabled}
              label="Team name"
              onChange={(value) => setTeamDraft((draft) => ({ ...draft, country: value }))}
              placeholder="Country or team"
              value={teamDraft.country}
            />
            <FieldGrid>
              <AdminTextInput
                disabled={disabled}
                label="Code"
                maxLength={3}
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, code: value }))}
                placeholder="ARG"
                value={teamDraft.code}
              />
              <AdminTextInput disabled label="Table" value={tournamentFormat.tableLabel} />
            </FieldGrid>
            <FieldGrid>
              <AdminTextInput
                disabled={disabled}
                label="Primary"
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, color: value }))}
                type="color"
                value={teamDraft.color}
              />
              <AdminTextInput
                disabled={disabled}
                label="Secondary"
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, secondary: value }))}
                type="color"
                value={teamDraft.secondary}
              />
            </FieldGrid>
            <AdminSubmit disabled={disabled} icon={Plus} label="Add team" />
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Users} title="Add Player" detail="Squad management" />
          <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitPlayer}>
            <div className="rounded-md bg-[#eef3e9] px-3 py-3 text-sm text-[#34433a]">
              Squad slots: {selectedTeamPlayerCount}/{maxSquadPlayers}
            </div>
            <AdminSelect
              disabled={disabled || !teams.length}
              label="Team"
              onChange={(value) => setPlayerDraft((draft) => ({ ...draft, teamId: value }))}
              options={teamOptions}
              value={effectivePlayerTeamId}
            />
            <AdminTextInput
              disabled={disabled}
              label="Player name"
              onChange={(value) => setPlayerDraft((draft) => ({ ...draft, name: value }))}
              placeholder="Player name"
              value={playerDraft.name}
            />
            <FieldGrid>
              <AdminTextInput
                disabled={disabled}
                label="Number"
                min="1"
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, number: value }))}
                type="number"
                value={playerDraft.number}
              />
              <AdminSelect
                disabled={disabled}
                label="Position"
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, position: value }))}
                options={positionOptions}
                value={playerDraft.position}
              />
            </FieldGrid>
            <AdminSubmit
              disabled={disabled || !teams.length || selectedTeamIsFull}
              icon={Plus}
              label={selectedTeamIsFull ? 'Squad full' : 'Add player'}
            />
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title="Add Match" detail="Fixture setup" />
          <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitNewMatch}>
            <MatchDraftFields
              disabled={disabled}
              draft={newMatchDraft}
              setDraft={setNewMatchDraft}
              teamOptions={teamOptions}
            />
            <AdminSubmit disabled={disabled || teams.length < 2} icon={Plus} label="Add match" />
          </form>
        </section>
      </div>

      <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Smartphone} title="Version Roadmap" detail="MVP first" />
        <div className="grid min-w-0 gap-3 border-t border-[#e5e9e0] p-4 md:grid-cols-3">
          <RoadmapItem title="Public dashboard" detail="Fixtures, live scores, tables, leaders" />
          <RoadmapItem title="Admin updates" detail="Secure score and event entry" />
          <RoadmapItem title="PWA release" detail="Installable QR-code access" />
        </div>
      </section>
    </div>
  )
}

function MatchDraftFields({ disabled, draft, setDraft, teamOptions }) {
  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }

  return (
    <div className="grid min-w-0 gap-4">
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label="Stage"
          onChange={(value) => updateDraft('stage', value)}
          options={stageOptions}
          value={draft.stage}
        />
        <AdminTextInput disabled label="Table" value={tournamentFormat.tableLabel} />
      </FieldGrid>
      <FieldGrid>
        <AdminTextInput
          disabled={disabled}
          label="Date"
          onChange={(value) => updateDraft('date', value)}
          type="date"
          value={draft.date}
        />
        <AdminTextInput
          disabled={disabled}
          label="Time"
          onChange={(value) => updateDraft('time', value)}
          type="time"
          value={draft.time}
        />
      </FieldGrid>
      <AdminTextInput
        disabled={disabled}
        label="Venue"
        onChange={(value) => updateDraft('venue', value)}
        value={draft.venue}
      />
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label="Home"
          onChange={(value) => updateDraft('homeTeamId', value)}
          options={[{ label: 'TBD', value: '' }, ...teamOptions]}
          value={draft.homeTeamId}
        />
        <AdminSelect
          disabled={disabled}
          label="Away"
          onChange={(value) => updateDraft('awayTeamId', value)}
          options={[{ label: 'TBD', value: '' }, ...teamOptions]}
          value={draft.awayTeamId}
        />
      </FieldGrid>
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label="Status"
          onChange={(value) => updateDraft('status', value)}
          options={statusOptions}
          value={draft.status}
        />
        <AdminTextInput
          disabled={disabled}
          label="Matchday"
          min="1"
          onChange={(value) => updateDraft('matchday', value)}
          type="number"
          value={draft.matchday}
        />
      </FieldGrid>
      <FieldGrid>
        <AdminTextInput
          disabled={disabled}
          label="Home score"
          min="0"
          onChange={(value) => updateDraft('homeScore', value)}
          type="number"
          value={draft.homeScore}
        />
        <AdminTextInput
          disabled={disabled}
          label="Away score"
          min="0"
          onChange={(value) => updateDraft('awayScore', value)}
          type="number"
          value={draft.awayScore}
        />
      </FieldGrid>
      <AdminTextInput
        disabled={disabled || draft.status !== 'live'}
        label="Minute"
        min="1"
        onChange={(value) => updateDraft('minute', value)}
        type="number"
        value={draft.minute}
      />
    </div>
  )
}

function EditMatchForm({
  disabled,
  match,
  matchOptions,
  onSaveMatch,
  selectedMatchId,
  setSelectedMatchId,
  teamOptions,
}) {
  const [draft, setDraft] = useState(() => matchToAdminDraft(match))

  async function submitEditMatch(event) {
    event.preventDefault()

    if (!draft) {
      return
    }

    await onSaveMatch(draft)
  }

  return (
    <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitEditMatch}>
      <AdminSelect
        disabled={disabled || !matchOptions.length}
        label="Match"
        onChange={(value) => setSelectedMatchId(value)}
        options={matchOptions}
        value={selectedMatchId}
      />
      {draft && (
        <MatchDraftFields
          disabled={disabled}
          draft={draft}
          setDraft={setDraft}
          teamOptions={teamOptions}
        />
      )}
      {draft && (
        <MatchEventsEditor
          disabled={disabled}
          draft={draft}
          setDraft={setDraft}
          teamOptions={teamOptions}
        />
      )}
      <AdminSubmit disabled={disabled || !draft} icon={Save} label="Save match" />
    </form>
  )
}

function MatchEventsEditor({ disabled, draft, setDraft, teamOptions }) {
  const events = draft.events ?? []
  const eventTeamOptions = [{ label: 'Select team', value: '' }, ...teamOptions]

  function updateEvent(index, field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      events: (currentDraft.events ?? []).map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event,
      ),
    }))
  }

  function addEvent() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      events: [
        ...(currentDraft.events ?? []),
        {
          minute: '',
          type: 'goal',
          teamId: currentDraft.homeTeamId ?? '',
          player: '',
          assist: '',
        },
      ],
    }))
  }

  function removeEvent(index) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      events: (currentDraft.events ?? []).filter((_event, eventIndex) => eventIndex !== index),
    }))
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-[#fbfdf9] p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#14201b]">Scorers & Assists</h3>
          <p className="text-xs text-[#65756b]">Saved as match events</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-[#d4dace] bg-white px-3 text-xs font-semibold text-[#34433a]"
          disabled={disabled}
          onClick={addEvent}
        >
          Add goal
        </button>
      </div>
      <div className="grid min-w-0 gap-3">
        {events.length ? (
          events.map((event, index) => (
            <div
              key={`event-${index}`}
              className="grid min-w-0 gap-3 rounded-md border border-[#dce1d7] bg-white p-3"
            >
              <FieldGrid>
                <AdminTextInput
                  disabled={disabled}
                  label="Minute"
                  min="1"
                  onChange={(value) => updateEvent(index, 'minute', value)}
                  type="number"
                  value={event.minute}
                />
                <AdminSelect
                  disabled={disabled}
                  label="Team"
                  onChange={(value) => updateEvent(index, 'teamId', value)}
                  options={eventTeamOptions}
                  value={event.teamId}
                />
              </FieldGrid>
              <FieldGrid>
                <AdminTextInput
                  disabled={disabled}
                  label="Scorer"
                  onChange={(value) => updateEvent(index, 'player', value)}
                  placeholder="Player name"
                  value={event.player}
                />
                <AdminTextInput
                  disabled={disabled}
                  label="Assist"
                  onChange={(value) => updateEvent(index, 'assist', value)}
                  placeholder="Leave empty if unassisted"
                  value={event.assist}
                />
              </FieldGrid>
              <button
                type="button"
                className="justify-self-start rounded-md border border-[#d4dace] bg-white px-3 py-2 text-xs font-semibold text-[#34433a] disabled:opacity-45"
                disabled={disabled}
                onClick={() => removeEvent(index)}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <EmptyState text="No goal events recorded for this match." />
        )}
      </div>
    </section>
  )
}

function AdminMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-md bg-[#eef3e9] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight text-[#14201b]">
        {value}
      </p>
    </div>
  )
}

function FieldGrid({ children }) {
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2">{children}</div>
}

function AdminTextInput({
  disabled,
  label,
  maxLength,
  min,
  onChange,
  placeholder,
  type = 'text',
  value,
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-[#34433a]">
      {label}
      <input
        className="min-h-11 w-full min-w-0 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-3 outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7] disabled:bg-[#eef1ea]"
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={!onChange}
        type={type}
        value={value}
      />
    </label>
  )
}

function AdminSelect({ disabled, label, onChange, options, value }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-[#34433a]">
      {label}
      <select
        className="min-h-11 w-full min-w-0 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-3 outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7] disabled:bg-[#eef1ea]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function AdminSubmit({ disabled, icon: Icon, label }) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function RoadmapItem({ title, detail }) {
  return (
    <div className="rounded-lg bg-[#f8faf5] p-4">
      <p className="font-semibold text-[#14201b]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#65756b]">{detail}</p>
    </div>
  )
}

function PanelHeader({ icon: Icon, title, detail }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-[#eef3e9] text-[#1f6d4d]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#14201b]">{title}</h2>
          <p className="truncate text-xs text-[#65756b]">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function Toolbar({ title, icon: Icon, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#163428] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="min-w-0 truncate text-xl font-semibold text-[#14201b]">{title}</h2>
      </div>
      <div className="flex min-w-0 flex-wrap gap-2 pb-1 sm:justify-end sm:pb-0">{children}</div>
    </div>
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export default App
