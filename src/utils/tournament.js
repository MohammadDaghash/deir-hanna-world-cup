import { getTeamGroupCode, tournamentFormat } from '../config/tournamentFormat.js'
import { isStandingMatch, liveEventTypes, normalizeMatchDisciplineEvents } from './liveMatch.js'

export function getTeam(teams, teamId) {
  return teams.find((team) => team.id === teamId)
}

function compareMatchesBySchedule(a, b) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
}

function matchIncludesTeam(match, teamId) {
  return match.homeTeamId === teamId || match.awayTeamId === teamId
}

function getNextTeamMatch(matches, currentMatch, teamId) {
  const currentKey = `${currentMatch.date} ${currentMatch.time} ${currentMatch.id}`

  return matches.find((match) => {
    const matchKey = `${match.date} ${match.time} ${match.id}`

    return matchKey > currentKey && matchIncludesTeam(match, teamId)
  })
}

function createEmptySuspension(playerId) {
  return {
    match: null,
    matchId: null,
    playerId,
    reasons: [],
    suspended: false,
  }
}

function getHeadToHeadResult(matches, teamAId, teamBId) {
  const headToHeadMatches = matches.filter(
    (match) =>
      isStandingMatch(match) &&
      [match.homeTeamId, match.awayTeamId].includes(teamAId) &&
      [match.homeTeamId, match.awayTeamId].includes(teamBId),
  )

  if (!headToHeadMatches.length) {
    return { decisive: false, draw: false, winnerId: null }
  }

  const totals = headToHeadMatches.reduce(
    (result, match) => {
      const teamAIsHome = match.homeTeamId === teamAId
      const teamAGoals = teamAIsHome ? match.homeScore : match.awayScore
      const teamBGoals = teamAIsHome ? match.awayScore : match.homeScore

      result.teamAGoals += teamAGoals
      result.teamBGoals += teamBGoals
      return result
    },
    { teamAGoals: 0, teamBGoals: 0 },
  )

  if (totals.teamAGoals > totals.teamBGoals) {
    return { decisive: true, draw: false, winnerId: teamAId }
  }

  if (totals.teamBGoals > totals.teamAGoals) {
    return { decisive: true, draw: false, winnerId: teamBId }
  }

  return { decisive: false, draw: true, winnerId: null }
}

function pointsTieGroups(rows) {
  return rows.reduce((groups, row) => {
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup[0].points === row.points) {
      lastGroup.push(row)
      return groups
    }

    groups.push([row])
    return groups
  }, [])
}

function groupCrossesQualificationBoundary(group, rows) {
  const startIndex = rows.indexOf(group[0])
  const endIndex = startIndex + group.length - 1
  const boundaryIndex = tournamentFormat.qualifyingTeamsPerGroup - 1

  return startIndex <= boundaryIndex && endIndex > boundaryIndex
}

function shouldRequireQualificationRematch(group, matches) {
  if (group.length === 2) {
    return getHeadToHeadResult(matches, group[0].team.id, group[1].team.id).draw
  }

  return group.some((row, rowIndex) =>
    group.slice(rowIndex + 1).some((nextRow) =>
      getHeadToHeadResult(matches, row.team.id, nextRow.team.id).draw,
    ),
  )
}

function getPlayerByEvent(playersById, players, event) {
  if (event.playerId && playersById[event.playerId]) {
    return playersById[event.playerId]
  }

  const eventName = event.player?.trim()

  if (!eventName) {
    return null
  }

  return players.find((player) =>
    [player.name, player.nameEn, player.nameHe, player.nameAr]
      .filter(Boolean)
      .some((name) => name === eventName),
  ) ?? null
}

export function getMatchTeam(match, teams, side) {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  const fallback = side === 'home' ? match.homeLabel : match.awayLabel

  return teamId
    ? getTeam(teams, teamId)
    : {
        country: fallback || 'TBD',
        code: fallback || 'TBD',
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

function getStandingScore(match, side) {
  const value = side === 'home' ? match.homeScore : match.awayScore

  if (match.status === 'live') {
    return Number.isFinite(Number(value)) ? Number(value) : 0
  }

  return value
}

function isLiveStandingMatch(match) {
  return (
    match.status === 'live' &&
    Boolean(match.homeTeamId) &&
    Boolean(match.awayTeamId)
  )
}

export function calculateStandings(teams, matches) {
  const standingMatches = matches.filter((match) => isStandingMatch(match) || isLiveStandingMatch(match))
  const standings = Object.fromEntries(
    tournamentFormat.groupKeys.map((groupKey) => [groupKey, []]),
  )

  teams.forEach((team) => {
    const groupCode = getTeamGroupCode(team)

    if (!standings[groupCode]) {
      standings[groupCode] = []
    }

    standings[groupCode].push({
      team,
      group: groupCode,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      live: false,
      liveMatchIds: [],
      provisional: false,
      rematchReason: '',
      rematchRequired: false,
    })
  })

  const rowsByTeam = Object.values(standings)
    .flat()
    .reduce((rows, row) => {
      rows[row.team.id] = row
      return rows
    }, {})

  standingMatches.forEach((match) => {
    const home = rowsByTeam[match.homeTeamId]
    const away = rowsByTeam[match.awayTeamId]

    if (!home || !away || home.group !== away.group) {
      return
    }

    home.played += 1
    away.played += 1
    const homeScore = getStandingScore(match, 'home')
    const awayScore = getStandingScore(match, 'away')
    const provisional = match.status === 'live'

    if (provisional) {
      home.live = true
      home.provisional = true
      home.liveMatchIds.push(match.id)
      away.live = true
      away.provisional = true
      away.liveMatchIds.push(match.id)
    }

    home.goalsFor += homeScore
    home.goalsAgainst += awayScore
    away.goalsFor += awayScore
    away.goalsAgainst += homeScore

    if (homeScore > awayScore) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (homeScore < awayScore) {
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

  Object.values(standings).forEach((tableRows) => {
    tableRows.forEach((row) => {
      row.goalDifference = row.goalsFor - row.goalsAgainst
    })

    tableRows.sort(
      (a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points
        }

        const headToHead = getHeadToHeadResult(standingMatches, a.team.id, b.team.id)

        if (headToHead.decisive) {
          return headToHead.winnerId === a.team.id ? -1 : 1
        }

        return (
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor ||
          a.team.country.localeCompare(b.team.country)
        )
      },
    )

    pointsTieGroups(tableRows)
      .filter((group) => group.length > 1)
      .filter((group) => groupCrossesQualificationBoundary(group, tableRows))
      .filter((group) => shouldRequireQualificationRematch(group, standingMatches))
      .forEach((group) => {
        group.forEach((row) => {
          row.rematchRequired = true
          row.rematchReason = 'Qualification requires rematch.'
        })
      })

    tableRows.forEach((row, index) => {
      row.rank = index + 1
      row.qualified = index < tournamentFormat.qualifyingTeamsPerGroup
    })
  })

  return standings
}

export function getLeaderboards(players, teams) {
  const withTeams = players.map((player) => ({
    ...player,
    team: getTeam(teams, player.teamId),
  }))

  const sortByStat = (statKey, secondaryKey = 'goals') =>
    [...withTeams].sort(
      (a, b) =>
        b[statKey] - a[statKey] ||
        b[secondaryKey] - a[secondaryKey] ||
        a.name.localeCompare(b.name),
    )

  const byGoals = [...withTeams].sort(
    (a, b) =>
      b.goals - a.goals ||
      a.name.localeCompare(b.name),
  )

  return {
    goals: byGoals,
    yellowCards: sortByStat('yellowCards', 'redCards'),
    redCards: sortByStat('redCards', 'yellowCards'),
  }
}

export function getTeamGoalStats(matches, teams) {
  const rowsByTeam = Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        goalsConceded: 0,
        goalsScored: 0,
        team,
      },
    ]),
  )

  matches
    .filter(isScoredMatch)
    .forEach((match) => {
      const homeRow = rowsByTeam[match.homeTeamId]
      const awayRow = rowsByTeam[match.awayTeamId]

      if (!homeRow || !awayRow) {
        return
      }

      const homeScore = Number(match.homeScore ?? 0)
      const awayScore = Number(match.awayScore ?? 0)

      homeRow.goalsScored += homeScore
      homeRow.goalsConceded += awayScore
      awayRow.goalsScored += awayScore
      awayRow.goalsConceded += homeScore
    })

  const rows = Object.values(rowsByTeam)
  const scored = [...rows].sort(
    (a, b) =>
      b.goalsScored - a.goalsScored ||
      a.goalsConceded - b.goalsConceded ||
      a.team.country.localeCompare(b.team.country),
  )
  const conceded = [...rows].sort(
    (a, b) =>
      a.goalsConceded - b.goalsConceded ||
      b.goalsScored - a.goalsScored ||
      a.team.country.localeCompare(b.team.country),
  )

  return { conceded, scored }
}

export function getTeamEventTotals(players, teamId) {
  return players
    .filter((player) => player.teamId === teamId)
    .reduce(
      (totals, player) => {
        totals.goals += player.goals ?? 0
        totals.yellowCards += player.yellowCards ?? 0
        totals.redCards += player.redCards ?? 0
        return totals
      },
      {
        goals: 0,
        redCards: 0,
        yellowCards: 0,
      },
    )
}

export function calculateSuspensions(players, matches) {
  const sortedMatches = [...matches].sort(compareMatchesBySchedule)
  const playerById = Object.fromEntries(players.map((player) => [player.id, player]))
  const suspensions = Object.fromEntries(
    players.map((player) => [player.id, createEmptySuspension(player.id)]),
  )
  const yellowCounts = Object.fromEntries(players.map((player) => [player.id, 0]))
  const pendingSuspensions = {}

  function addPendingSuspension(player, match, reason) {
    const nextMatch = getNextTeamMatch(sortedMatches, match, player.teamId)

    if (!nextMatch) {
      return
    }

    if (!pendingSuspensions[player.id]) {
      pendingSuspensions[player.id] = {
        match: nextMatch,
        matchId: nextMatch.id,
        playerId: player.id,
        reasons: [],
        suspended: nextMatch.status !== 'final',
      }
    }

    if (!pendingSuspensions[player.id].reasons.includes(reason)) {
      pendingSuspensions[player.id].reasons.push(reason)
    }
  }

  sortedMatches.forEach((match) => {
    Object.entries(pendingSuspensions).forEach(([playerId, suspension]) => {
      if (suspension.matchId !== match.id) {
        return
      }

      if (match.status === 'final') {
        delete pendingSuspensions[playerId]
        suspensions[playerId] = createEmptySuspension(playerId)
        return
      }

      suspensions[playerId] = {
        ...suspension,
        match,
        suspended: true,
      }
    })

    normalizeMatchDisciplineEvents(match.events ?? []).forEach((event) => {
      const player = getPlayerByEvent(playerById, players, event)

      if (!player) {
        return
      }

      if (event.type === liveEventTypes.yellowCard) {
        yellowCounts[player.id] = (yellowCounts[player.id] ?? 0) + 1

        if (yellowCounts[player.id] >= 2) {
          addPendingSuspension(player, match, '2 yellow cards')
          yellowCounts[player.id] = 0
        }
      }

      if (event.type === liveEventTypes.redCard) {
        addPendingSuspension(player, match, 'red card')
      }
    })
  })

  Object.entries(pendingSuspensions).forEach(([playerId, suspension]) => {
    if (suspension.match?.status !== 'final') {
      suspensions[playerId] = suspension
    }
  })

  return suspensions
}

export function getPlayerSuspension(suspensions, playerId) {
  return suspensions[playerId] ?? createEmptySuspension(playerId)
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
