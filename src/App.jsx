import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDot,
  ClipboardList,
  Clock,
  Goal,
  LockKeyhole,
  Medal,
  PencilLine,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Table2,
  Timer,
  Trophy,
  Users,
  X,
  Search,
} from 'lucide-react'
import './App.css'
import {
  groups,
  knockoutMatches as seedKnockoutMatches,
  lineups as seedLineups,
  matches as seedMatches,
  players as seedPlayers,
  teams as seedTeams,
} from './data/tournament'
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

const navItems = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'matches', label: 'Matches', icon: CalendarDays },
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'leaders', label: 'Leaders', icon: Medal },
  { id: 'admin', label: 'Admin', icon: Settings },
]

const statIcons = [Users, ClipboardList, Goal, Timer]
const maxSquadPlayers = 10
const starterCount = 7
const stageOptions = [
  { label: 'Group', value: 'Group' },
  { label: 'Quarter-final', value: 'Quarter-final' },
  { label: 'Semi-final', value: 'Semi-final' },
  { label: 'Third place', value: 'Third place' },
  { label: 'Final', value: 'Final' },
]
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
const storageKey = 'deir-hanna-world-cup-admin-data'
const voteStorageKey = 'deir-hanna-world-cup-votes'
const defaultTournamentData = {
  teams: seedTeams,
  players: seedPlayers,
  matches: seedMatches,
  knockoutMatches: seedKnockoutMatches,
  lineups: seedLineups,
}

function sanitizeTournamentData(data) {
  const playersByTeamCount = {}
  const players = data.players
    .slice()
    .sort((a, b) => a.number - b.number)
    .filter((player) => {
      const count = playersByTeamCount[player.teamId] ?? 0

      if (count >= maxSquadPlayers) {
        return false
      }

      playersByTeamCount[player.teamId] = count + 1
      return true
    })
  const allMatches = [...data.matches, ...data.knockoutMatches]
  const lineups = allMatches.reduce((lineupMap, match) => {
    if (!match.homeTeamId || !match.awayTeamId) {
      return lineupMap
    }

    return {
      ...lineupMap,
      [match.id]: {
        home: makeLineupForTeam(match.homeTeamId, players),
        away: makeLineupForTeam(match.awayTeamId, players),
      },
    }
  }, {})

  return {
    ...data,
    lineups,
    players,
  }
}

function usePersistentTournamentData() {
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultTournamentData
    }

    try {
      const storedData = window.localStorage.getItem(storageKey)

      if (!storedData) {
        return defaultTournamentData
      }

      const parsedData = JSON.parse(storedData)
      const sanitizedData = sanitizeTournamentData({
        ...defaultTournamentData,
        ...parsedData,
      })

      return sanitizedData
    } catch {
      return defaultTournamentData
    }
  })

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data))
  }, [data])

  return [data, setData]
}

function usePersistentVotes() {
  const [votes, setVotes] = useState(() => {
    if (typeof window === 'undefined') {
      return {}
    }

    try {
      const storedVotes = window.localStorage.getItem(voteStorageKey)
      return storedVotes ? JSON.parse(storedVotes) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    window.localStorage.setItem(voteStorageKey, JSON.stringify(votes))
  }, [votes])

  return [votes, setVotes]
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

function App() {
  const [tournamentData, setTournamentData] = usePersistentTournamentData()
  const [votes, setVotes] = usePersistentVotes()
  const [activeView, setActiveView] = useState('overview')
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
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

  function handleVote(matchId, choice) {
    setVotes((currentVotes) => {
      const matchVotes = currentVotes[matchId] ?? { home: 0, away: 0, userChoice: null }

      if (matchVotes.userChoice === choice) {
        return currentVotes
      }

      const nextMatchVotes = {
        home: matchVotes.home ?? 0,
        away: matchVotes.away ?? 0,
        userChoice: choice,
      }

      if (matchVotes.userChoice) {
        nextMatchVotes[matchVotes.userChoice] = Math.max(
          0,
          nextMatchVotes[matchVotes.userChoice] - 1,
        )
      }

      nextMatchVotes[choice] += 1

      return {
        ...currentVotes,
        [matchId]: nextMatchVotes,
      }
    })
  }

  function handleAddTeam(teamDraft) {
    setTournamentData((currentData) => {
      const id = makeUniqueId(
        'team',
        teamDraft.code || teamDraft.country,
        new Set(currentData.teams.map((team) => team.id)),
      )

      return {
        ...currentData,
        teams: [
          ...currentData.teams,
          {
            id,
            country: teamDraft.country.trim(),
            code: teamDraft.code.trim().toUpperCase(),
            group: teamDraft.group,
            color: teamDraft.color,
            secondary: teamDraft.secondary,
          },
        ],
      }
    })
  }

  function handleAddPlayer(playerDraft) {
    setTournamentData((currentData) => {
      const teamPlayerCount = currentData.players.filter(
        (player) => player.teamId === playerDraft.teamId,
      ).length

      if (teamPlayerCount >= maxSquadPlayers) {
        return currentData
      }

      const id = makeUniqueId(
        'p',
        `${playerDraft.teamId}-${playerDraft.name}`,
        new Set(currentData.players.map((player) => player.id)),
      )
      const nextPlayers = [
        ...currentData.players,
        {
          id,
          name: playerDraft.name.trim(),
          teamId: playerDraft.teamId,
          number: Number(playerDraft.number),
          position: playerDraft.position,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      ]
      const allCurrentMatches = [...currentData.matches, ...currentData.knockoutMatches]
      const nextLineups = allCurrentMatches.reduce((lineupMap, match) => {
        if (!lineupMap[match.id]) {
          return lineupMap
        }

        const nextLineup = { ...lineupMap[match.id] }

        if (match.homeTeamId === playerDraft.teamId) {
          nextLineup.home = makeLineupForTeam(playerDraft.teamId, nextPlayers)
        }

        if (match.awayTeamId === playerDraft.teamId) {
          nextLineup.away = makeLineupForTeam(playerDraft.teamId, nextPlayers)
        }

        return { ...lineupMap, [match.id]: nextLineup }
      }, currentData.lineups)

      return {
        ...currentData,
        lineups: nextLineups,
        players: nextPlayers,
      }
    })
  }

  function handleSaveMatch(matchDraft) {
    setTournamentData((currentData) => {
      const match = {
        ...matchDraft,
        group: matchDraft.stage === 'Group' ? matchDraft.group : undefined,
        matchday: Number(matchDraft.matchday),
        homeTeamId: matchDraft.homeTeamId || undefined,
        awayTeamId: matchDraft.awayTeamId || undefined,
        homeScore: normalizeScore(matchDraft.homeScore),
        awayScore: normalizeScore(matchDraft.awayScore),
        minute: matchDraft.minute === '' ? undefined : Number(matchDraft.minute),
      }
      const targetKey = match.stage === 'Group' ? 'matches' : 'knockoutMatches'
      const nextMatches = currentData.matches.filter((item) => item.id !== match.id)
      const nextKnockoutMatches = currentData.knockoutMatches.filter(
        (item) => item.id !== match.id,
      )
      const nextLineups = { ...currentData.lineups }

      if (match.homeTeamId && match.awayTeamId) {
        nextLineups[match.id] = {
          home: makeLineupForTeam(match.homeTeamId, currentData.players),
          away: makeLineupForTeam(match.awayTeamId, currentData.players),
        }
      } else {
        delete nextLineups[match.id]
      }

      return {
        ...currentData,
        matches: targetKey === 'matches' ? [...nextMatches, match] : nextMatches,
        knockoutMatches:
          targetKey === 'knockoutMatches'
            ? [...nextKnockoutMatches, match]
            : nextKnockoutMatches,
        lineups: nextLineups,
      }
    })
  }

  function handleAddMatch(matchDraft) {
    setTournamentData((currentData) => {
      const id = makeUniqueId(
        'match',
        `${matchDraft.homeTeamId}-${matchDraft.awayTeamId}-${matchDraft.date}`,
        new Set(
          [...currentData.matches, ...currentData.knockoutMatches].map((match) => match.id),
        ),
      )
      const match = {
        id,
        stage: matchDraft.stage,
        group: matchDraft.stage === 'Group' ? matchDraft.group : undefined,
        matchday: Number(matchDraft.matchday),
        date: matchDraft.date,
        time: matchDraft.time,
        venue: matchDraft.venue.trim(),
        homeTeamId: matchDraft.homeTeamId || undefined,
        awayTeamId: matchDraft.awayTeamId || undefined,
        homeScore: normalizeScore(matchDraft.homeScore),
        awayScore: normalizeScore(matchDraft.awayScore),
        status: matchDraft.status,
        minute: matchDraft.minute === '' ? undefined : Number(matchDraft.minute),
      }
      const key = match.stage === 'Group' ? 'matches' : 'knockoutMatches'

      return {
        ...currentData,
        [key]: [...currentData[key], match],
        lineups:
          match.homeTeamId && match.awayTeamId
            ? {
                ...currentData.lineups,
                [id]: {
                  home: makeLineupForTeam(match.homeTeamId, currentData.players),
                  away: makeLineupForTeam(match.awayTeamId, currentData.players),
                },
              }
            : currentData.lineups,
      }
    })
  }

  function handleResetData() {
    setTournamentData(defaultTournamentData)
    window.localStorage.removeItem(storageKey)
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#14201b]">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <section className="border-b border-[#dce1d7] bg-[#163428] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="flex min-w-0 flex-col justify-between gap-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#cfe7d8]">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1">
                <CircleDot className="h-4 w-4 text-[#ffdb70]" />
                Group stage
              </span>
              <span>{teams.length} teams</span>
              <span>{groups.length} groups</span>
              <span>Top 2 qualify</span>
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                Deir Hanna Local World Cup
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8eadf] sm:text-base">
                Tournament control board for fixtures, live scores, group tables,
                player rankings, and the knockout path.
              </p>
            </div>
          </div>
          <LiveMatch match={liveMatch} teams={teams} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeView === 'overview' && (
          <Overview
            knockoutMatches={knockoutMatches}
            leaderboards={leaderboards}
            latestResults={latestResults}
            lineups={lineups}
            liveMatch={liveMatch}
            onPlayerSelect={setSelectedPlayerId}
            onVote={handleVote}
            playersById={playersById}
            standings={standings}
            stats={stats}
            teams={teams}
            upcomingMatches={upcomingMatches}
            votes={votes}
          />
        )}
        {activeView === 'teams' && (
          <TeamsBoard
            onPlayerSelect={setSelectedPlayerId}
            playersByTeam={playersByTeam}
            teams={teams}
          />
        )}
        {activeView === 'matches' && (
          <MatchesBoard
            lineups={lineups}
            matches={allMatches}
            onVote={handleVote}
            playersById={playersById}
            teams={teams}
            votes={votes}
          />
        )}
        {activeView === 'tables' && (
          <TablesBoard
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            standings={standings}
          />
        )}
        {activeView === 'leaders' && (
          <LeadersBoard leaderboards={leaderboards} onPlayerSelect={setSelectedPlayerId} />
        )}
        {activeView === 'admin' && (
          <AdminBoard
            adminUnlocked={adminUnlocked}
            allMatches={allMatches}
            setAdminUnlocked={setAdminUnlocked}
            onAddMatch={handleAddMatch}
            onAddPlayer={handleAddPlayer}
            onAddTeam={handleAddTeam}
            onResetData={handleResetData}
            onSaveMatch={handleSaveMatch}
            players={players}
            teams={teams}
          />
        )}
      </section>
      <PlayerDetailsModal
        allMatches={allMatches}
        onClose={() => setSelectedPlayerId(null)}
        player={playersById[selectedPlayerId]}
        teams={teams}
      />
    </main>
  )
}

function Header({ activeView, setActiveView }) {
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
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Main views">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                  isActive
                    ? 'border-[#163428] bg-[#163428] text-white'
                    : 'border-[#d4dace] bg-white text-[#34433a] hover:border-[#9cb4a5]'
                }`}
                onClick={() => setActiveView(item.id)}
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

function Overview({
  knockoutMatches,
  leaderboards,
  latestResults,
  lineups,
  liveMatch,
  onPlayerSelect,
  onVote,
  playersById,
  standings,
  stats,
  teams,
  upcomingMatches,
  votes,
}) {
  return (
    <div className="grid gap-6">
      <ViewerFocus
        latestResults={latestResults}
        lineups={lineups}
        liveMatch={liveMatch}
        onVote={onVote}
        playersById={playersById}
        standings={standings}
        teams={teams}
        upcomingMatches={upcomingMatches}
        votes={votes}
      />
      <StatsGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <GroupSnapshot standings={standings} />
        <TopContributors
          onPlayerSelect={onPlayerSelect}
          players={leaderboards.contributions.slice(0, 5)}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <UpcomingPanel
          matches={upcomingMatches.slice(0, 6)}
          onVote={onVote}
          teams={teams}
          votes={votes}
        />
        <MatchTimeline match={liveMatch} teams={teams} />
      </div>
      <KnockoutPanel matches={knockoutMatches} teams={teams} />
    </div>
  )
}

function ViewerFocus({
  latestResults,
  lineups,
  liveMatch,
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
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader
          icon={focusMatch?.status === 'live' ? Timer : CalendarDays}
          title={focusMatch?.status === 'live' ? 'Live Now' : 'Next Match'}
          detail={focusMatch ? `${formatDate(focusMatch.date)} / ${focusMatch.time}` : 'Schedule'}
        />
        <div className="border-t border-[#e5e9e0] p-4">
          {focusMatch ? (
            <FocusMatchCard
              match={focusMatch}
              onVote={onVote}
              teams={teams}
              votes={votes}
            />
          ) : (
            <EmptyState text="No match scheduled yet." />
          )}
        </div>
      </div>
      <div className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Trophy} title="Qualification Race" detail="Current top two" />
        <div className="grid gap-2 border-t border-[#e5e9e0] p-4">
          {groups.map((group) => (
            <QualificationRow key={group} group={group} rows={standings[group] ?? []} />
          ))}
        </div>
      </div>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm lg:col-span-2">
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

function FocusMatchCard({ match, onVote, teams, votes }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const goals = (match.events ?? []).filter((event) => event.type === 'goal').length

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-[#f8faf5] p-4">
        <TeamBlock team={home} align="right" />
        <ScoreCell match={match} />
        <TeamBlock team={away} />
      </div>
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

function QualificationRow({ group, rows }) {
  const leaders = rows.slice(0, 2)

  return (
    <div className="grid min-h-12 grid-cols-[64px_1fr] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold uppercase text-[#65756b]">Group {group}</span>
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

function TeamsBoard({ onPlayerSelect, playersByTeam, teams }) {
  const [groupFilter, setGroupFilter] = useState('All')
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [activeTeamTab, setActiveTeamTab] = useState('overview')
  const filters = ['All', ...groups]
  const visibleTeams = teams.filter((team) => groupFilter === 'All' || team.group === groupFilter)
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  return (
    <div className="grid gap-4">
      <Toolbar title="Teams & Squads" icon={Users}>
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              groupFilter === item
                ? 'border-[#163428] bg-[#163428] text-white'
                : 'border-[#d4dace] bg-white text-[#34433a]'
            }`}
            onClick={() => setGroupFilter(item)}
          >
            {item === 'All' ? 'All' : `Group ${item}`}
          </button>
        ))}
      </Toolbar>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleTeams.map((team) => (
          <TeamCard
            key={team.id}
            players={playersByTeam[team.id] ?? []}
            onClick={() => {
              setSelectedTeamId(team.id)
              setActiveTeamTab('overview')
            }}
            team={team}
          />
        ))}
      </div>
      <TeamDetailsModal
        activeTab={activeTeamTab}
        onClose={() => setSelectedTeamId(null)}
        onPlayerSelect={onPlayerSelect}
        setActiveTab={setActiveTeamTab}
        players={selectedTeam ? playersByTeam[selectedTeam.id] ?? [] : []}
        team={selectedTeam}
      />
    </div>
  )
}

function TeamCard({ onClick, team, players }) {
  return (
    <button
      type="button"
      className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white text-left shadow-sm transition hover:border-[#9cb4a5] hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <FlagMark team={team} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#14201b]">{team.country}</h2>
            <p className="truncate text-xs text-[#65756b]">
              Group {team.group} / {players.length} players
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
      <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#14201b]">{value}</p>
    </div>
  )
}

function TeamDetailsModal({
  activeTab,
  onClose,
  onPlayerSelect,
  players,
  setActiveTab,
  team,
}) {
  if (!team) {
    return null
  }

  const starters = players.slice(0, starterCount)
  const bench = players.slice(starterCount, maxSquadPlayers)
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'squad', label: 'Squad' },
  ]

  return (
    <ModalShell onClose={onClose} title={team.country}>
      <div className="flex flex-wrap gap-2 border-b border-[#e5e9e0] px-4 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-[#163428] bg-[#163428] text-white'
                : 'border-[#d4dace] bg-white text-[#34433a]'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="grid gap-4 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#f8faf5] p-4">
            <FlagMark team={team} />
            <div>
              <p className="font-semibold text-[#14201b]">{team.country}</p>
              <p className="text-sm text-[#65756b]">
                Group {team.group} / {players.length} of {maxSquadPlayers} players
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminMetric label="Starters" value={starters.length} />
            <AdminMetric label="Bench" value={bench.length} />
            <AdminMetric label="Open slots" value={maxSquadPlayers - players.length} />
          </div>
        </div>
      )}
      {activeTab === 'squad' && (
        <div className="grid gap-4 p-4">
          <SquadSection
            onPlayerSelect={onPlayerSelect}
            players={starters}
            title="Starting Seven"
          />
          <SquadSection onPlayerSelect={onPlayerSelect} players={bench} title="Bench" />
        </div>
      )}
    </ModalShell>
  )
}

function SquadSection({ onPlayerSelect, players, title }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-[#65756b]">{title}</h3>
        <span className="text-xs font-semibold text-[#65756b]">{players.length}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            onClick={() => onPlayerSelect(player.id)}
            player={player}
          />
        ))}
      </div>
    </section>
  )
}

function PlayerCard({ onClick, player }) {
  return (
    <button
      type="button"
      className="grid min-h-14 grid-cols-[42px_1fr_auto] items-center gap-3 rounded-lg border border-[#dce1d7] bg-white px-3 text-left transition hover:border-[#9cb4a5]"
      onClick={onClick}
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#eef3e9] text-xs font-semibold text-[#34433a]">
        {player.number}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#14201b]">{player.name}</span>
        <span className="block truncate text-xs text-[#65756b]">
          {player.goals} G / {player.assists} A
        </span>
      </span>
      <span className="rounded-md bg-[#f8faf5] px-2 py-1 text-xs font-semibold text-[#65756b]">
        {player.position}
      </span>
    </button>
  )
}

function PlayerDetailsModal({ allMatches, onClose, player, teams }) {
  if (!player) {
    return null
  }

  const team = teams.find((item) => item.id === player.teamId)
  const scoringHistory = allMatches
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
  const playedMatches = allMatches
    .filter(
      (match) =>
        match.homeTeamId === player.teamId ||
        match.awayTeamId === player.teamId,
    )
    .filter((match) => ['final', 'live'].includes(match.status))
    .slice(0, 5)
  const nextGames = getUpcomingMatches(
    allMatches.filter(
      (match) =>
        match.homeTeamId === player.teamId ||
        match.awayTeamId === player.teamId,
    ),
  ).slice(0, 3)

  return (
    <ModalShell onClose={onClose} title={player.name}>
      <div className="grid gap-4 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-[#f8faf5] p-4">
          {team && <FlagMark team={team} />}
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#14201b]">{player.name}</p>
            <p className="truncate text-sm text-[#65756b]">
              {team?.country} / #{player.number} / {player.position}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetric label="Goals" value={player.goals} />
          <AdminMetric label="Assists" value={player.assists} />
          <AdminMetric label="G + A" value={player.goals + player.assists} />
        </div>
        <ModalSection title="History">
          {scoringHistory.length ? (
            scoringHistory.map((event) => (
              <EventDetailRow key={`${event.match.id}-${event.minute}-${event.contribution}`} event={event} teams={teams} />
            ))
          ) : (
            <EmptyState text="No goals or assists recorded yet." />
          )}
        </ModalSection>
        <ModalSection title="Recent Matches">
          {playedMatches.length ? (
            playedMatches.map((match) => <CompactMatchDetail key={match.id} match={match} teams={teams} />)
          ) : (
            <EmptyState text="No match history yet." />
          )}
        </ModalSection>
        <ModalSection title="Next Games">
          {nextGames.length ? (
            nextGames.map((match) => <CompactMatchDetail key={match.id} match={match} teams={teams} />)
          ) : (
            <EmptyState text="No upcoming games scheduled." />
          )}
        </ModalSection>
      </div>
    </ModalShell>
  )
}

function ModalShell({ children, onClose, title }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#14201b]/55 px-4 py-6"
      onClick={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#e5e9e0] px-4">
          <h2 className="truncate text-base font-semibold text-[#14201b]">{title}</h2>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md border border-[#d4dace] bg-white text-[#34433a]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-56px)] overflow-y-auto">{children}</div>
      </section>
    </div>
  )
}

function ModalSection({ children, title }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase text-[#65756b]">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </section>
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
    <div className="grid min-h-12 grid-cols-[42px_1fr_auto] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
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

function CompactMatchDetail({ match, teams }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')

  return (
    <div className="grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <TeamMini team={home} align="right" />
      <ScoreCell match={match} />
      <TeamMini team={away} />
    </div>
  )
}

function StatsGrid({ stats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = statIcons[index] ?? BarChart3

        return (
          <div
            key={stat.label}
            className="rounded-lg border border-[#dce1d7] bg-white px-4 py-4 shadow-sm"
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
    <div className="rounded-lg border border-white/15 bg-white text-[#14201b] shadow-md">
      <div className="flex items-center justify-between border-b border-[#e5e9e0] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
          <p className="mt-1 text-sm text-[#34433a]">
            {detail}
          </p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
        <TeamBlock team={home} align="right" />
        <div className="min-w-24 rounded-lg bg-[#14201b] px-4 py-3 text-center text-white">
          <p className="text-3xl font-semibold leading-none">
            {match.homeScore}-{match.awayScore}
          </p>
          <p className="mt-1 text-xs text-[#cfe7d8]">Now</p>
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
      className={`inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold uppercase ${
        styles[status] ?? styles.scheduled
      }`}
    >
      {status}
    </span>
  )
}

function GroupSnapshot({ standings }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Table2} title="Group Tables" detail="Top two advance" />
      <div className="grid border-t border-[#e5e9e0] md:grid-cols-2">
        {groups.map((group) => (
          <div key={group} className="border-b border-[#e5e9e0] p-4 md:border-r">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Group {group}</h2>
              <span className="text-xs font-semibold text-[#65756b]">P / GD / PTS</span>
            </div>
            <div className="grid gap-2">
              {standings[group].map((row) => (
                <CompactStandingRow key={row.team.id} row={row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CompactStandingRow({ row }) {
  return (
    <div className="grid min-h-12 grid-cols-[28px_1fr_auto] items-center gap-3 rounded-md bg-[#f8faf5] px-3">
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
    </div>
  )
}

function TopContributors({ onPlayerSelect, players }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
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

function UpcomingPanel({ matches, onVote, teams, votes }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={CalendarDays} title="Upcoming Matches" detail="Schedule" />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {matches.length ? (
          matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
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
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Clock} title="Match Timeline" detail={detail} />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
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

function MatchesBoard({ lineups, matches, onVote, playersById, teams, votes }) {
  const [filter, setFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [openMatchId, setOpenMatchId] = useState(
    matches.find((match) => lineups[match.id])?.id ?? null,
  )
  const filters = ['All', 'Group', 'Knockout', 'Live']
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const visibleMatches = matches.filter((match) => {
    const home = getMatchTeam(match, teams, 'home')
    const away = getMatchTeam(match, teams, 'away')
    const text = [
      home.country,
      home.code,
      away.country,
      away.code,
      match.stage,
      match.group,
      match.venue,
      match.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = !normalizedSearchTerm || text.includes(normalizedSearchTerm)

    if (!matchesSearch) return false
    if (filter === 'All') return true
    if (filter === 'Knockout') return match.stage !== 'Group'
    if (filter === 'Live') return match.status === 'live'
    return match.stage === filter
  })

  return (
    <div className="grid gap-4">
      <Toolbar title="Matches" icon={CalendarDays}>
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              filter === item
                ? 'border-[#163428] bg-[#163428] text-white'
                : 'border-[#d4dace] bg-white text-[#34433a]'
            }`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </Toolbar>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65756b]" />
        <input
          className="min-h-11 w-full rounded-lg border border-[#d4dace] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7]"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search matches by team, stage, venue, or status"
          value={searchTerm}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#65756b]">
        <span>
          Showing {visibleMatches.length} of {matches.length} matches
        </span>
        {normalizedSearchTerm && (
          <button
            type="button"
            className="rounded-md border border-[#d4dace] bg-white px-3 py-1.5 text-xs font-semibold text-[#34433a]"
            onClick={() => setSearchTerm('')}
          >
            Clear search
          </button>
        )}
      </div>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <div className="divide-y divide-[#e5e9e0]">
          {visibleMatches.length ? (
            visibleMatches.map((match) => {
              const matchOpen = openMatchId === match.id

              return (
                <div key={match.id}>
                  <MatchRow
                    match={match}
                    expanded
                    matchOpen={matchOpen}
                    onVote={onVote}
                    onToggleDetails={() =>
                      setOpenMatchId((currentId) =>
                        currentId === match.id ? null : match.id,
                      )
                    }
                    teams={teams}
                  />
                  {matchOpen && (
                    <MatchDetailsPanel
                      lineups={lineups}
                      match={match}
                      onVote={onVote}
                      playersById={playersById}
                      teams={teams}
                      votes={votes}
                    />
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-4">
              <EmptyState text="No matches match the current search." />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MatchRow({
  match,
  expanded = false,
  matchOpen = false,
  onVote,
  onToggleDetails,
  teams,
  votes,
}) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const goalCount = (match.events ?? []).filter((event) => event.type === 'goal').length
  const clickableProps = expanded
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onToggleDetails,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleDetails?.()
          }
        },
      }
    : {}

  return (
    <article
      className={`${expanded ? 'cursor-pointer transition hover:bg-[#fbfdf9]' : ''}`}
      {...clickableProps}
    >
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#14201b]">
            {match.stage}
            {match.group ? ` ${match.group}` : ''}
          </p>
          <p className="mt-1 text-xs text-[#65756b]">
            {formatDate(match.date)} / {match.time}
          </p>
          {expanded && <p className="mt-1 truncate text-xs text-[#65756b]">{match.venue}</p>}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamMini team={home} align="right" />
          <ScoreCell match={match} />
          <TeamMini team={away} />
        </div>
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <StatusPill status={match.status} />
          {goalCount > 0 && (
            <span className="inline-flex min-h-7 items-center rounded-md bg-[#eef3e9] px-2.5 text-xs font-semibold text-[#34433a]">
              {goalCount} goals
            </span>
          )}
          {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
            <VoteSummaryPill match={match} votes={votes} />
          )}
          {expanded && (
            <button
              type="button"
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${
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

function getVoteBreakdown(votes, matchId) {
  const matchVotes = votes?.[matchId] ?? { home: 0, away: 0, userChoice: null }
  const homeVotes = matchVotes.home ?? 0
  const awayVotes = matchVotes.away ?? 0
  const totalVotes = homeVotes + awayVotes
  const homePercent = totalVotes ? Math.round((homeVotes / totalVotes) * 100) : 0
  const awayPercent = totalVotes ? 100 - homePercent : 0

  return {
    awayPercent,
    awayVotes,
    homePercent,
    homeVotes,
    totalVotes,
    userChoice: matchVotes.userChoice ?? null,
  }
}

function VoteSummaryPill({ match, votes }) {
  const breakdown = getVoteBreakdown(votes, match.id)

  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-[#e7f3ec] px-2.5 text-xs font-semibold text-[#17633f]">
      {breakdown.totalVotes ? `${breakdown.homePercent}% - ${breakdown.awayPercent}%` : 'Vote'}
    </span>
  )
}

function PredictionVote({ compact = false, match, onVote, teams, votes }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const breakdown = getVoteBreakdown(votes, match.id)

  return (
    <section
      className={`rounded-lg border border-[#dce1d7] bg-white ${
        compact ? 'p-3' : 'p-4'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#14201b]">Who will win?</h3>
          <p className="text-xs text-[#65756b]">
            {breakdown.totalVotes
              ? `${breakdown.totalVotes} vote${breakdown.totalVotes === 1 ? '' : 's'}`
              : 'Be first to vote'}
          </p>
        </div>
        {breakdown.totalVotes > 0 && (
          <span className="rounded-md bg-[#eef3e9] px-2.5 py-1 text-xs font-semibold text-[#34433a]">
            {breakdown.homePercent}% - {breakdown.awayPercent}%
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <VoteTeamButton
          active={breakdown.userChoice === 'home'}
          onClick={() => onVote?.(match.id, 'home')}
          percent={breakdown.homePercent}
          team={home}
          votes={breakdown.homeVotes}
        />
        <span className="hidden text-center text-xs font-semibold uppercase text-[#65756b] sm:block">
          vs
        </span>
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

function VoteTeamButton({ active, align = 'left', onClick, percent, team, votes }) {
  return (
    <button
      type="button"
      className={`relative min-h-16 overflow-hidden rounded-lg border px-3 py-3 text-left transition ${
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
        className={`relative z-10 flex items-center gap-3 ${
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
    <div className="grid gap-4 border-t border-[#e5e9e0] bg-[#fbfdf9] px-4 py-4">
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
    <section className="rounded-lg border border-[#dce1d7] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
        <div>
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
    <div className="grid min-h-12 grid-cols-[42px_30px_1fr] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
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
    <div className="grid gap-4 lg:grid-cols-2">
      <LineupTeamColumn lineup={homeLineup} side="home" team={home} />
      <LineupTeamColumn lineup={awayLineup} side="away" team={away} />
    </div>
  )
}

function LineupTeamColumn({ team, lineup, side }) {
  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
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
    <li className="grid min-h-10 grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md bg-[#f8faf5] px-3">
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

function TeamMini({ team, align = 'left' }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === 'right' ? 'justify-end text-right' : ''
      }`}
    >
      {align === 'right' && (
        <span className="min-w-0 truncate text-sm font-medium">{team.country}</span>
      )}
      <FlagMark team={team} small />
      {align !== 'right' && (
        <span className="min-w-0 truncate text-sm font-medium">{team.country}</span>
      )}
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

function TablesBoard({ selectedGroup, setSelectedGroup, standings }) {
  return (
    <div className="grid gap-4">
      <Toolbar title="Group Tables" icon={Table2}>
        {groups.map((group) => (
          <button
            key={group}
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-md border text-sm font-semibold ${
              selectedGroup === group
                ? 'border-[#163428] bg-[#163428] text-white'
                : 'border-[#d4dace] bg-white text-[#34433a]'
            }`}
            onClick={() => setSelectedGroup(group)}
            aria-label={`Show group ${group}`}
          >
            {group}
          </button>
        ))}
      </Toolbar>
      <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[#eef3e9] text-xs uppercase text-[#65756b]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-3 py-3 text-center font-semibold">P</th>
                <th className="px-3 py-3 text-center font-semibold">W</th>
                <th className="px-3 py-3 text-center font-semibold">D</th>
                <th className="px-3 py-3 text-center font-semibold">L</th>
                <th className="px-3 py-3 text-center font-semibold">GF</th>
                <th className="px-3 py-3 text-center font-semibold">GA</th>
                <th className="px-3 py-3 text-center font-semibold">GD</th>
                <th className="px-4 py-3 text-center font-semibold">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9e0]">
              {standings[selectedGroup].map((row) => (
                <tr key={row.team.id} className={row.qualified ? 'bg-[#fbfdf9]' : ''}>
                  <td className="px-4 py-4">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
                        row.qualified
                          ? 'bg-[#dff1e6] text-[#17633f]'
                          : 'bg-[#ecefe8] text-[#65756b]'
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <FlagMark team={row.team} small />
                      <div>
                        <p className="font-semibold text-[#14201b]">{row.team.country}</p>
                        <p className="text-xs text-[#65756b]">{row.team.code}</p>
                      </div>
                    </div>
                  </td>
                  <StatCell value={row.played} />
                  <StatCell value={row.won} />
                  <StatCell value={row.drawn} />
                  <StatCell value={row.lost} />
                  <StatCell value={row.goalsFor} />
                  <StatCell value={row.goalsAgainst} />
                  <StatCell
                    value={`${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}`}
                  />
                  <td className="px-4 py-4 text-center text-base font-semibold text-[#14201b]">
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

function StatCell({ value }) {
  return <td className="px-3 py-4 text-center font-medium text-[#34433a]">{value}</td>
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
      className="grid min-h-16 w-full grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#fbfdf9]"
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
  const quarterFinals = matches.filter((match) => match.stage === 'Quarter-final')
  const semiFinals = matches.filter((match) => match.stage === 'Semi-final')
  const finalMatch = matches.find((match) => match.stage === 'Final')
  const leftQuarters = quarterFinals.slice(0, 2)
  const rightQuarters = quarterFinals.slice(2, 4)
  const leftTeams = leftQuarters.flatMap((match) => [
    getNeutralTeamLabel(match, teams, 'home'),
    getNeutralTeamLabel(match, teams, 'away'),
  ])
  const rightTeams = rightQuarters.flatMap((match) => [
    getNeutralTeamLabel(match, teams, 'home'),
    getNeutralTeamLabel(match, teams, 'away'),
  ])

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Trophy} title="Knockout Path" detail="Single-game bracket" />
      <div className="knockout-path border-t border-[#e5e9e0] p-4">
        <TeamPathColumn labels={leftTeams} side="left" />
        <BracketRound
          matches={leftQuarters}
          pathOnly
          side="left"
          teams={teams}
          title="Quarter-finals"
        />
        <BracketRound
          center
          matches={semiFinals.slice(0, 1)}
          side="left"
          teams={teams}
          title="Semi-final"
        />
        <FinalNode match={finalMatch} teams={teams} />
        <BracketRound
          center
          matches={semiFinals.slice(1, 2)}
          side="right"
          teams={teams}
          title="Semi-final"
        />
        <BracketRound
          matches={rightQuarters}
          pathOnly
          side="right"
          teams={teams}
          title="Quarter-finals"
        />
        <TeamPathColumn labels={rightTeams} side="right" />
      </div>
    </section>
  )
}

function getNeutralTeamLabel(match, teams, side) {
  const team = getMatchTeam(match, teams, side)
  return team.country
}

function TeamPathColumn({ labels, side }) {
  return (
    <div className={`team-path-column ${side}`}>
      {labels.map((label, index) => (
        <PlaceholderTeam key={`${label}-${index}`} label={label} />
      ))}
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

function createNewMatchDraft(teams) {
  return {
    stage: 'Group',
    group: 'A',
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
    group: match.group ?? 'A',
    matchday: match.matchday ?? 1,
    homeTeamId: match.homeTeamId ?? '',
    awayTeamId: match.awayTeamId ?? '',
    homeScore: match.homeScore ?? '',
    awayScore: match.awayScore ?? '',
    minute: match.minute ?? '',
  }
}

function AdminBoard({
  adminUnlocked,
  allMatches,
  onAddMatch,
  onAddPlayer,
  onAddTeam,
  onResetData,
  onSaveMatch,
  players,
  setAdminUnlocked,
  teams,
}) {
  const [teamDraft, setTeamDraft] = useState({
    country: '',
    code: '',
    group: 'A',
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

  function submitTeam(event) {
    event.preventDefault()

    if (!teamDraft.country.trim() || !teamDraft.code.trim()) {
      return
    }

    onAddTeam(teamDraft)
    setTeamDraft((draft) => ({ ...draft, country: '', code: '' }))
  }

  function submitPlayer(event) {
    event.preventDefault()

    if (!playerDraft.name.trim() || !effectivePlayerTeamId) {
      return
    }

    onAddPlayer({ ...playerDraft, teamId: effectivePlayerTeamId })
    setPlayerDraft((draft) => ({
      ...draft,
      name: '',
      number: Number(draft.number) + 1,
    }))
  }

  function submitNewMatch(event) {
    event.preventDefault()
    onAddMatch(newMatchDraft)
    setNewMatchDraft(createNewMatchDraft(teams))
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={LockKeyhole} title="Admin Access" detail="Control panel" />
          <div className="grid gap-4 border-t border-[#e5e9e0] p-4">
            <label className="grid gap-2 text-sm font-medium text-[#34433a]">
              Admin code
              <input
                className="min-h-11 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-3 outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7]"
                placeholder="Tournament PIN"
                type="password"
              />
            </label>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white"
              onClick={() => setAdminUnlocked((value) => !value)}
            >
              <LockKeyhole className="h-4 w-4" />
              {adminUnlocked ? 'Lock panel' : 'Unlock demo'}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#d4dace] bg-white px-4 text-sm font-semibold text-[#34433a]"
              disabled={disabled}
              onClick={onResetData}
            >
              Reset data
            </button>
            <div className="grid grid-cols-2 gap-3">
              <AdminMetric label="Teams" value={teams.length} />
              <AdminMetric label="Players" value={players.length} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={ShieldCheck} title="Add Team" detail="Tournament setup" />
          <form className="grid gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitTeam}>
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
              <AdminSelect
                disabled={disabled}
                label="Group"
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, group: value }))}
                options={groups.map((group) => ({ label: group, value: group }))}
                value={teamDraft.group}
              />
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

        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Users} title="Add Player" detail="Squad management" />
          <form className="grid gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitPlayer}>
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

        <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title="Add Match" detail="Fixture setup" />
          <form className="grid gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitNewMatch}>
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

      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Smartphone} title="Version Roadmap" detail="MVP first" />
        <div className="grid gap-3 border-t border-[#e5e9e0] p-4 md:grid-cols-3">
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
    <div className="grid gap-4">
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label="Stage"
          onChange={(value) => updateDraft('stage', value)}
          options={stageOptions}
          value={draft.stage}
        />
        <AdminSelect
          disabled={disabled || draft.stage !== 'Group'}
          label="Group"
          onChange={(value) => updateDraft('group', value)}
          options={groups.map((group) => ({ label: group, value: group }))}
          value={draft.group}
        />
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

  function submitEditMatch(event) {
    event.preventDefault()

    if (!draft) {
      return
    }

    onSaveMatch(draft)
  }

  return (
    <form className="grid gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitEditMatch}>
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
      <AdminSubmit disabled={disabled || !draft} icon={Save} label="Save match" />
    </form>
  )
}

function AdminMetric({ label, value }) {
  return (
    <div className="rounded-md bg-[#eef3e9] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight text-[#14201b]">
        {value}
      </p>
    </div>
  )
}

function FieldGrid({ children }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
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
    <label className="grid gap-2 text-sm font-medium text-[#34433a]">
      {label}
      <input
        className="min-h-11 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-3 outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7] disabled:bg-[#eef1ea]"
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  )
}

function AdminSelect({ disabled, label, onChange, options, value }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#34433a]">
      {label}
      <select
        className="min-h-11 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-3 outline-none transition focus:border-[#1f6d4d] focus:ring-2 focus:ring-[#b8dcc7] disabled:bg-[#eef1ea]"
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#163428] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold text-[#14201b]">{title}</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">{children}</div>
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
