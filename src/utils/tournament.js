import { tournamentFormat } from '../config/tournamentFormat.js'

export function getTeam(teams, teamId) {
  return teams.find((team) => team.id === teamId)
}

export function getMatchTeam(match, teams, side) {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  const fallback = side === 'home' ? match.homeLabel : match.awayLabel

  return teamId
    ? getTeam(teams, teamId)
    : {
        country: fallback,
        code: 'TBD',
        color: '#bfc9bb',
        secondary: '#eef3e9',
      }
}

export function isScoredMatch(match) {
  return (
    ['final', 'live'].includes(match.status) &&
    Number.isFinite(match.homeScore) &&
    Number.isFinite(match.awayScore)
  )
}

export function calculateStandings(teams, matches) {
  const standings = {
    [tournamentFormat.tableKey]: teams.map((team) => ({
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })),
  }

  const rowsByTeam = standings[tournamentFormat.tableKey]
    .reduce((rows, row) => {
      rows[row.team.id] = row
      return rows
    }, {})

  matches.filter(isScoredMatch).forEach((match) => {
    const home = rowsByTeam[match.homeTeamId]
    const away = rowsByTeam[match.awayTeamId]

    if (!home || !away) {
      return
    }

    home.played += 1
    away.played += 1
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (match.homeScore < match.awayScore) {
      away.won += 1
      home.lost += 1
      away.points += 3
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  })

  const tableRows = standings[tournamentFormat.tableKey]

  tableRows.forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst
  })

  tableRows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.country.localeCompare(b.team.country),
  )

  tableRows.forEach((row, index) => {
    row.rank = index + 1
    row.qualified = index < tournamentFormat.qualifyingTeams
  })

  return standings
}

export function getLeaderboards(players, teams) {
  const withTeams = players.map((player) => ({
    ...player,
    team: getTeam(teams, player.teamId),
    contributions: player.goals + player.assists,
  }))

  const byGoals = [...withTeams].sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.name.localeCompare(b.name),
  )
  const byAssists = [...withTeams].sort(
    (a, b) =>
      b.assists - a.assists ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name),
  )
  const byContributions = [...withTeams].sort(
    (a, b) =>
      b.contributions - a.contributions ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name),
  )

  return {
    goals: byGoals,
    assists: byAssists,
    contributions: byContributions,
  }
}

export function getPlayersById(players) {
  return players.reduce((playersById, player) => {
    playersById[player.id] = player
    return playersById
  }, {})
}

export function getPlayersByTeam(players) {
  return players.reduce((playersByTeam, player) => {
    if (!playersByTeam[player.teamId]) {
      playersByTeam[player.teamId] = []
    }

    playersByTeam[player.teamId].push(player)
    playersByTeam[player.teamId].sort((a, b) => a.name.localeCompare(b.name))

    return playersByTeam
  }, {})
}

export function resolveLineup(lineup, playersById) {
  if (!lineup) {
    return null
  }

  return {
    formation: lineup.formation,
    starters: lineup.starters.map((playerId) => playersById[playerId]).filter(Boolean),
    bench: lineup.bench.map((playerId) => playersById[playerId]).filter(Boolean),
  }
}

export function getTournamentStats(matches, teams, players) {
  const scoredMatches = matches.filter(isScoredMatch)
  const goals = scoredMatches.reduce(
    (total, match) => total + match.homeScore + match.awayScore,
    0,
  )

  return [
    { label: 'Teams', value: teams.length },
    { label: 'Players', value: players.length },
    { label: 'Goals', value: goals },
    {
      label: 'Live',
      value: matches.filter((match) => match.status === 'live').length,
    },
  ]
}

export function getUpcomingMatches(matches) {
  return matches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
}
