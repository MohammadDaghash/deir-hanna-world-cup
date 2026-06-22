export const liveEventTypes = {
  assist: 'assist',
  goal: 'goal',
  ownGoal: 'own_goal',
  penalty: 'penalty',
  penaltyGoal: 'penalty_goal',
  penaltyMiss: 'penalty_miss',
  redCard: 'red_card',
  yellowCard: 'yellow_card',
}

export const matchPhases = {
  final: 'final',
  firstHalf: 'first_half',
  halftime: 'halftime',
  paused: 'paused',
  scheduled: 'scheduled',
  secondHalf: 'second_half',
}

const halfDurationMinutes = 20
const maxAddedMinutes = 5
const secondYellowReason = 'second_yellow'
const validEventTypes = new Set(Object.values(liveEventTypes))

function toIso(value) {
  return new Date(value).toISOString()
}

function toTimestamp(value) {
  return value ? new Date(value).getTime() : NaN
}

function normalizeScoreValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function getPlayerDisplayName(player) {
  return player?.nameEn || player?.name || ''
}

function getTeamIdForSide(match, teamSide) {
  return teamSide === 'away' ? match.awayTeamId : match.homeTeamId
}

function getOppositeTeamSide(teamSide) {
  return teamSide === 'away' ? 'home' : 'away'
}

function isScoreEvent(event) {
  return [liveEventTypes.goal, liveEventTypes.ownGoal, liveEventTypes.penaltyGoal].includes(event?.type)
}

function nullIfEmpty(value) {
  return value === '' || value === undefined ? null : value
}

function getEventPlayerKey(event) {
  return event?.playerId || event?.player?.trim() || ''
}

function createSecondYellowRedEvent(yellowEvent) {
  return {
    ...yellowEvent,
    automatic: true,
    assist: '',
    assistPlayerId: undefined,
    displayMinute: yellowEvent.displayMinute,
    eventPhase: yellowEvent.eventPhase,
    minute: yellowEvent.minute,
    player: yellowEvent.player,
    playerId: yellowEvent.playerId,
    reason: secondYellowReason,
    teamId: yellowEvent.teamId,
    type: liveEventTypes.redCard,
  }
}

export function normalizeMatchDisciplineEvents(events = []) {
  const normalizedEvents = []
  const yellowCountsByPlayer = {}
  const directRedPlayerKeys = new Set(
    events
      .filter((event) => event.type === liveEventTypes.redCard && !(event.automatic && event.reason === secondYellowReason))
      .map(getEventPlayerKey)
      .filter(Boolean),
  )

  events
    .filter((event) => !(event.automatic && event.reason === secondYellowReason))
    .forEach((event) => {
      normalizedEvents.push(event)

      if (event.type !== liveEventTypes.yellowCard) {
        return
      }

      const playerKey = getEventPlayerKey(event)

      if (!playerKey) {
        return
      }

      yellowCountsByPlayer[playerKey] = (yellowCountsByPlayer[playerKey] ?? 0) + 1

      if (yellowCountsByPlayer[playerKey] === 2 && !directRedPlayerKeys.has(playerKey)) {
        normalizedEvents.push(createSecondYellowRedEvent(event))
      }
    })

  return normalizedEvents
}

export function isPlayerSentOffInMatch(match, playerId) {
  if (!playerId) {
    return false
  }

  return normalizeMatchDisciplineEvents(match?.events ?? []).some(
    (event) => event.type === liveEventTypes.redCard && getEventPlayerKey(event) === playerId,
  )
}

function getActivePhase(match) {
  if (match?.matchPhase === matchPhases.paused) {
    return match.previousPhase || matchPhases.firstHalf
  }

  if (match?.matchPhase) {
    return match.matchPhase
  }

  if (match?.status === 'final') {
    return matchPhases.final
  }

  if (match?.status === 'live') {
    return matchPhases.firstHalf
  }

  return matchPhases.scheduled
}

function getPhaseStartTime(match, phase) {
  if (phase === matchPhases.secondHalf) {
    return match?.secondHalfStartTime || match?.phaseStartedAt
  }

  return match?.firstHalfStartTime || match?.phaseStartedAt || match?.matchStartTime
}

function getEffectiveNow(match, now) {
  if (match?.matchPhase === matchPhases.paused && match.pauseStartedAt) {
    return match.pauseStartedAt
  }

  return now
}

function getHalfMinute(match, now, phase) {
  const startTime = toTimestamp(getPhaseStartTime(match, phase))
  const currentTime = toTimestamp(getEffectiveNow(match, now))
  const pausedMs = normalizeScoreValue(match?.phasePausedSeconds) * 1000

  if (!Number.isFinite(startTime) || !Number.isFinite(currentTime)) {
    return normalizeScoreValue(match?.minute) || 1
  }

  return Math.max(1, Math.floor((currentTime - startTime - pausedMs) / 60000) + 1)
}

export function formatMatchMinute(minute, phase) {
  if (phase === matchPhases.halftime) {
    return 'HT'
  }

  if (phase === matchPhases.firstHalf && minute > halfDurationMinutes) {
    return `${halfDurationMinutes}+${Math.min(maxAddedMinutes, minute - halfDurationMinutes)}'`
  }

  if (phase === matchPhases.secondHalf && minute > halfDurationMinutes * 2) {
    return `${halfDurationMinutes * 2}+${Math.min(maxAddedMinutes, minute - halfDurationMinutes * 2)}'`
  }

  return `${minute}'`
}

export function getLiveClock(match, now = new Date()) {
  const phase = match?.matchPhase === matchPhases.paused
    ? matchPhases.paused
    : getActivePhase(match)
  const timingPhase = getActivePhase(match)

  if (phase === matchPhases.halftime) {
    return { displayMinute: 'HT', minute: halfDurationMinutes, phase }
  }

  if (phase === matchPhases.final) {
    const minute = normalizeScoreValue(match?.minute) || halfDurationMinutes * 2
    return { displayMinute: formatMatchMinute(minute, matchPhases.secondHalf), minute, phase }
  }

  if (![matchPhases.firstHalf, matchPhases.secondHalf, matchPhases.paused].includes(phase)) {
    return { displayMinute: '', minute: 0, phase }
  }

  const halfMinute = getHalfMinute(match, now, timingPhase)
  const minute = timingPhase === matchPhases.secondHalf
    ? halfDurationMinutes + Math.min(halfDurationMinutes + maxAddedMinutes, halfMinute)
    : Math.min(halfDurationMinutes + maxAddedMinutes, halfMinute)

  return {
    displayMinute: formatMatchMinute(minute, timingPhase),
    minute,
    phase,
  }
}

export function calculateLiveMinute(match, now = new Date()) {
  return getLiveClock(match, now).minute || normalizeScoreValue(match?.minute) || 1
}

export function setLiveMatchMinute(match, minute, now = new Date()) {
  const requestedMinute = Math.round(Number(minute))

  if (!Number.isFinite(requestedMinute)) {
    return match
  }

  const activePhase = getActivePhase(match)

  if (activePhase === matchPhases.final) {
    return {
      ...match,
      minute: Math.min(halfDurationMinutes * 2 + maxAddedMinutes, Math.max(1, requestedMinute)),
    }
  }

  if (activePhase === matchPhases.halftime) {
    return {
      ...match,
      minute: halfDurationMinutes,
    }
  }

  if (![matchPhases.firstHalf, matchPhases.secondHalf].includes(activePhase)) {
    return {
      ...match,
      minute: Math.max(1, requestedMinute),
    }
  }

  const minimumMinute = activePhase === matchPhases.secondHalf ? halfDurationMinutes + 1 : 1
  const maximumMinute = activePhase === matchPhases.secondHalf
    ? halfDurationMinutes * 2 + maxAddedMinutes
    : halfDurationMinutes + maxAddedMinutes
  const correctedMinute = Math.min(maximumMinute, Math.max(minimumMinute, requestedMinute))
  const halfMinute = activePhase === matchPhases.secondHalf
    ? correctedMinute - halfDurationMinutes
    : correctedMinute
  const effectiveNow = toTimestamp(getEffectiveNow(match, now))
  const pausedMs = normalizeScoreValue(match?.phasePausedSeconds) * 1000
  const correctedStartTime = new Date(
    effectiveNow - pausedMs - Math.max(0, halfMinute - 1) * 60000,
  ).toISOString()

  if (activePhase === matchPhases.secondHalf) {
    return {
      ...match,
      minute: correctedMinute,
      phaseStartedAt: correctedStartTime,
      secondHalfStartTime: correctedStartTime,
    }
  }

  return {
    ...match,
    minute: correctedMinute,
    phaseStartedAt: correctedStartTime,
    firstHalfStartTime: correctedStartTime,
    matchStartTime: correctedStartTime,
  }
}

export function startLiveMatch(match, now = new Date()) {
  const timestamp = toIso(now)

  return {
    ...match,
    status: 'live',
    homeScore: normalizeScoreValue(match.homeScore),
    awayScore: normalizeScoreValue(match.awayScore),
    minute: 1,
    matchPhase: matchPhases.firstHalf,
    phaseStartedAt: timestamp,
    firstHalfStartTime: timestamp,
    firstHalfEndTime: undefined,
    secondHalfStartTime: undefined,
    secondHalfEndTime: undefined,
    pauseStartedAt: undefined,
    phasePausedSeconds: 0,
    previousPhase: undefined,
    matchStartTime: timestamp,
    matchEndTime: undefined,
  }
}

export function endFirstHalf(match, now = new Date()) {
  const timestamp = toIso(now)
  const clock = getLiveClock(match, now)

  return {
    ...match,
    status: 'live',
    matchPhase: matchPhases.halftime,
    firstHalfEndTime: timestamp,
    pauseStartedAt: undefined,
    phasePausedSeconds: 0,
    previousPhase: undefined,
    minute: clock.minute,
  }
}

export function startSecondHalf(match, now = new Date()) {
  const timestamp = toIso(now)

  return {
    ...match,
    status: 'live',
    matchPhase: matchPhases.secondHalf,
    phaseStartedAt: timestamp,
    secondHalfStartTime: timestamp,
    pauseStartedAt: undefined,
    phasePausedSeconds: 0,
    previousPhase: undefined,
    minute: halfDurationMinutes + 1,
  }
}

export function pauseLiveMatch(match, now = new Date()) {
  if (![matchPhases.firstHalf, matchPhases.secondHalf].includes(match.matchPhase)) {
    return match
  }

  return {
    ...match,
    matchPhase: matchPhases.paused,
    previousPhase: match.matchPhase,
    pauseStartedAt: toIso(now),
    minute: calculateLiveMinute(match, now),
  }
}

export function resumeLiveMatch(match, now = new Date()) {
  if (match.matchPhase !== matchPhases.paused || !match.pauseStartedAt) {
    return match
  }

  const pausedSeconds = Math.max(0, Math.floor((toTimestamp(now) - toTimestamp(match.pauseStartedAt)) / 1000))

  return {
    ...match,
    matchPhase: match.previousPhase || matchPhases.firstHalf,
    previousPhase: undefined,
    pauseStartedAt: undefined,
    phasePausedSeconds: normalizeScoreValue(match.phasePausedSeconds) + pausedSeconds,
  }
}

export function endLiveMatch(match, now = new Date()) {
  const timestamp = toIso(now)
  const clock = getLiveClock(match, now)

  return {
    ...match,
    status: 'final',
    matchPhase: matchPhases.final,
    minute: clock.minute,
    pauseStartedAt: undefined,
    previousPhase: undefined,
    matchEndTime: timestamp,
    secondHalfEndTime: match.secondHalfEndTime || timestamp,
  }
}

export function createLiveEvent({
  allowSentOff = false,
  match,
  minute,
  now = new Date(),
  penaltyOutcome,
  player,
  teamSide,
  type,
}) {
  if (!allowSentOff && isPlayerSentOffInMatch(match, player.id)) {
    throw new Error('player_sent_off')
  }

  const playerTeamId = getTeamIdForSide(match, teamSide)
  const teamId = type === liveEventTypes.ownGoal
    ? getTeamIdForSide(match, getOppositeTeamSide(teamSide))
    : playerTeamId
  const eventType = type === liveEventTypes.penalty
    ? penaltyOutcome === 'goal'
      ? liveEventTypes.penaltyGoal
      : liveEventTypes.penaltyMiss
    : type
  const eventMinute = Number.isFinite(Number(minute))
    ? Number(minute)
    : calculateLiveMinute(match, now)
  const activePhase = getActivePhase(match)
  const eventPhase = activePhase === matchPhases.final
    ? eventMinute <= halfDurationMinutes
      ? matchPhases.firstHalf
      : matchPhases.secondHalf
    : activePhase
  const event = {
    eventPhase,
    minute: eventMinute,
    displayMinute: formatMatchMinute(eventMinute, eventPhase),
    type: eventType,
    teamId,
    playerId: player.id,
    player: getPlayerDisplayName(player),
    assistPlayerId: undefined,
    assist: '',
  }

  return event
}

export function applyLiveEventToMatch(match, event) {
  const scoreUpdate = isScoreEvent(event)
    ? event.teamId === match.homeTeamId
      ? { homeScore: normalizeScoreValue(match.homeScore) + 1 }
      : { awayScore: normalizeScoreValue(match.awayScore) + 1 }
    : {}

  return {
    ...match,
    ...scoreUpdate,
    events: normalizeMatchDisciplineEvents([...(match.events ?? []), event]),
    minute: event.minute,
  }
}

export function buildMatchEventRowsForSave(matchId, events = []) {
  return events
    .filter((event) => !(event.automatic && event.reason === secondYellowReason))
    .map((event, index) => {
      const player = String(event.player ?? '').trim()
      const minute = Number(event.minute)
      const eventType = event.type ?? liveEventTypes.goal

      if (!player || !Number.isFinite(minute)) {
        return null
      }

      return {
        match_id: matchId,
        minute,
        event_phase: nullIfEmpty(event.eventPhase),
        display_minute: nullIfEmpty(event.displayMinute),
        type: eventType,
        event_type: eventType,
        team_id: nullIfEmpty(event.teamId),
        player_id: nullIfEmpty(event.playerId),
        player,
        assist_player_id: nullIfEmpty(event.assistPlayerId),
        assist: nullIfEmpty(event.assist?.trim()),
        sort_order: index,
      }
    })
    .filter(Boolean)
}

export function normalizePersistedEventType(row = {}) {
  const legacyType = validEventTypes.has(row.type) ? row.type : ''
  const eventType = validEventTypes.has(row.event_type) ? row.event_type : ''

  if (legacyType && eventType && legacyType !== eventType) {
    if (eventType === liveEventTypes.goal && legacyType !== liveEventTypes.goal) {
      return legacyType
    }

    if (legacyType === liveEventTypes.goal && eventType !== liveEventTypes.goal) {
      return eventType
    }
  }

  return eventType || legacyType || liveEventTypes.goal
}

function findPlayerByEvent(playersById, event, fieldId, fieldName) {
  if (event[fieldId] && playersById[event[fieldId]]) {
    return playersById[event[fieldId]]
  }

  const eventName = event[fieldName]?.trim()
  if (!eventName) {
    return null
  }

  return Object.values(playersById).find((player) =>
    [player.name, player.nameEn, player.nameHe, player.nameAr]
      .filter(Boolean)
      .some((name) => name === eventName),
  ) ?? null
}

export function summarizePlayerEventStats(players, matches) {
  const playersById = Object.fromEntries(players.map((player) => [player.id, player]))
  const stats = Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        ...player,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
    ]),
  )

  matches.flatMap((match) => normalizeMatchDisciplineEvents(match.events ?? [])).forEach((event) => {
    const player = findPlayerByEvent(playersById, event, 'playerId', 'player')

    if (player && stats[player.id]) {
      if ([liveEventTypes.goal, liveEventTypes.penaltyGoal].includes(event.type)) {
        stats[player.id].goals += 1
      }

      if (event.type === liveEventTypes.yellowCard) {
        stats[player.id].yellowCards += 1
      }

      if (event.type === liveEventTypes.redCard) {
        stats[player.id].redCards += 1
      }

    }
  })

  return players.map((player) => stats[player.id])
}

export function isStandingMatch(match) {
  return (
    match.status === 'final' &&
    Number.isFinite(match.homeScore) &&
    Number.isFinite(match.awayScore)
  )
}
