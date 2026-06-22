import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  Expand,
  Languages,
  Goal,
  LockKeyhole,
  Medal,
  Moon,
  PencilLine,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Share2,
  Smartphone,
  Sun,
  Table2,
  Timer,
  Trophy,
  Trash2,
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
  deleteMatch,
  deletePlayer,
  deleteTeam,
  deleteLineups,
  getCurrentSession,
  inviteAdmin,
  loadAdminAccess,
  loadTournamentData,
  loadVotes,
  onAuthSessionChange,
  saveLineup,
  saveMatch,
  saveMatchEvents,
  savePlayer,
  saveTeam,
  saveVote,
  signInAdmin,
  signOutAdmin,
} from './services/tournamentService'
import {
  getEventPlayerName,
  getLanguageDirection,
  getPlayerNameCandidates,
  getStoredLanguage,
  getUiDictionary,
  getVenueName,
  languageOptions,
  localizeTournamentData,
  storeLanguage,
} from './utils/localization'
import { getTeamFlag } from './utils/teamFlags'
import {
  calculateStandings,
  calculateSuspensions,
  getPlayerSuspension,
  getLeaderboards,
  getMatchTeam,
  getPlayersById,
  getPlayersByTeam,
  getTeamEventTotals,
  getTeamGoalStats,
  getTournamentStats,
  getUpcomingMatches,
  isScoredMatch,
} from './utils/tournament'
import {
  applyLiveEventToMatch,
  calculateLiveMinute,
  createLiveEvent,
  endLiveMatch,
  endFirstHalf,
  getLiveClock,
  liveEventTypes,
  matchPhases,
  normalizeMatchDisciplineEvents,
  pauseLiveMatch,
  resumeLiveMatch,
  setLiveMatchMinute,
  startSecondHalf,
  startLiveMatch,
} from './utils/liveMatch'
import {
  getGroupLabel,
  getKnockoutPlaceholderOptions,
  getShortMatchStageLabel,
  getTeamGroupCode,
  isDrawAllowedStage,
  isLeagueStage,
  knockoutStageFilters,
  roundFilterOptions,
  stageLabels,
  stageOptions,
  tournamentFormat,
} from './config/tournamentFormat'

const navItems = [
  { id: 'overview', labelKey: 'overview', icon: Activity },
  { id: 'matches', labelKey: 'matches', icon: CalendarDays },
  { id: 'tables', labelKey: 'standings', icon: Table2 },
  { id: 'teams', labelKey: 'teams', icon: Users },
  { id: 'knockout', labelKey: 'knockout', icon: Trophy },
  { id: 'leaders', labelKey: 'stats', icon: Medal },
  { id: 'admin', labelKey: 'admin', icon: Settings },
]
const publicNavItems = navItems

const starterCount = 7
const emptyTournamentData = {
  teams: [],
  players: [],
  matches: [],
  knockoutMatches: [],
  lineups: {},
}
const matchFilterModes = [
  { id: 'date', labelKey: 'byDate' },
  { id: 'round', labelKey: 'byRound' },
  { id: 'team', labelKey: 'byTeam' },
]
const shareCardFormats = [
  { labelKey: 'story', value: 'story', width: 1080, height: 1920 },
]
const shareCardFlagWarmupCodes = ['ALB', 'MAR']
const shareCardFlagDataCache = new Map()
const tournamentPublicUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://deir-hanna-world-cup.vercel.app'
const brandLogoPath = '/brand/el-capitano-logo.jpg'
const brandCoverPath = '/brand/el-capitano-playground.jpg'
const brandLogoFallbackDataUrl = encodeSvgDataUri(buildBrandLogoFallbackSvg())
let brandLogoDataUrlPromise
const israelTimeZone = 'Asia/Jerusalem'
const matchCountdownWindowMs = 24 * 60 * 60 * 1000
const themeStorageKey = 'deir-hanna-world-cup-theme'
const themeOptions = [
  { id: 'light', labelKey: 'lightMode', icon: Sun },
  { id: 'dark', labelKey: 'darkMode', icon: Moon },
]
const detailTabs = ['Details', 'Players', 'Standings', 'Matches']
const teamPageTabs = ['Matches', 'Standings', 'Players', 'Statistics']
const UiTextContext = createContext(getUiDictionary())

function useUiText() {
  return useContext(UiTextContext)
}

function normalizeThemePreference(themePreference) {
  return themeOptions.some((option) => option.id === themePreference) ? themePreference : 'light'
}

function getStoredThemePreference() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return normalizeThemePreference(window.localStorage.getItem(themeStorageKey))
}

function storeThemePreference(themePreference) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(themeStorageKey, normalizeThemePreference(themePreference))
  }
}

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

function replaceHashRoute(type, id) {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState('', document.title, `#/${type}/${encodeURIComponent(id)}`)
}

function clearHashRoute() {
  if (typeof window === 'undefined') {
    return
  }

  window.history.pushState('', document.title, window.location.pathname + window.location.search)
}

function pushMainViewState(viewId, fromOverviewShortcut = false) {
  if (typeof window === 'undefined') {
    return
  }

  window.history.pushState(
    { activeView: viewId, fromOverviewShortcut },
    document.title,
    window.location.pathname + window.location.search,
  )
}

function replaceMainRoute() {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState('', document.title, window.location.pathname + window.location.search)
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
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => player.id)

  return {
    formation: '3-3-1',
    starters: playerIds.slice(0, starterCount),
    bench: playerIds.slice(starterCount),
  }
}

function normalizeScore(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  return Number(value)
}

function getMatchKickoffSortTimestamp(match) {
  const kickoffTimestamp = getIsraelMatchKickoffTimestamp(match)

  if (Number.isFinite(kickoffTimestamp)) {
    return kickoffTimestamp
  }

  const fallbackTimestamp = Date.parse(`${match?.date ?? ''}T${match?.time ?? '00:00'}`)
  return Number.isFinite(fallbackTimestamp) ? fallbackTimestamp : 0
}

function compareMatchKickoffAsc(a, b) {
  const timestampDiff = getMatchKickoffSortTimestamp(a) - getMatchKickoffSortTimestamp(b)
  if (timestampDiff !== 0) return timestampDiff

  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
}

function compareMatchKickoffDesc(a, b) {
  const timestampDiff = getMatchKickoffSortTimestamp(b) - getMatchKickoffSortTimestamp(a)
  if (timestampDiff !== 0) return timestampDiff

  return String(b?.id ?? '').localeCompare(String(a?.id ?? ''))
}

function getIsraelDateTimeParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: israelTimeZone,
    year: 'numeric',
  }).formatToParts(date)

  return parts.reduce((values, part) => {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value)
    }

    return values
  }, {})
}

function getIsraelMatchKickoffTimestamp(match) {
  if (!match?.date || !match?.time) {
    return null
  }

  const [year, month, day] = String(match.date).split('-').map(Number)
  const [hour = 0, minute = 0] = String(match.time).split(':').map(Number)

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null
  }

  const targetTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0)
  let timestamp = targetTimestamp

  for (let index = 0; index < 2; index += 1) {
    const parts = getIsraelDateTimeParts(new Date(timestamp))
    const zoneTimestamp = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second ?? 0,
    )
    timestamp += targetTimestamp - zoneTimestamp
  }

  return timestamp
}

function getMatchCountdown(match, now = new Date()) {
  if (match?.status !== 'scheduled') {
    return null
  }

  const kickoffTimestamp = getIsraelMatchKickoffTimestamp(match)

  if (!kickoffTimestamp) {
    return null
  }

  const totalMs = kickoffTimestamp - now.getTime()

  if (totalMs <= 0 || totalMs > matchCountdownWindowMs) {
    return null
  }

  const totalSeconds = Math.ceil(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    hours,
    minutes,
    seconds,
    totalMs,
  }
}

function formatCountdownDuration(countdown) {
  return [countdown.hours, countdown.minutes, countdown.seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function encodeSvgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function buildBrandLogoFallbackSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
    <defs>
      <linearGradient id="fallbackBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07100d"/>
        <stop offset="52%" stop-color="#10261d"/>
        <stop offset="100%" stop-color="#163428"/>
      </linearGradient>
      <linearGradient id="fallbackGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff2a8"/>
        <stop offset="52%" stop-color="#ffdb70"/>
        <stop offset="100%" stop-color="#b98a24"/>
      </linearGradient>
    </defs>
    <rect width="768" height="768" rx="172" fill="url(#fallbackBg)"/>
    <circle cx="384" cy="384" r="282" fill="none" stroke="url(#fallbackGold)" stroke-width="28"/>
    <path d="M242 285h284v72c0 80-62 146-142 146s-142-66-142-146v-72Z" fill="none" stroke="url(#fallbackGold)" stroke-width="38" stroke-linejoin="round"/>
    <path d="M242 315h-58c0 86 54 136 116 144M526 315h58c0 86-54 136-116 144" fill="none" stroke="url(#fallbackGold)" stroke-width="34" stroke-linecap="round"/>
    <path d="M384 503v82M300 585h168M270 644h228" fill="none" stroke="url(#fallbackGold)" stroke-width="38" stroke-linecap="round"/>
    <circle cx="384" cy="228" r="58" fill="#ffffff" opacity="0.92"/>
  </svg>`
}

function getPublicAssetUrl(path) {
  if (typeof window === 'undefined') {
    return path
  }

  return new URL(path, window.location.origin).href
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Could not read image.')))
    reader.readAsDataURL(blob)
  })
}

async function loadBrandLogoDataUrl() {
  if (!brandLogoDataUrlPromise) {
    if (typeof fetch !== 'function') {
      return brandLogoFallbackDataUrl
    }

    brandLogoDataUrlPromise = fetch(getPublicAssetUrl(brandLogoPath), { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load brand logo.')
        }

        return response.blob()
      })
      .then(blobToDataUrl)
      .catch(() => brandLogoFallbackDataUrl)
  }

  return brandLogoDataUrlPromise
}

function getShareCardTeams(match, teams) {
  return [
    getMatchTeam(match, teams, 'home'),
    getMatchTeam(match, teams, 'away'),
  ]
}

async function loadShareCardFlagData(teams = []) {
  const requestedCodes = teams
    .map((team) => getTeamFlag(team)?.code)
    .filter(Boolean)
  const codes = [...new Set([...shareCardFlagWarmupCodes, ...requestedCodes])]

  if (!codes.length || typeof fetch === 'undefined') {
    return {}
  }

  await Promise.all(codes.map(async (code) => {
    if (shareCardFlagDataCache.has(code)) {
      return
    }

    const flag = getTeamFlag(code)
    if (!flag?.path) {
      shareCardFlagDataCache.set(code, '')
      return
    }

    const response = await fetch(flag.path, { cache: 'force-cache' })
    if (!response.ok) {
      throw new Error(`Could not load ${code} flag.`)
    }

    const svg = await response.text()
    shareCardFlagDataCache.set(code, encodeSvgDataUri(svg))
  }))

  return Object.fromEntries(
    codes
      .map((code) => [code, shareCardFlagDataCache.get(code)])
      .filter(([, data]) => Boolean(data)),
  )
}

function truncateText(value, maxLength) {
  const characters = Array.from(String(value ?? ''))
  return characters.length > maxLength
    ? `${characters.slice(0, Math.max(0, maxLength - 1)).join('')}...`
    : characters.join('')
}

function wrapShareCardText(value, maxCharactersPerLine, maxLines = 2) {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return ['']
  }

  const lines = []
  let currentLine = ''

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (Array.from(candidate).length <= maxCharactersPerLine) {
      currentLine = candidate
      return
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = word
      return
    }

    lines.push(truncateText(word, maxCharactersPerLine))
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  if (lines.length <= maxLines) {
    return lines
  }

  const visibleLines = lines.slice(0, maxLines)
  visibleLines[maxLines - 1] = truncateText(
    lines.slice(maxLines - 1).join(' '),
    maxCharactersPerLine,
  )
  return visibleLines
}

function buildSvgTextBlock({
  anchor = 'start',
  direction = 'ltr',
  fill = '#ffffff',
  fontFamily = 'Inter, Arial, sans-serif',
  fontSize,
  fontWeight = 800,
  lineHeight = Math.round(fontSize * 1.15),
  maxLines = 1,
  maxWidth,
  value,
  x,
  y,
}) {
  const characterWidthRatio = direction === 'rtl' ? 0.58 : 0.55
  const maxCharactersPerLine = Math.max(
    4,
    Math.floor(maxWidth / (fontSize * characterWidthRatio)),
  )
  const lines = maxLines === 1
    ? [String(value ?? '').trim()]
    : wrapShareCardText(value, maxCharactersPerLine, maxLines)

  return `<text x="${x}" y="${y}" text-anchor="${anchor}" direction="${direction}" unicode-bidi="plaintext" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">
    ${lines.map((line, index) => {
      const estimatedWidth = Array.from(line).length * fontSize * characterWidthRatio
      const constrainedWidth = estimatedWidth > maxWidth
        ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`
        : ''

      return `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}"${constrainedWidth}>${escapeXml(line)}</tspan>`
    }).join('')}
  </text>`
}

function getShareFittedFontSize(value, baseFontSize, maxWidth, direction = 'ltr') {
  const textLength = Array.from(String(value ?? '').trim()).length
  if (!textLength) return baseFontSize

  const characterWidthRatio = direction === 'rtl' ? 0.58 : 0.55
  const estimatedWidth = textLength * baseFontSize * characterWidthRatio
  if (estimatedWidth <= maxWidth) return baseFontSize

  return Math.max(15, Math.floor(maxWidth / (textLength * characterWidthRatio)))
}

function getMatchShareCardFileName(match, format) {
  const matchName = `${match.homeTeamId || 'team-1'}-${match.awayTeamId || 'team-2'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `deir-hanna-world-cup-${matchName}-${match.date}-${format}.png`
}

function getShareCardScore(match) {
  return isScoredMatch(match) ? `${match.homeScore} - ${match.awayScore}` : match.time
}

function getMatchScoreDisplay(match, fallbackScore) {
  if (fallbackScore !== undefined && fallbackScore !== null) {
    return fallbackScore
  }

  return isScoredMatch(match) ? `${match.homeScore}-${match.awayScore}` : match.time
}

function MatchScoreText({ match, fallbackScore }) {
  const score = getMatchScoreDisplay(match, fallbackScore)

  return <span key={score} className="score-value" dir="ltr">{score}</span>
}

function isShareCardEvent(event) {
  return [
    liveEventTypes.goal,
    liveEventTypes.ownGoal,
    liveEventTypes.penaltyGoal,
    liveEventTypes.penaltyMiss,
    liveEventTypes.yellowCard,
    liveEventTypes.redCard,
  ].includes(event.type)
}

function getMatchShareEventGroups(match) {
  return normalizeMatchDisciplineEvents(match.events ?? [])
    .filter(isShareCardEvent)
    .sort((a, b) => Number(a.minute ?? 0) - Number(b.minute ?? 0))
    .reduce(
      (groups, event) => {
        if (event.teamId === match.homeTeamId) {
          groups.home.push(event)
        } else if (event.teamId === match.awayTeamId) {
          groups.away.push(event)
        }

        return groups
      },
      { home: [], away: [] },
    )
}

function getShareEventMarker(event) {
  if (event.type === liveEventTypes.goal) return 'G'
  if (event.type === liveEventTypes.ownGoal) return '(OG)'
  if (event.type === liveEventTypes.penaltyGoal) return 'P'
  if (event.type === liveEventTypes.penaltyMiss) return 'PX'
  if (event.type === liveEventTypes.redCard && event.reason === 'second_yellow') return '2Y'
  if (event.type === liveEventTypes.redCard) return 'RC'
  if (event.type === liveEventTypes.yellowCard) return 'YC'
  return ''
}

function isShareScoreEvent(event) {
  return [liveEventTypes.goal, liveEventTypes.ownGoal, liveEventTypes.penaltyGoal].includes(event.type)
}

function getShareEventPlayerKey(event, players, ui = getUiDictionary('en')) {
  return [
    event.playerId || event.player || getEventPlayerDisplayName(event, players, ui),
    event.type,
  ].join(':')
}

function getEventPlayerDisplayName(event, players, ui = getUiDictionary('en')) {
  return event.playerDisplayName || getEventPlayerName(event, players, ui.currentLanguage)
}

function formatShareEventPlayerLabel(event, players, ui = getUiDictionary('en')) {
  const ownGoal = event.type === liveEventTypes.ownGoal ? ` ${ui.ownGoal}` : ''
  const penalty = event.type === liveEventTypes.penaltyGoal
    ? ` ${ui.penaltyGoal}`
    : event.type === liveEventTypes.penaltyMiss
      ? ` ${ui.penaltyMissSaved}`
      : ''
  const playerName = getEventPlayerDisplayName(event, players, ui)

  return `${playerName}${ownGoal}${penalty}`.trim()
}

function buildShareEventRows(events, players, ui = getUiDictionary('en')) {
  const scoreRowsByPlayer = new Map()
  const rows = []

  events
    .slice()
    .sort((a, b) => Number(a.minute ?? 0) - Number(b.minute ?? 0))
    .forEach((event) => {
      if (isShareScoreEvent(event)) {
        const scoreKey = getShareEventPlayerKey(event, players, ui)
        const minute = formatStoredEventMinute(event)
        let scoreRow = scoreRowsByPlayer.get(scoreKey)

        if (!scoreRow) {
          scoreRow = {
            icons: [],
            kind: 'score',
            minutes: [],
            playerLabel: formatShareEventPlayerLabel(event, players, ui),
            sortMinute: Number(event.minute ?? 0),
            type: event.type,
          }
          scoreRowsByPlayer.set(scoreKey, scoreRow)
          rows.push(scoreRow)
        }

        scoreRow.minutes.push(minute)
        scoreRow.icons.push(event.type)
        scoreRow.sortMinute = Math.min(scoreRow.sortMinute, Number(event.minute ?? 0))
        return
      }

      if ([liveEventTypes.yellowCard, liveEventTypes.redCard, liveEventTypes.penaltyMiss].includes(event.type)) {
        rows.push({
          icons: [],
          kind: 'card',
          marker: getShareEventMarker(event),
          minutes: [formatStoredEventMinute(event)],
          playerLabel: formatShareEventPlayerLabel(event, players, ui),
          sortMinute: Number(event.minute ?? 0),
          type: event.type,
        })
      }
    })

  return rows.sort((a, b) => a.sortMinute - b.sortMinute)
}

function buildShareFootballIcon({ size = 26, tone = '#56d878', x, y }) {
  const radius = size / 2
  const centerX = x + radius
  const centerY = y + radius
  const panel = size * 0.21

  return `
    <g>
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${tone}"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius - 2}" fill="none" stroke="#07100d" stroke-opacity="0.22" stroke-width="2"/>
      <path d="M ${centerX} ${centerY - panel * 1.1} L ${centerX + panel * 1.1} ${centerY - panel * 0.25} L ${centerX + panel * 0.72} ${centerY + panel * 1.05} L ${centerX - panel * 0.72} ${centerY + panel * 1.05} L ${centerX - panel * 1.1} ${centerY - panel * 0.25} Z" fill="#07100d" opacity="0.92"/>
      <path d="M ${centerX - radius * 0.72} ${centerY - radius * 0.16} L ${centerX - panel * 1.1} ${centerY - panel * 0.25} M ${centerX + radius * 0.72} ${centerY - radius * 0.16} L ${centerX + panel * 1.1} ${centerY - panel * 0.25} M ${centerX - radius * 0.44} ${centerY + radius * 0.7} L ${centerX - panel * 0.72} ${centerY + panel * 1.05} M ${centerX + radius * 0.44} ${centerY + radius * 0.7} L ${centerX + panel * 0.72} ${centerY + panel * 1.05}" fill="none" stroke="#07100d" stroke-width="2" stroke-linecap="round" opacity="0.72"/>
    </g>
  `
}

function buildShareEventColumn({ events, height, isStory, players, side, team, ui, width, x, y }) {
  const eventRows = buildShareEventRows(events, players, ui)
  const compactEmptyState = !eventRows.length
  const maxEvents = isStory ? 7 : 4
  const textDirection = ui.currentLanguage === 'en' ? 'ltr' : 'rtl'
  const visibleRows = eventRows.slice(0, maxEvents)
  const rows = visibleRows.length
    ? visibleRows
    : [{ minute: '', marker: '', playerLabel: ui.noMatchEventsYet, type: 'empty' }]
  const rowGap = compactEmptyState ? 42 : isStory ? 58 : 48
  const rowHeight = compactEmptyState ? 36 : isStory ? 44 : 38
  const fontSize = isStory ? 24 : 20
  const markerOnRight = side === 'away'
  const teamTextX = x + width / 2
  const overflowCount = eventRows.length - visibleRows.length
  const overflowLabel = overflowCount > 0 ? `+${overflowCount}` : ''
  const sideAccent = side === 'away' ? '#ffdb70' : '#2d7b5d'

  return `
    ${buildSvgTextBlock({
      anchor: 'middle',
      direction: textDirection,
      fill: '#ffffff',
      fontSize: isStory ? 26 : 22,
      fontWeight: 950,
      maxLines: 1,
      maxWidth: width - 12,
      value: team.country,
      x: teamTextX,
      y,
    })}
    <rect x="${x + width / 2 - 46}" y="${y + 13}" width="92" height="5" rx="3" fill="${sideAccent}"/>
    ${rows.map((row, index) => {
      const rowY = y + 28 + index * rowGap
      const muted = row.type === 'empty'
      const isScoreRow = row.kind === 'score'
      const isCardRow = row.kind === 'card'
      const markerFill = row.type === liveEventTypes.redCard
        ? '#bd1f36'
        : row.type === liveEventTypes.yellowCard
          ? '#ffdb70'
          : row.type === liveEventTypes.penaltyMiss
            ? '#7a8791'
            : '#10261d'
      const markerTextFill = row.type === liveEventTypes.yellowCard ? '#14201b' : '#ffffff'
      const rowPadding = isStory ? 16 : 12
      const columnGap = isStory ? 8 : 6
      const iconColumnWidth = isStory ? 90 : 72
      const minuteColumnWidth = isStory ? 80 : 66
      const nameColumnWidth = Math.max(
        112,
        width - rowPadding * 2 - iconColumnWidth - minuteColumnWidth - columnGap * 2,
      )
      const nameColumnStart = markerOnRight
        ? x + rowPadding
        : x + rowPadding + iconColumnWidth + columnGap + minuteColumnWidth + columnGap
      const minuteColumnStart = markerOnRight
        ? nameColumnStart + nameColumnWidth + columnGap
        : x + rowPadding + iconColumnWidth + columnGap
      const iconColumnStart = markerOnRight
        ? minuteColumnStart + minuteColumnWidth + columnGap
        : x + rowPadding
      const minuteText = row.minutes ? row.minutes.join(', ') : row.minute ?? ''
      const minuteX = minuteColumnStart + minuteColumnWidth / 2
      const playerTextAnchor = 'start'
      const playerTextX = textDirection === 'rtl'
        ? nameColumnStart + nameColumnWidth
        : nameColumnStart
      const playerMaxWidth = nameColumnWidth
      const nameFontSize = muted
        ? fontSize - 2
        : getShareFittedFontSize(row.playerLabel, fontSize, playerMaxWidth, textDirection)
      const scoreIconCount = isScoreRow ? row.icons.length : 1
      const iconGap = scoreIconCount > 3 ? 3 : 5
      const baseIconSize = isStory ? 24 : 21
      const iconSize = isScoreRow
        ? Math.max(
          10,
          Math.min(
            baseIconSize,
            Math.floor((iconColumnWidth - Math.max(0, scoreIconCount - 1) * iconGap) / scoreIconCount),
          ),
        )
        : baseIconSize
      const iconClusterWidth = isScoreRow
        ? row.icons.length * iconSize + Math.max(0, row.icons.length - 1) * iconGap
        : 42
      const iconClusterX = iconColumnStart + (iconColumnWidth - iconClusterWidth) / 2
      const cardWidth = 42
      const cardX = iconColumnStart + (iconColumnWidth - cardWidth) / 2

      if (rowY + rowHeight > height - 122) {
        return ''
      }

      return `
        <rect x="${x}" y="${rowY}" width="${width}" height="${rowHeight}" rx="18" fill="${muted ? '#193326' : '#f6f7f2'}" opacity="${muted ? '0.84' : '1'}"/>
        ${isScoreRow ? row.icons.map((icon, iconIndex) => buildShareFootballIcon({
          size: iconSize,
          tone: icon === liveEventTypes.penaltyGoal ? '#7c7cff' : side === 'away' ? '#6f7cff' : '#52d273',
          x: iconClusterX + iconIndex * (iconSize + iconGap),
          y: rowY + (rowHeight - iconSize) / 2,
        })).join('') : ''}
        ${isCardRow ? `<rect x="${cardX}" y="${rowY + 7}" width="42" height="${rowHeight - 14}" rx="12" fill="${markerFill}"/><text x="${cardX + 21}" y="${rowY + rowHeight - 15}" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="${fontSize - 7}" font-weight="950" fill="${markerTextFill}">${escapeXml(row.marker)}</text>` : ''}
        ${minuteText ? `<text x="${minuteX}" y="${rowY + rowHeight - 14}" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="${fontSize - 4}" font-weight="950" fill="#14201b">${escapeXml(minuteText)}</text>` : ''}
        ${buildSvgTextBlock({
          anchor: row.kind ? playerTextAnchor : 'middle',
          direction: textDirection,
          fill: muted ? '#9fb5aa' : '#14201b',
          fontSize: nameFontSize,
          fontWeight: muted ? 700 : 850,
          maxLines: 1,
          maxWidth: row.kind ? playerMaxWidth : width - 32,
          value: row.playerLabel,
          x: row.kind ? playerTextX : x + width / 2,
          y: rowY + rowHeight - 14,
        })}
      `
    }).join('')}
    ${overflowLabel ? `<text x="${teamTextX}" y="${height - 176}" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffdb70">${escapeXml(overflowLabel)}</text>` : ''}
  `
}

function buildWhatsAppGoalLines(match, players, ui = getUiDictionary('en')) {
  const goals = normalizeMatchDisciplineEvents(match.events ?? [])
    .filter((event) => [liveEventTypes.goal, liveEventTypes.ownGoal, liveEventTypes.penaltyGoal].includes(event.type))
    .sort((a, b) => a.minute - b.minute)
    .map((event) => {
      const marker = event.type === liveEventTypes.ownGoal ? '(OG)' : ''
      const penalty = event.type === liveEventTypes.penaltyGoal ? '(P)' : ''
      const playerName = getEventPlayerDisplayName(event, players, ui)
      return `⚽ ${playerName} ${marker} ${penalty} ${formatStoredEventMinute(event)}`.replace(/\s+/g, ' ').trim()
    })

  return goals.length ? goals : ['No goals recorded yet']
}

function getWhatsAppMatchUrl() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.href
}

function buildWhatsAppMatchMessage({ match, now, players, teams, ui = getUiDictionary('en'), url = getWhatsAppMatchUrl() }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const liveClock = getLiveClock(match, now)
  const lines = [
    `🏆 ${ui.tournamentTitle}`,
    '',
    `${home.country} vs ${away.country}`,
  ]

  if (match.status === 'scheduled') {
    lines.push(
      `Fixture: ${formatLongDate(match.date)} / ${match.time}`,
      `Status: ${getStatusLabel(match.status, ui)}`,
      `Venue: ${match.venue ?? getVenueName(match, 'en')}`,
    )
  } else if (match.status === 'live') {
    lines.push(
      `Score: ${match.homeScore ?? 0}-${match.awayScore ?? 0}`,
      `Minute: ${liveClock.displayMinute ?? `${match.minute ?? 1}'`}`,
      `Status: ${getStatusLabel(match.status, ui)}`,
    )
  } else {
    lines.push(
      `Final Result: ${match.homeScore ?? 0}-${match.awayScore ?? 0}`,
      `Status: ${getStatusLabel(match.status, ui)}`,
    )
  }

  lines.push('', 'Goals:', ...buildWhatsAppGoalLines(match, players, ui), '', 'Follow live:', url)

  return lines.join('\n')
}

function openWhatsAppMatchShare({ match, now, players, teams, ui = getUiDictionary('en') }) {
  if (typeof window === 'undefined') {
    return
  }

  const message = buildWhatsAppMatchMessage({ match, now, players, teams, ui })
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}

function buildShareCardTeamLogo(team, x, y, size, flagDataByCode = {}) {
  const flag = getTeamFlag(team)
  const radius = size / 2
  const textSize = Math.max(22, Math.round(size * 0.24))
  const flagHref = flag ? flagDataByCode[flag.code] : ''

  if (flagHref?.startsWith('data:image/svg+xml')) {
    const clipId = `share-flag-${escapeXml(flag.code.toLowerCase())}-${Math.round(x)}-${Math.round(y)}-${Math.round(size)}`

    return `
      <clipPath id="${clipId}">
        <circle cx="${x}" cy="${y}" r="${radius}"/>
      </clipPath>
      <circle cx="${x}" cy="${y}" r="${radius + 11}" fill="#ffffff" opacity="0.96"/>
      <image href="${escapeXml(flagHref)}" xlink:href="${escapeXml(flagHref)}" x="${x - radius}" y="${y - radius}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
      <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="8"/>
      <circle cx="${x}" cy="${y}" r="${radius + 13}" fill="none" stroke="#ffdb70" stroke-width="4" opacity="0.55"/>
    `
  }

  return `
    <circle cx="${x}" cy="${y}" r="${radius + 11}" fill="#ffffff" opacity="0.96"/>
    <circle cx="${x}" cy="${y}" r="${radius}" fill="#10261d" stroke="#ffdb70" stroke-width="8"/>
    <path d="M ${x - radius * 0.65} ${y + radius * 0.36} C ${x - radius * 0.22} ${y - radius * 0.28}, ${x + radius * 0.2} ${y - radius * 0.28}, ${x + radius * 0.65} ${y + radius * 0.36}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.62"/>
    <text x="${x}" y="${y + textSize / 3}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${textSize}" font-weight="900" fill="#ffdb70">${escapeXml(team.code)}</text>
  `
}

function buildMatchShareCardSvg({ brandLogoUrl = brandLogoFallbackDataUrl, flagDataByCode = {}, format, match, players = [], teams, ui = getUiDictionary('en') }) {
  const { width, height } = format
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const isStory = true
  const isRtl = ui.currentLanguage !== 'en'
  const textDirection = ui.currentLanguage === 'en' ? 'ltr' : 'rtl'
  const tournamentTitle = ui.tournamentTitle
  const roundLabel = getMatchRoundLabel(match, ui)
  const cardPadding = 60
  const headerTextLeft = cardPadding + 145
  const headerTextRight = width - cardPadding
  const headerTitleX = isRtl ? headerTextRight : headerTextLeft
  const headerTitleAnchor = 'start'
  const headerTextWidth = headerTextRight - headerTextLeft
  const panelX = 60
  const panelY = 250
  const panelWidth = width - panelX * 2
  const panelHeight = 1485
  const homeFlagX = 270
  const awayFlagX = width - 270
  const flagY = 610
  const scoreY = 620
  const statusY = 770
  const eventStartY = 1075
  const eventGroups = getMatchShareEventGroups(match)
  const eventColumnWidth = 390
  const eventLeftX = 112
  const eventRightX = width - 112 - eventColumnWidth
  const footerY = height - 108
  const footerTitleX = isRtl ? width / 2 - 48 : cardPadding
  const footerTitleWidth = width / 2 - cardPadding - 48
  const statusLabel = getStatusLabel(match.status, ui).toUpperCase()
  const statusFill = match.status === 'live'
    ? '#bd1f36'
    : match.status === 'final'
      ? '#e8ede3'
      : '#ffdb70'
  const statusTextFill = match.status === 'live' ? '#ffffff' : '#14201b'
  const score = getShareCardScore(match)
  const nameMax = 16
  const venueLabel = getVenueName(match, ui.currentLanguage)
  const dateTimeLabel = `${formatLongDate(match.date)} / ${match.time}`
  const matchHeroX = panelX + 34
  const matchHeroY = panelY + 34
  const matchHeroWidth = panelWidth - 68
  const matchHeroHeight = 488

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07100d"/>
      <stop offset="48%" stop-color="#10261d"/>
      <stop offset="100%" stop-color="#163428"/>
    </linearGradient>
    <radialGradient id="premiumBurst" cx="50%" cy="24%" r="72%">
      <stop offset="0%" stop-color="#44b47e" stop-opacity="0.72"/>
      <stop offset="45%" stop-color="#1f6a4d" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#07100d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="storyBackdrop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#123b2a"/>
      <stop offset="48%" stop-color="#07100d"/>
      <stop offset="100%" stop-color="#173a2c"/>
    </linearGradient>
    <linearGradient id="matchGlassPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#193c2d"/>
      <stop offset="42%" stop-color="#0b1b15"/>
      <stop offset="100%" stop-color="#07100d"/>
    </linearGradient>
    <radialGradient id="stadiumPanelGlow" cx="50%" cy="22%" r="86%">
      <stop offset="0%" stop-color="#7fd8a9" stop-opacity="0.26"/>
      <stop offset="42%" stop-color="#2d7b5d" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#07100d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="matchHeroSheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="42%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="pitchTexture" patternUnits="userSpaceOnUse" width="42" height="42">
      <rect width="42" height="42" fill="#ffffff" opacity="0"/>
      <path d="M0 42 L42 0" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1.2"/>
      <path d="M0 21 H42" stroke="#ffdb70" stroke-opacity="0.025" stroke-width="1"/>
    </pattern>
    <linearGradient id="scorePlate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07100d"/>
      <stop offset="52%" stop-color="#10261d"/>
      <stop offset="100%" stop-color="#255640"/>
    </linearGradient>
    <linearGradient id="eventDeck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10261d"/>
      <stop offset="100%" stop-color="#07100d"/>
    </linearGradient>
    <linearGradient id="heroSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#000000" flood-opacity="0.32"/>
    </filter>
    <filter id="deepShadow" x="-24%" y="-24%" width="148%" height="148%">
      <feDropShadow dx="0" dy="38" stdDeviation="34" flood-color="#000000" flood-opacity="0.46"/>
    </filter>
    <filter id="stadiumPanelShadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#000000" flood-opacity="0.34"/>
    </filter>
    <clipPath id="shareBrandLogoClip">
      <rect x="${cardPadding}" y="82" width="118" height="118" rx="30"/>
    </clipPath>
    <clipPath id="matchHeroClip">
      <rect x="${matchHeroX}" y="${matchHeroY}" width="${matchHeroWidth}" height="${matchHeroHeight}" rx="44"/>
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#premiumBurst)"/>
  <path d="M-70 415 C210 280 360 540 590 400 C780 282 955 360 1160 240" fill="none" stroke="#ffffff" stroke-width="9" opacity="0.055"/>
  <path d="M-80 1390 C190 1235 395 1365 625 1210 C805 1108 995 1196 1165 1030" fill="none" stroke="#ffdb70" stroke-width="8" opacity="0.08"/>
  <path d="M-120 830 C185 675 372 860 585 715 C778 584 940 668 1180 525" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.055"/>
  <rect x="${width - 360}" y="198" width="520" height="62" rx="31" fill="url(#heroSheen)" transform="rotate(-18 ${width - 100} 229)" opacity="0.65"/>
  <circle cx="${width - 165}" cy="145" r="210" fill="#ffffff" opacity="0.045"/>
  <circle cx="115" cy="${height - 125}" r="260" fill="#ffdb70" opacity="0.07"/>

  <rect x="${cardPadding}" y="82" width="118" height="118" rx="30" fill="#07100d" stroke="#ffdb70" stroke-width="3" opacity="0.98"/>
  <image href="${escapeXml(brandLogoUrl)}" xlink:href="${escapeXml(brandLogoUrl)}" x="${cardPadding}" y="82" width="118" height="118" preserveAspectRatio="xMidYMid slice" clip-path="url(#shareBrandLogoClip)"/>
  <rect x="${cardPadding}" y="82" width="118" height="118" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>

  ${buildSvgTextBlock({
    anchor: headerTitleAnchor,
    direction: textDirection,
    fill: '#ffffff',
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 38,
    maxLines: 2,
    maxWidth: headerTextWidth,
    value: tournamentTitle,
    x: headerTitleX,
    y: 126,
  })}
  ${buildSvgTextBlock({
    anchor: headerTitleAnchor,
    direction: textDirection,
    fill: '#cfe7d8',
    fontSize: 25,
    fontWeight: 700,
    maxLines: 1,
    maxWidth: headerTextWidth,
    value: roundLabel,
    x: headerTitleX,
    y: 185,
  })}

  <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="58" fill="url(#storyBackdrop)" filter="url(#deepShadow)"/>
  <rect x="${panelX + 1}" y="${panelY + 1}" width="${panelWidth - 2}" height="${panelHeight - 2}" rx="57" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
  <g filter="url(#stadiumPanelShadow)">
    <rect x="${matchHeroX}" y="${matchHeroY}" width="${matchHeroWidth}" height="${matchHeroHeight}" rx="44" fill="url(#matchGlassPanel)"/>
  </g>
  <g clip-path="url(#matchHeroClip)">
    <rect x="${matchHeroX}" y="${matchHeroY}" width="${matchHeroWidth}" height="${matchHeroHeight}" fill="url(#stadiumPanelGlow)"/>
    <rect x="${matchHeroX}" y="${matchHeroY}" width="${matchHeroWidth}" height="${matchHeroHeight}" fill="url(#pitchTexture)" opacity="0.8"/>
    <ellipse cx="${width / 2}" cy="${flagY + 4}" rx="390" ry="178" fill="#ffffff" opacity="0.065"/>
    <ellipse cx="${homeFlagX}" cy="${flagY}" rx="205" ry="150" fill="#ffffff" opacity="0.04"/>
    <ellipse cx="${awayFlagX}" cy="${flagY}" rx="205" ry="150" fill="#ffffff" opacity="0.04"/>
    <path d="M${matchHeroX} ${matchHeroY + 350} L${matchHeroX + matchHeroWidth} ${matchHeroY + 244} L${matchHeroX + matchHeroWidth} ${matchHeroY + matchHeroHeight} L${matchHeroX} ${matchHeroY + matchHeroHeight} Z" fill="#2d7b5d" opacity="0.24"/>
    <path d="M${matchHeroX + 70} ${matchHeroY + matchHeroHeight - 78} C${matchHeroX + 265} ${matchHeroY + matchHeroHeight - 140}, ${matchHeroX + matchHeroWidth - 265} ${matchHeroY + matchHeroHeight - 140}, ${matchHeroX + matchHeroWidth - 70} ${matchHeroY + matchHeroHeight - 78}" fill="none" stroke="#ffffff" stroke-opacity="0.105" stroke-width="4" stroke-linecap="round"/>
    <line x1="${width / 2}" y1="${matchHeroY + 160}" x2="${width / 2}" y2="${matchHeroY + matchHeroHeight - 78}" stroke="#ffffff" stroke-opacity="0.055" stroke-width="3"/>
    <rect x="${matchHeroX + 38}" y="${matchHeroY + 24}" width="${matchHeroWidth - 76}" height="112" rx="40" fill="url(#matchHeroSheen)" opacity="0.62"/>
    <rect x="${matchHeroX + 40}" y="${matchHeroY + matchHeroHeight - 12}" width="${matchHeroWidth - 80}" height="18" rx="9" fill="#000000" opacity="0.2"/>
  </g>
  <rect x="${matchHeroX + 1}" y="${matchHeroY + 1}" width="${matchHeroWidth - 2}" height="${matchHeroHeight - 2}" rx="43" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  <rect x="${matchHeroX + 7}" y="${matchHeroY + 7}" width="${matchHeroWidth - 14}" height="${matchHeroHeight - 14}" rx="39" fill="none" stroke="#ffdb70" stroke-opacity="0.13" stroke-width="2"/>

  <rect x="170" y="324" width="740" height="68" rx="34" fill="#10261d"/>
  <text x="${width / 2}" y="369" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="900" fill="#ffdb70">${escapeXml(dateTimeLabel)}</text>

  ${buildShareCardTeamLogo(home, homeFlagX, flagY, 250, flagDataByCode)}
  ${buildShareCardTeamLogo(away, awayFlagX, flagY, 250, flagDataByCode)}

  <text x="${homeFlagX}" y="796" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="950" fill="#ffffff">${escapeXml(truncateText(home.country, nameMax))}</text>
  <text x="${homeFlagX}" y="834" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="850" fill="#9fb5aa">${escapeXml(home.code)}</text>
  <text x="${awayFlagX}" y="796" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="950" fill="#ffffff">${escapeXml(truncateText(away.country, nameMax))}</text>
  <text x="${awayFlagX}" y="834" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="850" fill="#9fb5aa">${escapeXml(away.code)}</text>

  <rect x="${width / 2 - 175}" y="${scoreY - 108}" width="350" height="184" rx="46" fill="url(#scorePlate)" filter="url(#cardShadow)"/>
  <rect x="${width / 2 - 144}" y="${scoreY - 80}" width="288" height="122" rx="34" fill="#ffffff" opacity="0.08"/>
  <text x="${width / 2}" y="${scoreY + 4}" text-anchor="middle" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="88" font-weight="950" fill="#ffffff">${escapeXml(score)}</text>

  <rect x="${width / 2 - 132}" y="${statusY - 38}" width="264" height="64" rx="32" fill="${statusFill}"/>
  <text x="${width / 2}" y="${statusY + 6}" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="950" fill="${statusTextFill}">${escapeXml(statusLabel)}</text>

  <rect x="112" y="900" width="856" height="112" rx="32" fill="#ffffff" opacity="0.09"/>
  <text x="${width / 2}" y="942" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="900" fill="#d8eadf">${escapeXml(venueLabel)}</text>
  <text x="${width / 2}" y="982" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="750" fill="#9fb5aa">${escapeXml(ui.localTournamentDashboard)}</text>

  <rect x="88" y="1018" width="904" height="590" rx="42" fill="url(#eventDeck)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
  <text x="${width / 2}" y="${eventStartY - 20}" text-anchor="middle" direction="${textDirection}" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="950" fill="#ffffff">${escapeXml(ui.matchEvents)}</text>
  <line x1="${width / 2}" y1="${eventStartY + 12}" x2="${width / 2}" y2="1544" stroke="#ffffff" stroke-opacity="0.15" stroke-width="3" stroke-linecap="round"/>
  ${buildShareEventColumn({
    events: eventGroups.home,
    height,
    isStory,
    players,
    side: 'home',
    team: home,
    ui,
    width: eventColumnWidth,
    x: eventLeftX,
    y: eventStartY,
  })}
  ${buildShareEventColumn({
    events: eventGroups.away,
    height,
    isStory,
    players,
    side: 'away',
    team: away,
    ui,
    width: eventColumnWidth,
    x: eventRightX,
    y: eventStartY,
  })}

  <rect x="${cardPadding}" y="1658" width="${width - cardPadding * 2}" height="76" rx="38" fill="#ffdb70" opacity="0.96"/>
  ${buildSvgTextBlock({
    anchor: 'middle',
    direction: textDirection,
    fill: '#14201b',
    fontSize: 25,
    fontWeight: 950,
    maxLines: 1,
    maxWidth: width - cardPadding * 2 - 60,
    value: `${roundLabel} / ${statusLabel}`,
    x: width / 2,
    y: 1708,
  })}

  ${buildSvgTextBlock({
    anchor: 'start',
    direction: textDirection,
    fill: '#ffffff',
    fontSize: 25,
    fontWeight: 850,
    maxLines: 1,
    maxWidth: footerTitleWidth,
    value: tournamentTitle,
    x: footerTitleX,
    y: footerY,
  })}
  <text x="${width - cardPadding}" y="${footerY}" text-anchor="end" direction="ltr" unicode-bidi="plaintext" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="750" fill="#cfe7d8">${escapeXml(tournamentPublicUrl.replace(/^https?:\/\//, ''))}</text>
</svg>`
}

async function generateMatchShareCardBlob({ format, match, players, teams, ui = getUiDictionary('en') }) {
  const flagDataByCode = await loadShareCardFlagData(getShareCardTeams(match, teams))
  const brandLogoUrl = await loadBrandLogoDataUrl()
  const svg = buildMatchShareCardSvg({ brandLogoUrl, flagDataByCode, format, match, players, teams, ui })
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = svgUrl

    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = format.width
    canvas.height = format.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, format.width, format.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not generate image.'))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function downloadMatchShareCard({ format, match, players, teams, ui = getUiDictionary('en') }) {
  const blob = await generateMatchShareCardBlob({ format, match, players, teams, ui })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = getMatchShareCardFileName(match, format.value)
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function shareMatchShareCard({ format, match, players, teams, ui = getUiDictionary('en') }) {
  const blob = await generateMatchShareCardBlob({ format, match, players, teams, ui })
  const file = new File([blob], getMatchShareCardFileName(match, format.value), {
    type: 'image/png',
  })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      text: ui.matchCardShareText,
      title: ui.tournamentTitle,
    })
    return 'shared'
  }

  await downloadMatchShareCard({ format, match, players, teams, ui })
  return 'downloaded'
}

function buildPosterSvg({ brandLogoUrl = brandLogoFallbackDataUrl, qrDataUrl, ui = getUiDictionary('en'), websiteUrl }) {
  const width = 1600
  const height = 2200
  const safeUrl = escapeXml(websiteUrl)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="posterBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07100d"/>
      <stop offset="52%" stop-color="#10261d"/>
      <stop offset="100%" stop-color="#163428"/>
    </linearGradient>
    <radialGradient id="posterGlow" cx="50%" cy="18%" r="65%">
      <stop offset="0%" stop-color="#2d7b5d" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#2d7b5d" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="posterBrandLogoClip">
      <rect x="632" y="190" width="336" height="336" rx="72"/>
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#posterBg)"/>
  <rect width="${width}" height="${height}" fill="url(#posterGlow)"/>
  <rect x="90" y="90" width="1420" height="2020" rx="72" fill="#f6f7f2"/>
  <rect x="134" y="134" width="1332" height="1932" rx="52" fill="#ffffff" stroke="#dce1d7" stroke-width="4"/>

  <rect x="632" y="190" width="336" height="336" rx="72" fill="#07100d" stroke="#ffdb70" stroke-width="8"/>
  <image href="${escapeXml(brandLogoUrl)}" xlink:href="${escapeXml(brandLogoUrl)}" x="632" y="190" width="336" height="336" preserveAspectRatio="xMidYMid slice" clip-path="url(#posterBrandLogoClip)"/>
  <rect x="632" y="190" width="336" height="336" rx="72" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="4"/>

  <text x="800" y="640" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="82" font-weight="950" fill="#14201b">${escapeXml(ui.tournamentTitle)}</text>
  <text x="800" y="730" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="#65756b">${escapeXml(ui.scanToFollow)}</text>

  <rect x="380" y="825" width="840" height="840" rx="58" fill="#10261d"/>
  <rect x="430" y="875" width="740" height="740" rx="34" fill="#ffffff"/>
  <image href="${escapeXml(qrDataUrl)}" x="472" y="917" width="656" height="656"/>

  <text x="800" y="1776" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="800" fill="#14201b">${safeUrl}</text>
  <rect x="420" y="1840" width="760" height="86" rx="43" fill="#163428"/>
  <text x="800" y="1896" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff">${escapeXml(ui.openCameraAndScan)}</text>
  <text x="800" y="2004" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#65756b">${escapeXml(ui.noLoginRequiredForSpectators)}</text>
</svg>`
}

async function generateQrPosterImage(websiteUrl = tournamentPublicUrl, ui = getUiDictionary('en')) {
  const qrDataUrl = await QRCode.toDataURL(websiteUrl, {
    color: {
      dark: '#10261d',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 900,
  })
  const brandLogoUrl = await loadBrandLogoDataUrl()
  const svg = buildPosterSvg({ brandLogoUrl, qrDataUrl, ui, websiteUrl })
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = svgUrl
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 2200
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error(ui.couldNotGeneratePoster))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function downloadQrPoster(websiteUrl = tournamentPublicUrl, ui = getUiDictionary('en')) {
  const blob = await generateQrPosterImage(websiteUrl, ui)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'deir-hanna-world-cup-qr-poster.png'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function buildPrintablePosterHtml({ posterSvg, ui = getUiDictionary('en') }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeXml(ui.tournamentTitle)} QR Poster</title>
        <style>
          html,
          body {
            margin: 0;
            min-height: 100%;
            background: #ffffff;
          }

          body {
            display: grid;
            place-items: center;
            font-family: Inter, Arial, sans-serif;
          }

          .poster-page {
            width: 100vw;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #ffffff;
          }

          .poster-sheet {
            width: min(100vw, 72.7vh);
            max-width: 820px;
            aspect-ratio: 8 / 11;
            display: grid;
            place-items: center;
            background: #ffffff;
          }

          .poster-sheet svg {
            display: block;
            width: 100%;
            height: 100%;
          }

          .loading {
            position: fixed;
            inset: auto 16px 16px;
            border-radius: 999px;
            background: #10261d;
            color: #ffffff;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 800;
          }

          body.poster-ready .loading {
            display: none;
          }

          @media print {
            @page { size: A4 portrait; margin: 0; }

            html,
            body {
              width: 100%;
              min-height: 100%;
              background: #ffffff;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .poster-page {
              width: 100vw;
              min-height: 100vh;
              background: #ffffff;
            }

            .poster-sheet {
              width: 100vw;
              height: 100vh;
              max-width: none;
              aspect-ratio: auto;
            }

            .poster-sheet svg {
              width: 100vw;
              height: 100vh;
              object-fit: contain;
            }

            .loading {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Printable poster only: no app navbar or admin UI. -->
        <main class="poster-page" aria-label="${escapeXml(ui.qrPosterPreview)}">
          <section class="poster-sheet">
            ${posterSvg}
          </section>
        </main>
        <div class="loading">${escapeXml(ui.preparing)}</div>
        <script>
          (function () {
            function waitForImage(image) {
              if (image.complete) return Promise.resolve();
              return new Promise(function (resolve) {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              });
            }

            async function waitForPrintableContent() {
              var images = Array.prototype.slice.call(document.images || []);
              await Promise.all(images.map(waitForImage));

              if (document.fonts && document.fonts.ready) {
                await document.fonts.ready.catch(function () {});
              }

              await new Promise(function (resolve) {
                requestAnimationFrame(function () {
                  requestAnimationFrame(resolve);
                });
              });

              document.body.classList.add('poster-ready');
              window.focus();
              window.print();
            }

            if (document.readyState === 'complete') {
              waitForPrintableContent();
            } else {
              window.addEventListener('load', waitForPrintableContent, { once: true });
            }
          }());
        </script>
      </body>
    </html>
  `
}

function printQrPoster({ posterSvg, ui = getUiDictionary('en') }) {
  if (!posterSvg) {
    throw new Error(ui.couldNotGeneratePoster)
  }

  const printableHtml = buildPrintablePosterHtml({ posterSvg, ui })
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error(ui.popUpBlockedPrint)
  }

  try {
    printWindow.opener = null
    printWindow.document.open()
    printWindow.document.write(printableHtml)
    printWindow.document.close()
  } catch (error) {
    printWindow.close()
    throw error
  }
}

function formatLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getOverviewMatchCenterMatches(matches, now = new Date()) {
  const todayKey = formatLocalDateKey(now)
  const currentTime = now.getTime()

  function rankMatch(match) {
    if (match.status === 'live') {
      return 0
    }

    const kickoffTime = getIsraelMatchKickoffTimestamp(match)

    if (match.status === 'scheduled' && kickoffTime && kickoffTime >= currentTime) {
      return 1
    }

    if (match.status === 'scheduled') {
      return 2
    }

    return 3
  }

  return [...matches]
    .filter((match) => match.date === todayKey)
    .sort((a, b) => rankMatch(a) - rankMatch(b) || compareMatchKickoffAsc(a, b))
    .slice(0, 2)
}

function getFinishedMatchesByLatestKickoff(matches) {
  return matches
    .filter((match) => match.status === 'final')
    .sort(compareMatchKickoffDesc)
}

function getLatestFinishedMatch(matches) {
  return getFinishedMatchesByLatestKickoff(matches)[0] ?? null
}

function getOverviewFeaturedMatch(matches) {
  const liveMatch = matches
    .filter((match) => match.status === 'live')
    .sort(compareMatchKickoffAsc)[0]

  if (liveMatch) return liveMatch

  const latestFinishedMatch = getLatestFinishedMatch(matches)
  if (latestFinishedMatch) return latestFinishedMatch

  return matches
    .filter((match) => match.status === 'scheduled')
    .sort(compareMatchKickoffAsc)[0] ?? null
}

function localizeStats(stats, ui) {
  const labelKeys = {
    Goals: 'goals',
    Live: 'live',
    Players: 'players',
    Teams: 'teams',
  }

  return stats.map((stat) => ({
    ...stat,
    label: ui[labelKeys[stat.label]] ?? stat.label,
  }))
}

function getStatusLabel(status, ui) {
  if (status === 'live') return ui.live
  if (status === 'final') return ui.finished
  if (status === 'scheduled') return ui.scheduled
  return status
}

function getTabLabel(tab, ui) {
  const labelKeys = {
    Details: 'details',
    Lineups: 'lineups',
    Matches: 'matches',
    Players: 'players',
    Standings: 'standings',
    Statistics: 'statistics',
  }

  return ui[labelKeys[tab]] ?? tab
}

function getShareCardFormatLabel(format, ui) {
  return ui[format.labelKey] ?? format.value
}

function isSuspendedForMatch(suspension, matchId) {
  return Boolean(suspension?.suspended && suspension.matchId === matchId)
}

function formatSuspensionReasons(suspension) {
  return suspension?.reasons?.length ? suspension.reasons.join(', ') : ''
}

function formatSuspensionDetail(suspension) {
  if (!suspension?.suspended) {
    return '-'
  }

  const match = suspension.match
  const matchLabel = match ? `${formatDate(match.date)} / ${match.time}` : 'next match'
  const reason = formatSuspensionReasons(suspension)

  return reason ? `${reason} - ${matchLabel}` : matchLabel
}

function formatTournamentYear(matches) {
  const firstMatch = [...matches].sort(compareMatchKickoffAsc)[0]
  return firstMatch?.date ? new Date(`${firstMatch.date}T12:00:00`).getFullYear() : 2026
}

function getCurrentStage(matches, ui = getUiDictionary('en')) {
  const live = matches.find((match) => match.status === 'live')
  if (live) return isLeagueStage(live.stage) ? ui.groupStage : getMatchRoundLabel(live, ui)

  const upcoming = getUpcomingMatches(matches)[0]
  if (upcoming) return isLeagueStage(upcoming.stage) ? ui.groupStage : getMatchRoundLabel(upcoming, ui)

  return ui.completed
}

function getStageLabel(stage, ui = getUiDictionary('en')) {
  if (isLeagueStage(stage)) return ui.groupStage
  if (stage === tournamentFormat.stages.semiFinal) return ui.semiFinals
  if (stage === tournamentFormat.stages.thirdPlace) return ui.thirdPlace
  if (stage === tournamentFormat.stages.final) return ui.final
  return stageLabels[stage] ?? stage
}

function getShortStageLabel(stage, ui = getUiDictionary('en')) {
  if (stage === tournamentFormat.stages.semiFinal) return ui.semiFinal
  if (stage === tournamentFormat.stages.thirdPlace) return ui.thirdPlace
  if (stage === tournamentFormat.stages.final) return ui.final
  return getShortMatchStageLabel(stage)
}

function getKnockoutDecisionLabel(stage, ui = getUiDictionary('en')) {
  if (stage === tournamentFormat.stages.semiFinal) return ui.winnerAdvances
  if (stage === tournamentFormat.stages.final) return ui.championDecided
  if (stage === tournamentFormat.stages.thirdPlace) return ui.thirdPlaceDecided
  return ''
}

function getTournamentTableLabel(ui = getUiDictionary('en')) {
  return ui.groupStage
}

function getLocalizedGroupLabel(groupCode, ui = getUiDictionary('en')) {
  if (groupCode === 'A') return ui.groupA
  if (groupCode === 'B') return ui.groupB
  return getGroupLabel(groupCode)
}

function getMatchRoundLabel(match, ui = getUiDictionary('en')) {
  if (isLeagueStage(match.stage)) {
    return ui.t('roundShort', { round: match.matchday ?? 1 })
  }

  return getShortStageLabel(match.stage, ui)
}

function getMatchCompetitionLabel(match, ui = getUiDictionary('en')) {
  if (isLeagueStage(match.stage)) {
    return `${ui.tournamentTitle}, ${getTournamentTableLabel(ui)}`
  }

  return `${ui.tournamentTitle}, ${getMatchRoundLabel(match, ui)}`
}

function matchBelongsToRound(match, roundId) {
  if (roundId.startsWith('group-')) {
    return isLeagueStage(match.stage) && Number(match.matchday ?? 1) === Number(roundId.replace('group-', ''))
  }

  return match.stage === roundId
}

function getRoundOptionLabel(roundId, ui = getUiDictionary('en')) {
  if (roundId.startsWith('group-')) {
    return ui.t('roundShort', { round: roundId.replace('group-', '') })
  }

  return getShortStageLabel(roundId, ui)
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
    matches: sectionMatches.sort(compareMatchKickoffAsc),
  }))
}

function getTeamMatches(allMatches, teamId) {
  return allMatches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .sort(compareMatchKickoffAsc)
}

function getTeamStandingRow(standings, teamId) {
  return Object.values(standings)
    .flat()
    .find((row) => row.team.id === teamId)
}

function getTeamStandingsRows(standings, teamId) {
  const row = getTeamStandingRow(standings, teamId)
  return row ? standings[row.group] ?? [] : []
}

function getMatchStandingsRows(standings, match) {
  const groupCode = match.group || getTeamStandingRow(standings, match.homeTeamId)?.group
  return groupCode ? standings[groupCode] ?? [] : []
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

function formatStandingRecord(standing, ui) {
  if (!standing || standing.played === 0) {
    return ui.noRecordYet
  }

  return `${ui.playedShort} ${standing.played} / ${standing.won}-${standing.drawn}-${standing.lost} / ${ui.pointsShort} ${standing.points}`
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

function App() {
  const [tournamentData, setTournamentData] = useState(emptyTournamentData)
  const [language, setLanguage] = useState(() => getStoredLanguage())
  const [themePreference, setThemePreference] = useState(() => getStoredThemePreference())
  const [votes, setVotes] = useState({})
  const [route, setRoute] = useState(() => parseHashRoute())
  const [routeBackStack, setRouteBackStack] = useState([])
  const [activeView, setActiveView] = useState('overview')
  const [overviewShortcutActive, setOverviewShortcutActive] = useState(false)
  const [quickModeMatchId, setQuickModeMatchId] = useState('')
  const [session, setSession] = useState(null)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appError, setAppError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [liveClockNow, setLiveClockNow] = useState(() => new Date())
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const ui = useMemo(() => getUiDictionary(language), [language])
  const displayTournamentData = useMemo(
    () => localizeTournamentData(tournamentData, language),
    [language, tournamentData],
  )
  const { teams, players, matches, knockoutMatches, lineups } = displayTournamentData
  const allMatches = useMemo(
    () => [...matches, ...knockoutMatches],
    [knockoutMatches, matches],
  )

  const standings = useMemo(() => calculateStandings(teams, matches), [matches, teams])
  const suspensions = useMemo(
    () => calculateSuspensions(players, allMatches),
    [allMatches, players],
  )
  const leaderboards = useMemo(() => getLeaderboards(players, teams), [players, teams])
  const teamGoalStats = useMemo(() => getTeamGoalStats(allMatches, teams), [allMatches, teams])
  const playersById = useMemo(() => getPlayersById(players), [players])
  const playersByTeam = useMemo(() => getPlayersByTeam(players), [players])
  const stats = useMemo(
    () => getTournamentStats(allMatches, teams, players),
    [allMatches, players, teams],
  )
  const localizedStats = useMemo(() => localizeStats(stats, ui), [stats, ui])
  const upcomingMatches = useMemo(
    () => getUpcomingMatches(allMatches),
    [allMatches],
  )
  const liveMatches = useMemo(
    () => allMatches.filter((match) => match.status === 'live'),
    [allMatches],
  )
  const hasLiveMatches = liveMatches.length > 0
  const liveMatch = useMemo(
    () => getOverviewFeaturedMatch(allMatches),
    [allMatches],
  )
  const latestResults = useMemo(
    () => getFinishedMatchesByLatestKickoff(allMatches).slice(0, 3),
    [allMatches],
  )
  const languageDirection = getLanguageDirection(language)
  const resolvedTheme = themePreference

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)
    storeLanguage(nextLanguage)
  }

  function handleThemeChange(nextThemePreference) {
    const normalizedThemePreference = normalizeThemePreference(nextThemePreference)
    setThemePreference(normalizedThemePreference)
    storeThemePreference(normalizedThemePreference)
  }

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
      const [nextTournamentData, nextVotes] = await Promise.all([
        loadTournamentData(),
        loadVotes(),
      ])

      setTournamentData(nextTournamentData)
      setVotes(nextVotes)
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
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themePreference = themePreference
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme, themePreference])

  useEffect(() => {
    function handleHashChange() {
      setRoute(parseHashRoute())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    function handlePopState(event) {
      const nextRoute = parseHashRoute()
      setRoute(nextRoute)

      if (nextRoute.type !== 'main') {
        return
      }

      if (event.state?.activeView) {
        setActiveView(event.state.activeView)
        setOverviewShortcutActive(Boolean(event.state.fromOverviewShortcut))
        return
      }

      setActiveView('overview')
      setOverviewShortcutActive(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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
    const clock = window.setInterval(() => setLiveClockNow(new Date()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    function updateHeader() {
      const currentScrollY = Math.max(0, window.scrollY)
      const nextCollapsed = currentScrollY > lastScrollY && currentScrollY > 72

      setHeaderCollapsed((previous) => (previous === nextCollapsed ? previous : nextCollapsed))

      lastScrollY = currentScrollY
      ticking = false
    }

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
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

  function handleViewSelect(viewId) {
    clearHashRoute()
    setRoute({ type: 'main' })
    setRouteBackStack([])
    setOverviewShortcutActive(false)
    setActiveView(viewId)
  }

  function handleOverviewShortcutSelect(viewId) {
    pushMainViewState(viewId, true)
    setRoute({ type: 'main' })
    setRouteBackStack([])
    setOverviewShortcutActive(true)
    setActiveView(viewId)
  }

  function returnToOverview() {
    replaceMainRoute()
    setRoute({ type: 'main' })
    setRouteBackStack([])
    setOverviewShortcutActive(false)
    setActiveView('overview')
  }

  function getCurrentRouteTarget() {
    return route.type === 'main'
      ? { type: 'main', view: activeView, fromOverviewShortcut: overviewShortcutActive }
      : { type: 'detail', route }
  }

  function navigateToDetail(type, id) {
    setRouteBackStack((stack) => [...stack, getCurrentRouteTarget()])
    setHashRoute(type, id)
  }

  function openMatch(matchId) {
    navigateToDetail('match', matchId)
  }

  function openTeam(teamId) {
    navigateToDetail('team', teamId)
  }

  function openPlayer(playerId) {
    navigateToDetail('player', playerId)
  }

  function navigateToBackTarget(target, fallbackView) {
    if (!target || target.type === 'main') {
      replaceMainRoute()
      setRoute({ type: 'main' })
      setOverviewShortcutActive(Boolean(target?.fromOverviewShortcut))
      setActiveView(target?.view ?? fallbackView)
      return
    }

    replaceHashRoute(target.route.type, target.route.id)
    setRoute(target.route)
  }

  function handleDetailBack(fallbackView) {
    const target = routeBackStack.at(-1)
    setRouteBackStack((stack) => stack.slice(0, -1))
    navigateToBackTarget(target, fallbackView)
  }

  async function handleAddTeam(teamDraft) {
    const id = makeUniqueId(
      'team',
      teamDraft.code || teamDraft.countryEn,
      new Set(teams.map((team) => team.id)),
    )

    await runMutation(async () => {
      await saveTeam({
        id,
        country: teamDraft.countryEn.trim(),
        countryEn: teamDraft.countryEn.trim(),
        countryHe: teamDraft.countryHe.trim(),
        countryAr: teamDraft.countryAr.trim(),
        code: teamDraft.code.trim().toUpperCase(),
        group: getTeamGroupCode(teamDraft),
        color: teamDraft.color,
        secondary: teamDraft.secondary,
      })
    })
  }

  async function handleSaveTeam(teamDraft) {
    await runMutation(async () => {
      await saveTeam({
        ...teamDraft,
        country: teamDraft.countryEn.trim(),
        countryEn: teamDraft.countryEn.trim(),
        countryHe: teamDraft.countryHe.trim(),
        countryAr: teamDraft.countryAr.trim(),
        code: teamDraft.code.trim().toUpperCase(),
        group: getTeamGroupCode(teamDraft),
      })
    })
  }

  async function handleDeleteTeam(teamId) {
    await runMutation(async () => {
      await deleteTeam(teamId)
    })
  }

  async function handleAddPlayer(playerDraft) {
    const id = makeUniqueId(
      'p',
      `${playerDraft.teamId}-${playerDraft.nameEn}`,
      new Set(players.map((player) => player.id)),
    )
    const player = {
      id,
      name: playerDraft.nameEn.trim(),
      nameEn: playerDraft.nameEn.trim(),
      nameHe: playerDraft.nameHe.trim(),
      nameAr: playerDraft.nameAr.trim(),
      teamId: playerDraft.teamId,
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

  async function handleSavePlayer(playerDraft) {
    await runMutation(async () => {
      await savePlayer({
        ...playerDraft,
        name: playerDraft.nameEn.trim(),
        nameEn: playerDraft.nameEn.trim(),
        nameHe: playerDraft.nameHe.trim(),
        nameAr: playerDraft.nameAr.trim(),
      })
    })
  }

  async function handleDeletePlayer(playerId) {
    await runMutation(async () => {
      await deletePlayer(playerId)
    })
  }

  function normalizeMatchDraft(matchDraft) {
    const groupStage = isLeagueStage(matchDraft.stage)

    return {
      ...matchDraft,
      group: groupStage
        ? matchDraft.group || getTeamGroupCode(teams.find((team) => team.id === matchDraft.homeTeamId))
        : undefined,
      matchday: Number(matchDraft.matchday),
      homeTeamId: matchDraft.homeTeamId || undefined,
      awayTeamId: matchDraft.awayTeamId || undefined,
      homeLabel: groupStage || matchDraft.homeTeamId ? undefined : matchDraft.homeLabel || undefined,
      awayLabel: groupStage || matchDraft.awayTeamId ? undefined : matchDraft.awayLabel || undefined,
      venue: tournamentFormat.fixedVenueEn,
      venueEn: tournamentFormat.fixedVenueEn,
      venueHe: tournamentFormat.fixedVenueHe,
      venueAr: tournamentFormat.fixedVenueAr,
      homeScore: normalizeScore(matchDraft.homeScore),
      awayScore: normalizeScore(matchDraft.awayScore),
      minute: normalizeScore(matchDraft.minute),
      matchPhase: matchDraft.matchPhase || undefined,
      phaseStartedAt: matchDraft.phaseStartedAt || undefined,
      pauseStartedAt: matchDraft.pauseStartedAt || undefined,
      phasePausedSeconds: normalizeScore(matchDraft.phasePausedSeconds) ?? 0,
      previousPhase: matchDraft.previousPhase || undefined,
      matchStartTime: matchDraft.matchStartTime || undefined,
      matchEndTime: matchDraft.matchEndTime || undefined,
      firstHalfStartTime: matchDraft.firstHalfStartTime || undefined,
      firstHalfEndTime: matchDraft.firstHalfEndTime || undefined,
      secondHalfStartTime: matchDraft.secondHalfStartTime || undefined,
      secondHalfEndTime: matchDraft.secondHalfEndTime || undefined,
      events: (matchDraft.events ?? []).map((event) => ({
        ...event,
        automatic: Boolean(event.automatic),
        minute: Number(event.minute),
        eventPhase: event.eventPhase || undefined,
        displayMinute: event.displayMinute || undefined,
        type: event.type ?? 'goal',
        playerId: event.playerId || undefined,
        assistPlayerId: event.assistPlayerId || undefined,
        reason: event.reason || undefined,
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
    validateMatchDraft(match, ui)

    await runMutation(async () => {
      await saveMatchAndLineups(match)
    })
  }

  async function handleAddMatch(matchDraft) {
    const draftContestantKey = `${getContestantKey(matchDraft, 'home')}-${getContestantKey(matchDraft, 'away')}`
    const id = makeUniqueId(
      'match',
      `${draftContestantKey}-${matchDraft.date}`,
      new Set(allMatches.map((match) => match.id)),
    )
    const match = normalizeMatchDraft({
      ...matchDraft,
      id,
      status: 'scheduled',
      minute: undefined,
      matchPhase: matchPhases.scheduled,
      phaseStartedAt: undefined,
      pauseStartedAt: undefined,
      phasePausedSeconds: 0,
      previousPhase: undefined,
      matchStartTime: undefined,
      matchEndTime: undefined,
      firstHalfStartTime: undefined,
      firstHalfEndTime: undefined,
      secondHalfStartTime: undefined,
      secondHalfEndTime: undefined,
      events: [],
    })
    validateMatchDraft(match, ui)

    await runMutation(async () => {
      await saveMatchAndLineups(match)
    })
  }

  async function handleDeleteMatch(matchId) {
    await runMutation(async () => {
      await deleteMatch(matchId)
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

  async function handleInviteAdmin(email) {
    setAppError('')
    setAuthNotice('')

    try {
      const invitedEmail = await inviteAdmin(email)
      setAuthNotice(ui.t('adminInviteSuccess', { email: invitedEmail }))
      return invitedEmail
    } catch (error) {
      setAppError(error.message)
      throw error
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

  const routeMatch = route.type === 'match'
    ? allMatches.find((match) => match.id === route.id)
    : null
  const routeTeam = route.type === 'team'
    ? teams.find((team) => team.id === route.id)
    : null
  const routePlayer = route.type === 'player'
    ? playersById[route.id]
    : null
  const quickModeMatch = adminUnlocked && quickModeMatchId
    ? allMatches.find((match) => match.id === quickModeMatchId)
    : null
  const isDetailRoute = route.type !== 'main'
  const pageTransitionKey = isDetailRoute ? `${route.type}-${route.id ?? 'missing'}` : activeView

  return (
    <UiTextContext.Provider value={ui}>
    <main
      className={`app-shell theme-${resolvedTheme} min-h-screen bg-[#f6f7f2] text-[#14201b]`}
      data-active-view={activeView}
      data-route-type={route.type}
      data-theme={resolvedTheme}
      data-theme-preference={themePreference}
      dir={languageDirection}
    >
      <Header
        activeView={activeView}
        isCollapsed={headerCollapsed}
        language={language}
        onLanguageChange={handleLanguageChange}
        onThemeChange={handleThemeChange}
        onViewSelect={handleViewSelect}
        resolvedTheme={resolvedTheme}
        themePreference={themePreference}
      />

      {!isDetailRoute && activeView !== 'admin' && (
        <TournamentHeader
          allMatches={allMatches}
          liveMatch={liveMatch}
          now={liveClockNow}
          stats={localizedStats}
          teams={teams}
        />
      )}

      <section
        key={pageTransitionKey}
        className={`page-transition-shell mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 ${hasLiveMatches && activeView !== 'admin' ? 'pb-28' : ''}`}
      >
        {appError && <ErrorBanner message={appError} onDismiss={() => setAppError('')} />}
        {!isDetailRoute && overviewShortcutActive && activeView !== 'overview' && activeView !== 'admin' && (
          <BackToOverviewButton onClick={returnToOverview} />
        )}
        {route.type === 'match' && routeMatch && (
          <MatchCenterPage
            allMatches={allMatches}
            match={routeMatch}
            onBack={() => handleDetailBack('matches')}
            onMatchSelect={openMatch}
            onPlayerSelect={openPlayer}
            onTeamSelect={openTeam}
            onVote={handleVote}
            now={liveClockNow}
            players={players}
            standings={standings}
            suspensions={suspensions}
            teams={teams}
            votes={votes}
          />
        )}
        {route.type === 'team' && routeTeam && (
          <TeamPage
            allMatches={allMatches}
            onBack={() => handleDetailBack('teams')}
            onMatchSelect={openMatch}
            onPlayerSelect={openPlayer}
            players={playersByTeam[routeTeam.id] ?? []}
            standings={standings}
            suspensions={suspensions}
            team={routeTeam}
            teams={teams}
          />
        )}
        {route.type === 'player' && routePlayer && (
          <PlayerPage
            allMatches={allMatches}
            onBack={() => handleDetailBack('teams')}
            onMatchSelect={openMatch}
            onTeamSelect={openTeam}
            player={routePlayer}
            suspension={getPlayerSuspension(suspensions, routePlayer.id)}
            teams={teams}
          />
        )}
        {isDetailRoute && !routeMatch && !routeTeam && !routePlayer && (
          <NotFoundPanel onBack={() => handleDetailBack('matches')} />
        )}
        {!isDetailRoute && activeView === 'overview' && (
          <Overview
            allMatches={allMatches}
            knockoutMatches={knockoutMatches}
            leaderboards={leaderboards}
            latestResults={latestResults}
            lineups={lineups}
            liveMatch={liveMatch}
            now={liveClockNow}
            onMatchSelect={openMatch}
            onPlayerSelect={openPlayer}
            onTeamSelect={openTeam}
            onShortcutSelect={handleOverviewShortcutSelect}
            onVote={handleVote}
            players={players}
            playersById={playersById}
            standings={standings}
            stats={localizedStats}
            teams={teams}
            upcomingMatches={upcomingMatches}
            votes={votes}
          />
        )}
        {!isDetailRoute && activeView === 'teams' && (
          <TeamsBoard
            onTeamSelect={openTeam}
            playersByTeam={playersByTeam}
            standings={standings}
            teams={teams}
          />
        )}
        {!isDetailRoute && activeView === 'matches' && (
          <MatchesBoard
            lineups={lineups}
            matches={allMatches}
            now={liveClockNow}
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
          <KnockoutBoard
            matches={knockoutMatches}
            onBack={() => setActiveView('overview')}
            onMatchSelect={openMatch}
            teams={teams}
          />
        )}
        {!isDetailRoute && activeView === 'leaders' && (
          <LeadersBoard
            leaderboards={leaderboards}
            onPlayerSelect={openPlayer}
            teamGoalStats={teamGoalStats}
          />
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
            onDeleteMatch={handleDeleteMatch}
            onDeletePlayer={handleDeletePlayer}
            onDeleteTeam={handleDeleteTeam}
            onInviteAdmin={handleInviteAdmin}
            onOpenQuickMode={setQuickModeMatchId}
            onSaveMatch={handleSaveMatch}
            onSavePlayer={handleSavePlayer}
            onSaveTeam={handleSaveTeam}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            now={liveClockNow}
            players={players}
            suspensions={suspensions}
            standings={standings}
            teams={teams}
          />
        )}
      </section>
      {activeView !== 'admin' && !quickModeMatch && (
        <LiveNowFloatingBadge
          liveMatches={liveMatches}
          now={liveClockNow}
          onMatchSelect={openMatch}
          teams={teams}
        />
      )}
      {activeView !== 'admin' && <PublicFooter />}
      {adminUnlocked && quickModeMatch && (
        <AdminQuickModeScreen
          key={quickModeMatch.id}
          match={quickModeMatch}
          now={liveClockNow}
          onClose={() => setQuickModeMatchId('')}
          onSaveMatch={handleSaveMatch}
          players={players}
          suspensions={suspensions}
          teams={teams}
        />
      )}
    </main>
    </UiTextContext.Provider>
  )
}

function BrandLogo({ className = '', imageClassName = '', loading = 'eager' }) {
  return (
    <span className={`brand-logo grid shrink-0 place-items-center overflow-hidden bg-[#07100d] ${className}`}>
      <img
        alt=""
        className={`brand-logo-image ${imageClassName}`}
        decoding="async"
        loading={loading}
        src={brandLogoPath}
      />
    </span>
  )
}

function Header({
  activeView,
  isCollapsed,
  language,
  onLanguageChange,
  onThemeChange,
  onViewSelect,
  resolvedTheme,
  themePreference,
}) {
  const ui = useUiText()
  const headerNavItems = publicNavItems

  return (
    <header className={`tournament-header sticky top-0 z-20 border-b border-[#dce1d7] bg-[#f6f7f2]/95 shadow-sm mobile-shadow-light ${isCollapsed ? 'tournament-header-collapsed' : ''}`}>
      <div
        className="tournament-header-shell mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
      >
        <div className={`tournament-header-brand flex min-w-0 items-center gap-3 ${isCollapsed ? 'tournament-header-brand-collapsed' : ''}`}>
          <BrandLogo className="h-11 w-11 rounded-lg shadow-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#14201b]">
              {ui.tournamentTitle}
            </p>
            <p className="truncate text-xs text-[#65756b]">{ui.localTournamentDashboard}</p>
          </div>
        </div>
        <div className="tournament-header-nav flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
          <div className={`tournament-header-language flex items-center gap-2 ${isCollapsed ? 'tournament-header-language-collapsed' : ''}`}>
            <ThemeSelector
              onChange={onThemeChange}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
            />
            <LanguageSelector language={language} onChange={onLanguageChange} />
          </div>
          <nav className="scrollbar-none -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:pb-0" aria-label="Main views">
            {headerNavItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-tab tap-target relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                    isActive
                      ? 'nav-tab-active bg-white text-[#14201b] shadow-sm'
                      : 'text-[#65756b] hover:bg-white hover:text-[#14201b]'
                  }`}
                  onClick={() => onViewSelect(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {ui[item.labelKey]}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

function ThemeSelector({ onChange, resolvedTheme, themePreference }) {
  const ui = useUiText()

  return (
    <div
      aria-label={ui.appearance}
      className="theme-toggle"
      role="group"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon
        const active = themePreference === option.id

        return (
          <button
            aria-label={ui[option.labelKey]}
            aria-pressed={active}
            className="theme-toggle-option tap-target"
            data-active={active ? 'true' : 'false'}
            data-resolved={active ? resolvedTheme : undefined}
            key={option.id}
            onClick={() => onChange(option.id)}
            title={ui[option.labelKey]}
            type="button"
          >
            <Icon className="h-4 w-4" />
            <span className="theme-toggle-label">{ui[option.labelKey]}</span>
            <span className="sr-only">{ui[option.labelKey]}</span>
          </button>
        )
      })}
    </div>
  )
}

function LanguageSelector({ language, onChange }) {
  const ui = useUiText()

  return (
    <label className="tap-target flex shrink-0 items-center gap-2 rounded-md border border-[#dce1d7] bg-white px-2 py-1 text-xs font-semibold text-[#34433a] shadow-sm">
      <Languages className="h-4 w-4 text-[#65756b]" />
      <select
        aria-label={ui.language}
        className="min-h-9 bg-transparent text-sm font-semibold outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={language}
      >
        {languageOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.shortLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function TournamentHeader({ allMatches, liveMatch, now, stats, teams }) {
  const ui = useUiText()
  const year = formatTournamentYear(allMatches)
  const currentStage = getCurrentStage(allMatches, ui)
  const nextMatch = getUpcomingMatches(allMatches)[0]
  const matchCount = allMatches.length

  return (
    <section className="hero-section relative overflow-hidden border-b border-[#10261d] bg-[#10261d] text-white">
      <img
        alt=""
        aria-hidden="true"
        className="hero-cover-image"
        decoding="async"
        fetchPriority="high"
        src={brandCoverPath}
      />
      <div className="hero-photo-tint absolute inset-0" aria-hidden="true" />
      <div className="hero-photo-gradient absolute inset-0" aria-hidden="true" />
      <div className="hero-photo-bottom absolute inset-x-0 bottom-0 h-32" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl min-w-0 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)] lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <BrandLogo className="h-16 w-16 rounded-xl shadow-lg ring-1 ring-white/20" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#cfe7d8]">{ui.tournamentTitle}</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold leading-none sm:text-3xl">{year}</h1>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#cfe7d8]">
                {currentStage}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#cfe7d8]">
              <span>{teams.length} {ui.teams}</span>
              <span>{tournamentFormat.groupKeys.length} {ui.table}</span>
              <span>{matchCount} {ui.matches}</span>
              <span>{ui.topTwoEachGroup}</span>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          {nextMatch && (
            <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-[#cfe7d8]">{ui.nextMatch}</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {formatLongDate(nextMatch.date)} / {nextMatch.time}
              </p>
              <MatchCountdown className="mt-2" match={nextMatch} now={now} />
            </div>
          )}
          <StatsStrip stats={stats} />
          {liveMatch && <LiveMatch match={liveMatch} now={now} teams={teams} />}
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
  const ui = useUiText()

  return (
    <section className="rounded-lg border border-[#dce1d7] bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold text-[#14201b]">{ui.pageNotFound}</h1>
      <p className="mt-2 text-sm text-[#65756b]">
        {ui.pageNotFoundDetail}
      </p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        {ui.back}
      </button>
    </section>
  )
}

function BackToOverviewButton({ onClick }) {
  const ui = useUiText()

  return (
    <button
      type="button"
      className="tap-target mb-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dce1d7] bg-white px-4 text-sm font-black text-[#14201b] shadow-sm hover:border-[#9cb4a5] hover:bg-[#fbfdf9]"
      onClick={onClick}
    >
      <ArrowLeft className="back-overview-icon h-4 w-4 text-[#1f6d4d]" />
      {ui.backToOverview}
    </button>
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
          admin email to `admin_users`, then enter real tournament data from the Admin page.
        </div>
      </section>
    </main>
  )
}

function LoadingState() {
  const ui = useUiText()

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f2] px-4 text-[#14201b]">
      <section className="skeleton-panel rounded-lg border border-[#dce1d7] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#eef3e9] text-[#1f6d4d]">
          <Timer className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold">{ui.loadingTournamentData}</h1>
        <p className="mt-2 text-sm text-[#65756b]">{ui.connectingToSupabase}</p>
      </section>
    </main>
  )
}

function ErrorBanner({ message, onDismiss }) {
  const ui = useUiText()

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#e4b4b4] bg-[#fff7f7] p-4 text-sm text-[#7b2b2b] sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        className="tap-target rounded-md border border-[#e4b4b4] bg-white px-3 py-1.5 text-xs font-semibold"
        onClick={onDismiss}
      >
        {ui.dismiss}
      </button>
    </div>
  )
}

function Overview({
  allMatches,
  knockoutMatches,
  leaderboards,
  liveMatch,
  now,
  onMatchSelect,
  onPlayerSelect,
  onTeamSelect,
  onShortcutSelect,
  onVote,
  players,
  standings,
  teams,
  votes,
}) {
  return (
    <div className="grid min-w-0 gap-4">
      <SpectatorQuickLinks liveMatch={liveMatch} onShortcutSelect={onShortcutSelect} />
      <OverviewMatchCenter
        allMatches={allMatches}
        now={now}
        onMatchSelect={onMatchSelect}
        onVote={onVote}
        players={players}
        standings={standings}
        teams={teams}
        votes={votes}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
        <GroupSnapshot onTeamSelect={onTeamSelect} standings={standings} />
        <TopScorersPreview
          onPlayerSelect={onPlayerSelect}
          players={leaderboards.goals.slice(0, 5)}
        />
      </div>
      <KnockoutPanel matches={knockoutMatches} teams={teams} />
    </div>
  )
}

function OverviewMatchCenter({
  allMatches,
  now,
  onMatchSelect,
  onVote,
  players,
  standings,
  teams,
  votes,
}) {
  const ui = useUiText()
  const matches = getOverviewMatchCenterMatches(allMatches, now)

  return (
    <section className="premium-card motion-card content-auto min-w-0 overflow-hidden rounded-xl border border-[#dce1d7] bg-white shadow-sm">
      <div className="bg-[#10261d] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#8fd8aa]">{ui.todayMatches}</p>
            <h2 className="mt-1 text-2xl font-black leading-tight">{ui.matchCenter}</h2>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#d8eadf]">
            {formatLongDate(formatLocalDateKey(now))}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="grid min-w-0 gap-3">
          {matches.length ? (
            matches.map((match) => (
              <OverviewMatchCenterCard
                key={match.id}
                match={match}
                now={now}
                onMatchSelect={onMatchSelect}
                onVote={onVote}
                players={players}
                teams={teams}
                votes={votes}
              />
            ))
          ) : (
            <EmptyState text={ui.noMatchesToday} />
          )}
        </div>

        <aside className="grid min-w-0 gap-3 rounded-xl border border-[#dce1d7] bg-[#fbfdf9] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#163428] text-white">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[#14201b]">{ui.qualificationRace}</h3>
              <p className="truncate text-xs text-[#65756b]">{ui.topTwoEachGroup}</p>
            </div>
          </div>
          <QualificationRace standings={standings} />
        </aside>
      </div>
    </section>
  )
}

function OverviewMatchCenterCard({ match, now, onMatchSelect, onVote, players, teams, votes }) {
  const ui = useUiText()
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const liveClock = match.status === 'live' ? getLiveClock(match, now) : null
  const venue = getVenueName(match, ui.currentLanguage)

  return (
    <article
      className="overview-match-card premium-card grid min-w-0 gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#10261d] p-3 text-white shadow-sm transition hover:border-[#74d6a0]/55 sm:p-4"
    >
      <button
        type="button"
        className="tap-target grid min-w-0 gap-3 text-left"
        onClick={() => onMatchSelect?.(match.id)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#8fd8aa]">
              {getMatchRoundLabel(match, ui)}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#d8eadf]">
              {match.time} / {venue}
            </p>
            <MatchCountdown className="mt-2" match={match} now={now} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {liveClock?.displayMinute && (
              <span className="rounded-full bg-[#bd1f36] px-2.5 py-1 text-xs font-black text-white">
                {liveClock.displayMinute}
              </span>
            )}
            <StatusPill status={match.status} />
          </div>
        </div>

        <OverviewMatchScoreRows match={match} home={home} away={away} />
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-white">
          <p className="text-3xl font-black leading-none sm:text-4xl">
            <MatchScoreText match={match} />
          </p>
          <p className="mt-1 text-xs font-semibold text-[#cfe7d8]">
            {match.status === 'live' ? ui.live : match.status === 'scheduled' ? ui.kickoff : ui.finished}
          </p>
        </div>
      </button>

      <OverviewMatchEvents match={match} players={players} />
      {match.homeTeamId && match.awayTeamId && (
        <PredictionVote compact match={match} onVote={onVote} teams={teams} votes={votes} />
      )}
    </article>
  )
}

function OverviewMatchScoreRows({ away, home, match }) {
  const hasScore = match.status !== 'scheduled' || isScoredMatch(match)
  const homeScore = hasScore ? normalizeScore(match.homeScore) ?? 0 : '—'
  const awayScore = hasScore ? normalizeScore(match.awayScore) ?? 0 : '—'

  return (
    <div className="grid min-w-0 gap-2" dir="ltr">
      <OverviewMatchScoreRow score={homeScore} team={home} />
      <OverviewMatchScoreRow score={awayScore} team={away} />
    </div>
  )
}

function OverviewMatchScoreRow({ score, team }) {
  const ui = useUiText()

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5">
      <FlagMark team={team} />
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white" dir="auto">
          {team?.country ?? ui.tbd}
        </p>
        <p className="text-xs font-semibold text-[#9fb5aa]" dir="auto">
          {team?.code ?? ui.tbd}
        </p>
      </div>
      <span className="min-w-10 rounded-lg bg-white px-2.5 py-1 text-center text-lg font-black text-[#10261d]">
        {score}
      </span>
    </div>
  )
}

function OverviewMatchEvents({ match, players }) {
  const ui = useUiText()
  const events = normalizeMatchDisciplineEvents(match.events ?? [])
    .filter((event) => [liveEventTypes.goal, liveEventTypes.ownGoal, liveEventTypes.penaltyGoal].includes(event.type))
    .sort((a, b) => Number(a.minute ?? 0) - Number(b.minute ?? 0))

  if (!events.length) {
    return (
      <p className="overview-match-empty rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#cfe7d8]">
        {match.status === 'scheduled' ? ui.scheduled : ui.noMatchEventsYet}
      </p>
    )
  }

  return (
    <div className="overview-match-events grid min-w-0 gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
      {events.slice(0, 4).map((event, index) => (
        <div
          className="grid min-w-0 grid-cols-[42px_30px_minmax(0,1fr)] items-center gap-2 rounded-md bg-white/10 px-2 py-1.5"
          key={`${match.id}-overview-event-${event.minute}-${event.type}-${index}`}
        >
          <span className="text-xs font-bold text-[#cfe7d8]">{formatStoredEventMinute(event)}</span>
          <EventTypeIcon type={event.type} />
          <span className="min-w-0 break-words text-sm font-semibold leading-tight text-white" dir="auto">
            {getEventPlayerDisplayName(event, players, ui)}
          </span>
        </div>
      ))}
    </div>
  )
}

function SpectatorQuickLinks({ liveMatch, onShortcutSelect }) {
  const ui = useUiText()
  const links = [
    { id: 'matches', label: liveMatch?.status === 'live' ? ui.liveMatch : ui.todayMatches, icon: CalendarDays },
    { id: 'tables', label: ui.standings, icon: Table2 },
    { id: 'knockout', label: ui.knockout, icon: Trophy },
    { id: 'leaders', label: ui.topScorer, icon: Medal },
  ]

  return (
    <section className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={ui.quickLinks}>
      {links.map((link) => {
        const Icon = link.icon

        return (
          <button
            key={link.id}
            type="button"
            className="tap-target inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#dce1d7] bg-white px-4 text-sm font-semibold text-[#34433a] shadow-sm hover:border-[#9cb4a5]"
            onClick={() => onShortcutSelect?.(link.id)}
          >
            <Icon className="h-4 w-4 text-[#1f6d4d]" />
            {link.label}
          </button>
        )
      })}
    </section>
  )
}

function QualificationRace({ standings }) {
  return (
    <div className="grid gap-2">
      {tournamentFormat.groupKeys.map((groupCode) => (
        <QualificationRow
          groupCode={groupCode}
          key={groupCode}
          rows={standings[groupCode] ?? []}
        />
      ))}
    </div>
  )
}

function QualificationRow({ groupCode, rows }) {
  const ui = useUiText()
  const leaders = rows.slice(0, tournamentFormat.qualifyingTeamsPerGroup)

  return (
    <div className="grid min-h-12 grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold uppercase text-[#65756b]">{getLocalizedGroupLabel(groupCode, ui)}</span>
      <div className="flex min-w-0 flex-wrap gap-2">
        {leaders.map((row) => (
          <span
            key={row.team.id}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md bg-white px-2 text-xs font-semibold text-[#34433a]"
          >
            <FlagMark team={row.team} small />
            <span className="truncate">{row.team.code}</span>
            <span>{row.points} {ui.pointsShort}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function TeamsBoard({ onTeamSelect, playersByTeam, standings, teams }) {
  const ui = useUiText()

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title={ui.allTeams} icon={Users}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          {teams.length} {ui.teams}
        </span>
      </Toolbar>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            players={playersByTeam[team.id] ?? []}
            onClick={() => onTeamSelect?.(team.id)}
            standing={getTeamStandingRow(standings, team.id)}
            team={team}
          />
        ))}
      </div>
    </div>
  )
}

function TeamCard({ onClick, team, players, standing }) {
  const ui = useUiText()
  const groupLabel = getLocalizedGroupLabel(standing?.group ?? getTeamGroupCode(team), ui)

  return (
    <button
      type="button"
      aria-label={`${ui.teamPage}: ${team.country}`}
      className="tap-target premium-card motion-card min-w-0 overflow-hidden rounded-lg border border-[#dce1d7] bg-white text-left shadow-sm hover:border-[#9cb4a5] hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <FlagMark team={team} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#14201b]">{team.country}</h2>
            <p className="truncate text-xs text-[#65756b]">
              {groupLabel} / {players.length} {ui.playersCount}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-[#eef3e9] px-2.5 py-1 text-xs font-semibold text-[#34433a]">
          {team.code}
        </span>
      </div>
      <div className="border-t border-[#e5e9e0] bg-[#fbfdf9] px-4 py-3">
        <p className="text-sm font-semibold text-[#14201b]">
          {ui.players}: {players.length}
        </p>
        <p className="mt-1 truncate text-xs text-[#65756b]">
          {groupLabel} / {formatStandingRecord(standing, ui)}
        </p>
      </div>
    </button>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd5c6] bg-[#fbfdf9] p-4 text-sm text-[#65756b]">
      {text}
    </div>
  )
}

function PublicFooter() {
  const ui = useUiText()

  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2 text-center sm:px-6 lg:px-8">
      <a
        aria-label={ui.developedBy}
        className="tap-target inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#dce1d7] bg-white/70 px-4 py-2 text-xs font-semibold text-[#34433a] shadow-sm hover:border-[#163428] hover:bg-[#163428] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1f6d4d] focus:ring-offset-2"
        href="https://instagram.com/mohammaddaghash1212"
        rel="noreferrer"
        target="_blank"
      >
        <InstagramGlyph className="h-4 w-4" />
        <span>{ui.developedBy}</span>
      </a>
    </footer>
  )
}

function InstagramGlyph({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect height="17" rx="5" stroke="currentColor" strokeWidth="2" width="17" x="3.5" y="3.5" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="7" fill="currentColor" r="1.2" />
    </svg>
  )
}

function SuspensionBadge({ label }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center rounded-md bg-[#fff1c2] px-2.5 text-xs font-semibold text-[#7a5300]">
      {label}
    </span>
  )
}

function MatchScoreRows({ away, className = '', compact = false, home, match }) {
  const hasScore = match.status !== 'scheduled' || isScoredMatch(match)
  const scores = {
    homeScore: hasScore ? normalizeScore(match.homeScore) ?? 0 : '—',
    awayScore: hasScore ? normalizeScore(match.awayScore) ?? 0 : '—',
  }

  return (
    <div className={`grid min-w-0 gap-2 ${className}`} dir="ltr">
      <MatchScoreRow
        label={home?.country}
        score={scores.homeScore}
        team={home}
        compact={compact}
      />
      <MatchScoreRow
        label={away?.country}
        score={scores.awayScore}
        team={away}
        compact={compact}
      />
    </div>
  )
}

function MatchScoreRow({ compact = false, label, score, team }) {
  const ui = useUiText()

  return (
    <div className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-[#f8faf5] ${
      compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
    }`}>
      <FlagMark team={team} small={compact} />
      <span className={`${compact ? 'text-xs' : 'text-sm'} truncate font-semibold text-[#14201b]`} dir="auto">
        {label ?? ui.tbd}
      </span>
      <span className={`${compact ? 'min-w-7 text-sm' : 'min-w-9 text-lg'} rounded-md bg-[#10261d] px-2 py-1 text-center font-black text-white`}>
        {score}
      </span>
    </div>
  )
}

function LiveMatch({ match, now, teams }) {
  const ui = useUiText()
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const liveClock = getLiveClock(match, now)
  const label =
    match.status === 'live'
      ? ui.liveMatch
      : match.status === 'scheduled'
        ? ui.nextMatch
        : ui.match
  const detail = match.status === 'live' && liveClock.displayMinute
    ? `${match.venue} / ${liveClock.displayMinute}`
    : `${formatDate(match.date)} / ${match.time}`

  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white text-[#14201b] shadow-md">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#e5e9e0] px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[#65756b]">{label}</p>
          <p className="mt-1 truncate text-sm text-[#34433a]">
            {detail}
          </p>
          <MatchCountdown className="mt-2" match={match} now={now} />
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="px-4 py-5">
        <MatchScoreRows match={match} home={home} away={away} className="sm:hidden" />
        <div dir="ltr" className="hidden gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <TeamBlock team={home} align="right" />
          <div className="min-w-24 rounded-lg bg-[#14201b] px-4 py-3 text-center text-white">
            <p className="text-3xl font-semibold leading-none">
              <MatchScoreText match={match} />
            </p>
            <p className="mt-1 text-xs text-[#cfe7d8]">
              {match.status === 'live' ? ui.live : match.status === 'scheduled' ? ui.kickoff : ui.finished}
            </p>
          </div>
          <TeamBlock team={away} />
        </div>
      </div>
    </div>
  )
}

function LiveNowFloatingBadge({ liveMatches, now, onMatchSelect, teams }) {
  const ui = useUiText()
  const [open, setOpen] = useState(false)

  if (!liveMatches.length) {
    return null
  }

  const primaryMatch = liveMatches[0]
  const primaryHome = getMatchTeam(primaryMatch, teams, 'home')
  const primaryAway = getMatchTeam(primaryMatch, teams, 'away')
  const primaryClock = getLiveClock(primaryMatch, now)

  function handleBadgeClick() {
    if (liveMatches.length === 1) {
      onMatchSelect(liveMatches[0].id)
      return
    }

    setOpen((current) => !current)
  }

  function selectLiveMatch(matchId) {
    setOpen(false)
    onMatchSelect(matchId)
  }

  return (
    <aside className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 sm:inset-x-auto sm:right-6 sm:w-80">
      <div className="pointer-events-auto mx-auto grid max-w-md gap-2 sm:max-w-none">
        {open && liveMatches.length > 1 && (
          <div className="overflow-hidden rounded-2xl border border-[#dce1d7] bg-white shadow-xl">
            <div className="border-b border-[#e5e9e0] px-4 py-3">
              <p className="text-xs font-black uppercase text-[#bd1f36]">{ui.liveMatches}</p>
            </div>
            <div className="grid max-h-72 overflow-y-auto p-2">
              {liveMatches.map((match) => {
                const home = getMatchTeam(match, teams, 'home')
                const away = getMatchTeam(match, teams, 'away')
                const clock = getLiveClock(match, now)

                return (
                  <button
                    type="button"
                    dir="ltr"
                    className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 text-left hover:bg-[#f8faf5]"
                    key={match.id}
                    onClick={() => selectLiveMatch(match.id)}
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#14201b]">
                        {clock.displayMinute} / {match.venue ?? getVenueName(match, ui.currentLanguage)}
                      </span>
                      <MatchScoreRows match={match} home={home} away={away} compact className="mt-2" />
                    </div>
                    <span className="rounded-lg bg-[#bd1f36] px-2 py-1 text-xs font-black uppercase text-white">
                      {ui.live}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          dir="ltr"
          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-[#bd1f36] px-4 text-left text-white shadow-xl ring-1 ring-white/25"
          onClick={handleBadgeClick}
          aria-expanded={open}
          aria-label={liveMatches.length === 1 ? ui.openLiveMatch : ui.liveMatchesAria}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="live-pulse-dot relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">{ui.liveNow}</span>
              <MatchScoreRows match={primaryMatch} home={primaryHome} away={primaryAway} compact className="mt-2" />
            </div>
          </span>
          <span className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#bd1f36]">
            {primaryClock.displayMinute}
          </span>
        </button>
      </div>
    </aside>
  )
}

function TeamBlock({ team, align = 'left' }) {
  return (
    <div
      dir="ltr"
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
      <p className="truncate text-sm font-semibold text-[#14201b]" dir="auto">{team.country}</p>
      <p className="text-xs text-[#65756b]" dir="auto">{team.code}</p>
    </div>
  )
}

function FlagMark({ team, small = false }) {
  const flag = getTeamFlag(team)

  if (flag) {
    return (
      <span
        aria-hidden="true"
        className={`flag-mark ${small ? 'flag-mark-small' : ''}`}
        title={flag.country}
      >
        <img
          alt=""
          className="flag-mark-image"
          decoding="async"
          loading="lazy"
          src={flag.path}
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`flag-mark flag-mark-fallback ${small ? 'flag-mark-small' : ''}`}
      style={{ '--flag-a': team?.color ?? '#1f6d4d', '--flag-b': team?.secondary ?? '#eef3e9' }}
    >
      {team?.code ?? 'TBD'}
    </span>
  )
}

function StatusPill({ status }) {
  const ui = useUiText()
  const normalizedStatus = status ?? 'scheduled'
  const styles = {
    live: 'bg-[#bd1f36] text-white',
    final: 'bg-[#e8ede3] text-[#34433a]',
    scheduled: 'bg-[#fff2cc] text-[#6f5200]',
  }

  return (
    <span
      className={`status-pill status-pill-${normalizedStatus} inline-flex min-h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold uppercase ${
        styles[normalizedStatus] ?? styles.scheduled
      }`}
    >
      {getStatusLabel(normalizedStatus, ui)}
    </span>
  )
}

function MatchCountdown({ className = '', match, now }) {
  const ui = useUiText()
  const countdown = getMatchCountdown(match, now)

  if (!countdown) {
    return null
  }

  const duration = formatCountdownDuration(countdown)

  return (
    <span
      aria-label={`${ui.startsIn} ${duration}`}
      className={`match-countdown ${className}`.trim()}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>{ui.startsIn}</span>
      <span className="match-countdown-time" dir="ltr">
        {duration}
      </span>
    </span>
  )
}

function GroupSnapshot({ onTeamSelect, standings }) {
  const ui = useUiText()
  const hasLiveRows = Object.values(standings).flat().some((row) => row.live)

  return (
    <section className="motion-card content-auto min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Table2} title={ui.leagueTable} detail={ui.topTwoEachGroup} />
      {hasLiveRows && (
        <div className="border-t border-[#f2c7c7] bg-[#fff7f7] px-4 py-2 text-xs font-bold uppercase text-[#bd1f36]">
          {ui.liveTableProvisional}
        </div>
      )}
      <div className="grid gap-4 border-t border-[#e5e9e0] p-4">
        {tournamentFormat.groupKeys.map((groupCode) => {
          const tableRows = standings[groupCode] ?? []

          return (
            <div key={groupCode} className="grid gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{getLocalizedGroupLabel(groupCode, ui)}</h2>
                <span className="text-xs font-semibold text-[#65756b]">{ui.pGdPts}</span>
              </div>
              {tableRows.slice(0, tournamentFormat.qualifyingTeamsPerGroup).map((row) => (
                <CompactStandingRow
                  key={row.team.id}
                  onTeamSelect={onTeamSelect}
                  row={row}
                />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CompactStandingRow({ onTeamSelect, row }) {
  const ui = useUiText()

  return (
    <button
      type="button"
      className={`compact-standing-row tap-target grid min-h-12 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-3 text-left sm:gap-3 ${
        row.live
          ? 'compact-standing-row-live bg-[#fff7f7] ring-1 ring-[#f2c7c7] hover:bg-[#fff0f0]'
          : row.qualified
            ? 'compact-standing-row-qualified bg-[#f8faf5] hover:bg-[#eef3e9]'
            : 'compact-standing-row-default bg-[#f8faf5] hover:bg-[#eef3e9]'
      }`}
      onClick={() => onTeamSelect?.(row.team.id)}
    >
      <span
        className={`standing-rank grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
          row.qualified ? 'standing-rank-qualified bg-[#dff1e6] text-[#17633f]' : 'standing-rank-default bg-[#ecefe8] text-[#65756b]'
        }`}
      >
        {row.rank}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <FlagMark team={row.team} small />
        <span className="standing-team-name truncate text-sm font-medium">{row.team.country}</span>
        {row.live && <LiveTeamBadge label={ui.live} />}
      </div>
      <span className="standing-stat-cell text-xs font-semibold text-[#34433a]">
        {row.played} / {row.goalDifference > 0 ? '+' : ''}
        {row.goalDifference} / {row.points}
      </span>
    </button>
  )
}

function TopScorersPreview({ onPlayerSelect, players }) {
  const ui = useUiText()

  return (
    <section className="premium-card motion-card content-auto min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Medal} title={ui.topScorer} detail={ui.goals} />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {players.length ? (
          players.map((player, index) => (
            <PlayerStatRow
              key={player.id}
              onPlayerSelect={onPlayerSelect}
              player={player}
              index={index}
              value={player.goals}
              label={player.team?.country ?? ''}
            />
          ))
        ) : (
          <div className="p-4">
            <EmptyState text={ui.noGoalsRecordedYet} />
          </div>
        )}
      </div>
    </section>
  )
}

function MatchesBoard({ matches, now, onMatchSelect, onVote, teams, votes }) {
  const ui = useUiText()
  const [mode, setMode] = useState('date')
  const [selectedRound, setSelectedRound] = useState('group-1')
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '')
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]
  const sortedMatches = useMemo(() => [...matches].sort(compareMatchKickoffAsc), [matches])

  const sections = useMemo(() => {
    if (mode === 'round') {
      return groupMatches(
        sortedMatches.filter((match) => matchBelongsToRound(match, selectedRound)),
        () => getRoundOptionLabel(selectedRound, ui),
      )
    }

    if (mode === 'team' && selectedTeam) {
      return groupMatches(
        sortedMatches.filter(
          (match) =>
            match.homeTeamId === selectedTeam.id || match.awayTeamId === selectedTeam.id,
        ),
        (match) => getMatchRoundLabel(match, ui),
      )
    }

    return groupMatches(sortedMatches, (match) => formatLongDate(match.date))
  }, [mode, selectedRound, selectedTeam, sortedMatches, ui])

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title={ui.matches} icon={CalendarDays}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          {matches.length} {ui.fixtures}
        </span>
      </Toolbar>
      <section className="premium-card motion-card overflow-hidden rounded-lg border border-[#dce1d7] bg-[#10261d] shadow-sm">
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3">
          {matchFilterModes.map((item) => (
            <FilterChip
              active={mode === item.id}
              key={item.id}
              label={ui[item.labelKey]}
              onClick={() => setMode(item.id)}
            />
          ))}
        </div>
        <div className="grid gap-3 border-b border-white/10 px-3 py-3">
          {mode === 'round' && (
            <FilterSelect
              label={ui.selectRound}
              onChange={setSelectedRound}
              options={roundFilterOptions.map((round) => ({
                label: getRoundOptionLabel(round.id, ui),
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
          now={now}
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
      className={`tap-target min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
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
  const ui = useUiText()
  const [query, setQuery] = useState('')
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0]
  const normalizedQuery = query.trim().toLowerCase()
  const visibleTeams = teams.filter((team) =>
    [team.country, team.code].join(' ').toLowerCase().includes(normalizedQuery),
  )

  return (
    <div className="grid gap-2 rounded-lg bg-black/20 p-3">
      <label className="relative grid gap-1 text-xs font-semibold uppercase text-[#9fb5aa]">
        {ui.selectTeam}
        <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-[#9fb5aa]" />
        <input
          className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0b1813] pl-10 pr-3 text-sm font-semibold normal-case text-white outline-none focus:border-white/40"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedTeam ? selectedTeam.country : ui.selectTeam}
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
            className={`tap-target grid min-h-11 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 text-left text-sm font-semibold ${
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

function MatchSectionList({ now, onMatchSelect, onVote, sections, teams, votes }) {
  const ui = useUiText()

  if (!sections.length) {
    return (
      <div className="p-4">
        <EmptyState text={ui.noMatchesFoundForFilter} />
      </div>
    )
  }

  return (
    <div className="grid gap-3 bg-[#07100d] p-3">
      {sections.map((section) => (
        <section
          key={section.title}
          className="motion-card content-auto overflow-hidden rounded-xl border border-white/10 bg-[#111f19]"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">{section.title}</h3>
          </div>
          <div className="divide-y divide-white/10">
            {section.matches.map((match) => (
              <div key={match.id} className="bg-white">
                <MatchRow
                  match={match}
                  now={now}
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
  now,
  onMatchSelect,
  onToggleDetails,
  teams,
  votes,
}) {
  const ui = useUiText()
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const goalCount = (match.events ?? []).filter((event) => event.type === 'goal').length
  const matchLabel = `${ui.match}: ${home.country} vs ${away.country}, ${getMatchRoundLabel(match, ui)}`
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
      className={`min-w-0 ${expanded || onMatchSelect ? 'tap-target cursor-pointer hover:bg-[#fbfdf9]' : ''}`}
      {...clickableProps}
    >
      <div dir="ltr" className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:px-4">
        <div className="min-w-0 text-center sm:text-left">
          <p className="truncate text-xs font-semibold text-[#65756b]">
            {formatDate(match.date)}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#14201b]">{match.time}</p>
          <MatchCountdown className="mt-2 justify-center sm:justify-start" match={match} now={now} />
          <p className="mt-1 text-[11px] font-semibold uppercase leading-tight text-[#65756b]">
            {getMatchRoundLabel(match, ui)}
          </p>
        </div>
        <div className="grid min-w-0 gap-1 border-l border-[#dce1d7] pl-3">
          <p className="mb-1 truncate text-xs font-semibold text-[#65756b]">
            {getMatchCompetitionLabel(match, ui)}
          </p>
          <MatchTeamLine team={home} />
          <MatchTeamLine team={away} />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <ScoreCell match={match} />
          <StatusPill status={match.status} />
          {goalCount > 0 && (
            <span className="hidden min-h-7 items-center rounded-md bg-[#eef3e9] px-2.5 text-xs font-semibold text-[#34433a] sm:inline-flex">
              {goalCount} {ui.goals}
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
              {ui.details}
            </button>
          )}
        </div>
      </div>
      {!expanded && match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
        <div className="flex items-center justify-between gap-3 px-4 pb-4 sm:hidden">
          <span className="text-xs font-semibold text-[#65756b]">{ui.whoWillWin}</span>
          <VoteSummaryPill match={match} votes={votes} />
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
  const ui = useUiText()
  const breakdown = getVoteBreakdown(votes, match)
  const summary = breakdown.hasDraw
    ? `${breakdown.homePercent}% - ${breakdown.drawPercent}% - ${breakdown.awayPercent}%`
    : `${breakdown.homePercent}% - ${breakdown.awayPercent}%`

  return (
    <span className="vote-summary-pill inline-flex min-h-7 items-center rounded-md bg-[#e7f3ec] px-2.5 text-xs font-semibold text-[#17633f]">
      {breakdown.totalVotes ? summary : ui.vote}
    </span>
  )
}

function PredictionVote({ compact = false, match, onVote, teams, votes }) {
  const ui = useUiText()
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const breakdown = getVoteBreakdown(votes, match)
  const summary = breakdown.hasDraw
    ? `${breakdown.homePercent}% - ${breakdown.drawPercent}% - ${breakdown.awayPercent}%`
    : `${breakdown.homePercent}% - ${breakdown.awayPercent}%`

  return (
    <section
      className={`vote-card min-w-0 rounded-lg border border-[#dce1d7] bg-white ${
        compact ? 'p-3' : 'p-4'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="vote-label text-sm font-semibold text-[#14201b]">{ui.whoWillWin}</h3>
          {breakdown.hasDraw && (
            <p className="vote-meta text-xs font-medium text-[#34433a]">{ui.drawAvailableForLeague}</p>
          )}
          <p className="vote-meta text-xs text-[#65756b]">
            {breakdown.totalVotes
              ? `${breakdown.totalVotes} ${ui.votes}`
              : ui.beFirstToVote}
          </p>
        </div>
        {breakdown.totalVotes > 0 && (
          <span className="vote-summary-pill rounded-md bg-[#eef3e9] px-2.5 py-1 text-xs font-semibold text-[#34433a]">
            {summary}
          </span>
        )}
      </div>
      <div
        dir="ltr"
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
  const ui = useUiText()

  return (
    <button
      type="button"
      className={`vote-option relative min-h-16 min-w-0 overflow-hidden rounded-lg border px-3 py-3 text-center transition ${
        active
          ? 'vote-option-active border-[#17633f] bg-[#f2fbf5]'
          : 'vote-option-idle border-[#dce1d7] bg-[#fbfdf9] hover:border-[#9cb4a5]'
      }`}
      onClick={onClick}
    >
      <span
        className="vote-fill absolute inset-x-0 bottom-0 bg-[#dff1e6] transition-all"
        style={{ height: `${percent}%` }}
        aria-hidden="true"
      />
      <span className="vote-label relative z-10 block text-sm font-semibold text-[#14201b]">{ui.draw}</span>
      <span className="vote-meta relative z-10 block text-xs text-[#65756b]">
        {percent}% / {votes} {ui.votes}
      </span>
    </button>
  )
}

function VoteTeamButton({ active, align = 'left', onClick, percent, team, votes }) {
  const ui = useUiText()

  return (
    <button
      type="button"
      className={`vote-option relative min-h-16 min-w-0 overflow-hidden rounded-lg border px-3 py-3 text-left transition ${
        active
          ? 'vote-option-active border-[#17633f] bg-[#f2fbf5]'
          : 'vote-option-idle border-[#dce1d7] bg-[#fbfdf9] hover:border-[#9cb4a5]'
      }`}
      onClick={onClick}
    >
      <span
        className={`absolute inset-y-0 ${
          align === 'right' ? 'right-0' : 'left-0'
        } vote-fill bg-[#dff1e6] transition-all`}
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
            <span className="vote-label block truncate text-sm font-semibold text-[#14201b]">
              {team.country}
            </span>
            <span className="vote-meta block text-xs text-[#65756b]">
              {percent}% / {votes} {ui.votes}
            </span>
          </span>
        )}
        <FlagMark team={team} small />
        {align !== 'right' && (
          <span className="min-w-0">
            <span className="vote-label block truncate text-sm font-semibold text-[#14201b]">
              {team.country}
            </span>
            <span className="vote-meta block text-xs text-[#65756b]">
              {percent}% / {votes} {ui.votes}
            </span>
          </span>
        )}
      </span>
    </button>
  )
}

function ScoringSummary({ match, players, teams }) {
  const ui = useUiText()
  const events = [...(match.events ?? [])].sort((a, b) => a.minute - b.minute)

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#14201b]">{ui.matchEvents}</h3>
          <p className="text-xs text-[#65756b]">
            {formatDate(match.date)} / {match.time}
          </p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="grid gap-2 p-4">
        {events.length ? (
          events.map((event, index) => (
            <GoalEventRow
              event={event}
              key={`${match.id}-${event.minute}-${event.type}-${index}`}
              players={players}
              teams={teams}
            />
          ))
        ) : (
          <EmptyState text={ui.noMatchEventsForMatchYet} />
        )}
      </div>
    </section>
  )
}

function GoalEventRow({ event, players, teams }) {
  const ui = useUiText()
  const team = teams.find((item) => item.id === event.teamId)

  return (
    <div className="grid min-h-12 grid-cols-[42px_32px_30px_minmax(0,1fr)] items-center gap-3 rounded-lg bg-[#f8faf5] px-3">
      <span className="text-xs font-semibold text-[#65756b]">{formatStoredEventMinute(event)}</span>
      <EventTypeIcon type={event.type} />
      {team && <FlagMark team={team} small />}
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold leading-tight text-[#14201b]" dir="auto">
          {formatEventTypeLabel(event.type, ui, event)}: {getEventPlayerDisplayName(event, players, ui)}
        </p>
        <p className="truncate text-xs text-[#65756b]">
          {getMatchEventDetail(event, ui)}
        </p>
      </div>
    </div>
  )
}

function EventTypeIcon({ type }) {
  const styles = type === liveEventTypes.goal
    ? 'bg-[#dff1e6] text-[#17633f]'
    : type === liveEventTypes.ownGoal
      ? 'bg-[#e9f0ff] text-[#244a8f]'
      : type === liveEventTypes.penaltyGoal
        ? 'bg-[#dff1e6] text-[#17633f]'
        : type === liveEventTypes.penaltyMiss
          ? 'bg-[#fff3c4] text-[#806100]'
          : type === liveEventTypes.yellowCard
            ? 'bg-[#fff3c4] text-[#806100]'
            : type === liveEventTypes.redCard
              ? 'bg-[#ffe4e4] text-[#9b2f2f]'
              : 'bg-[#eef3e9] text-[#34433a]'
  const label = type === liveEventTypes.goal
    ? <Goal className="h-4 w-4" />
    : type === liveEventTypes.ownGoal
      ? 'OG'
      : type === liveEventTypes.penaltyGoal
        ? 'P'
        : type === liveEventTypes.penaltyMiss
          ? 'PX'
          : type === liveEventTypes.yellowCard
            ? 'YC'
            : type === liveEventTypes.redCard
              ? 'RC'
              : '•'

  return (
    <span className={`grid h-8 w-8 place-items-center rounded-md text-[11px] font-bold ${styles}`}>
      {label}
    </span>
  )
}

function formatEventTypeLabel(type, ui = getUiDictionary('en'), event = {}) {
  if (type === liveEventTypes.goal) return ui.goal
  if (type === liveEventTypes.ownGoal) return ui.ownGoal
  if (type === liveEventTypes.penaltyGoal) return ui.penaltyGoal
  if (type === liveEventTypes.penaltyMiss) return ui.penaltyMissSaved
  if (type === liveEventTypes.penalty) return ui.penalty
  if (type === liveEventTypes.yellowCard) return ui.yellowCard
  if (type === liveEventTypes.redCard && event.reason === 'second_yellow') return ui.secondYellowRedCard
  if (type === liveEventTypes.redCard) return ui.redCard
  return ui.eventType
}

function formatStoredEventMinute(event) {
  if (event.displayMinute) {
    return event.displayMinute
  }

  if (event.eventPhase) {
    return `${event.minute}'`
  }

  return `${event.minute}'`
}

function getMatchEventDetail(event, ui = getUiDictionary('en')) {
  if (event.type === liveEventTypes.redCard && event.reason === 'second_yellow') {
    return ui.secondYellowDismissal
  }

  if (event.type === liveEventTypes.goal) {
    return ui.goal
  }

  if (event.type === liveEventTypes.ownGoal) {
    return ui.ownGoalDetail
  }

  if (event.type === liveEventTypes.penaltyGoal) {
    return ui.penaltyGoalDetail
  }

  if (event.type === liveEventTypes.penaltyMiss) {
    return ui.penaltyMissSavedDetail
  }

  return ui.disciplinaryEvent
}

function MatchPlayersPanel({ match, onPlayerSelect, players, suspensions = {}, teams }) {
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const homePlayers = getMatchTeamPlayers(players, match.homeTeamId)
  const awayPlayers = getMatchTeamPlayers(players, match.awayTeamId)

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <MatchTeamPlayersCard
        match={match}
        onPlayerSelect={onPlayerSelect}
        players={homePlayers}
        suspensions={suspensions}
        team={home}
      />
      <MatchTeamPlayersCard
        match={match}
        onPlayerSelect={onPlayerSelect}
        players={awayPlayers}
        suspensions={suspensions}
        team={away}
      />
    </div>
  )
}

function getMatchTeamPlayers(players, teamId) {
  return players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => {
      const aNumber = Number(a.number)
      const bNumber = Number(b.number)

      if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
        return aNumber - bNumber
      }

      return a.name.localeCompare(b.name)
    })
}

function MatchTeamPlayersCard({ match, onPlayerSelect, players, suspensions, team }) {
  const ui = useUiText()

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[#e5e9e0] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FlagMark team={team} small />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[#14201b]">
              {ui.t('teamPlayers', { team: team.country })}
            </h3>
            <p className="truncate text-xs text-[#65756b]">
              {players.length} {ui.playersCount}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-[#eef3e9] px-2 py-1 text-xs font-semibold text-[#34433a]">
          {team.code}
        </span>
      </div>
      <div className="grid gap-2 p-4">
        {players.length ? (
          players.map((player) => (
            <MatchPlayerRow
              key={player.id}
              match={match}
              onPlayerSelect={onPlayerSelect}
              player={player}
              suspension={getPlayerSuspension(suspensions, player.id)}
            />
          ))
        ) : (
          <EmptyState text={ui.noPlayersRegistered} />
        )}
      </div>
    </section>
  )
}

function MatchPlayerRow({ match, onPlayerSelect, player, suspension }) {
  const ui = useUiText()
  const suspended = isSuspendedForMatch(suspension, match.id)

  return (
    <button
      type="button"
      className={`tap-target grid min-h-11 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 text-left hover:bg-[#eef3e9] ${
        suspended ? 'bg-[#fff7e0]' : 'bg-[#f8faf5]'
      }`}
      onClick={() => onPlayerSelect?.(player.id)}
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-xs font-semibold text-[#34433a]">
        {player.number ? player.number : <UserRound className="h-4 w-4" />}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[#14201b]">{player.name}</span>
      {suspended && <SuspensionBadge label={ui.suspended} />}
    </button>
  )
}

function MatchTeamLine({ team }) {
  return (
    <div className="flex min-w-0 items-center gap-2" dir="ltr">
      <FlagMark team={team} small />
      <span className="min-w-0 truncate text-sm font-semibold text-[#14201b]" dir="auto">
        {team.country}
      </span>
    </div>
  )
}

function ScoreCell({ match }) {
  if (isScoredMatch(match)) {
    return (
      <div className="grid min-h-10 min-w-16 place-items-center rounded-md bg-[#14201b] px-3 text-sm font-semibold text-white" dir="ltr">
        <MatchScoreText match={match} />
      </div>
    )
  }

  return (
    <div className="grid min-h-10 min-w-16 place-items-center rounded-md bg-[#eef3e9] px-3 text-xs font-semibold text-[#65756b]" dir="ltr">
      <MatchScoreText match={match} />
    </div>
  )
}

function TablesBoard({ standings }) {
  const ui = useUiText()
  const [tableMode, setTableMode] = useState('short')
  const rematchRows = Object.values(standings).flat().filter((row) => row.rematchRequired)
  const tableModes = [
    { id: 'short', label: ui.shortTable },
    { id: 'full', label: ui.fullTable },
  ]

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title={ui.standings} icon={Table2}>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#65756b]">
          {ui.topTwoEachGroup}
        </span>
        <div className="inline-flex rounded-md border border-[#dce1d7] bg-white p-1 shadow-sm">
          {tableModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`tap-target min-h-9 rounded px-3 text-xs font-bold transition ${
                tableMode === mode.id
                  ? 'bg-[#163428] text-white'
                  : 'text-[#65756b] hover:bg-[#eef3e9] hover:text-[#14201b]'
              }`}
              onClick={() => setTableMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </Toolbar>
      <QualificationRules />
      {rematchRows.length > 0 && (
        <div className="rounded-lg border border-[#f0d491] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#7a5300]">
          {ui.qualificationRequiresRematch}
        </div>
      )}
      {tournamentFormat.groupKeys.map((groupCode) => (
        <GroupStandingsTable
          groupCode={groupCode}
          key={groupCode}
          mode={tableMode}
          rows={standings[groupCode] ?? []}
        />
      ))}
    </div>
  )
}

function GroupStandingsTable({ groupCode, mode = 'short', rows }) {
  const ui = useUiText()
  const hasLiveRows = rows.some((row) => row.live)
  const shortColumns = mode === 'short'
  const fullColumns = !shortColumns

  return (
    <section className="standings-table-shell motion-card content-auto overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Table2} title={getLocalizedGroupLabel(groupCode, ui)} detail={ui.topTwoEachGroup} />
      {hasLiveRows && (
        <div className="border-t border-[#f2c7c7] bg-[#fff7f7] px-4 py-2 text-xs font-bold uppercase text-[#bd1f36]">
          {ui.liveTableProvisional}
        </div>
      )}
      <div className="standings-table-scroll overflow-x-auto border-t border-[#e5e9e0]">
        <table className={`standings-table w-full border-collapse text-xs sm:text-sm ${shortColumns ? 'standings-table-short min-w-[390px]' : 'standings-table-full min-w-[560px] sm:min-w-[680px]'}`}>
          <thead className="bg-[#f3f7f0] text-[10px] uppercase text-[#65756b] sm:text-xs">
            <tr>
              {fullColumns && <th className="w-10 px-2 py-2 text-center font-semibold sm:w-12">#</th>}
              <th className="min-w-36 px-2 py-2 text-left font-semibold sm:px-3">{ui.team}</th>
              {fullColumns && <th className="px-2 py-2 text-center font-semibold">{ui.playedShort}</th>}
              <th className="px-2 py-2 text-center font-semibold">{ui.wonShort}</th>
              <th className="px-2 py-2 text-center font-semibold">{ui.drawnShort}</th>
              <th className="px-2 py-2 text-center font-semibold">{ui.lostShort}</th>
              {fullColumns && <th className="px-2 py-2 text-center font-semibold">GF:GA</th>}
              {fullColumns && <th className="px-2 py-2 text-center font-semibold">{ui.goalDifferenceShort}</th>}
              <th className="px-2 py-2 text-center font-semibold sm:px-3">{ui.pointsShort}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e9e0]">
            {rows.map((row) => (
              <StandingTableRow key={row.team.id} mode={mode} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StandingTableRow({ mode = 'short', row }) {
  const ui = useUiText()
  const shortColumns = mode === 'short'
  const fullColumns = !shortColumns

  return (
    <tr
      className={`standing-row ${
        row.rematchRequired
          ? 'standing-row-rematch bg-[#fffaf0]'
          : row.live
            ? 'standing-row-live bg-[#fff7f7]'
            : row.qualified
              ? 'standing-row-qualified bg-[#f3fbf6]'
              : 'standing-row-default bg-white'
      }`}
    >
      {fullColumns && (
        <td className="px-2 py-2 text-center">
          <span
            className={`standing-rank mx-auto grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${
              row.qualified
                ? 'standing-rank-qualified bg-[#dff1e6] text-[#17633f]'
                : 'standing-rank-default bg-[#ecefe8] text-[#65756b]'
            }`}
          >
            {row.rank}
          </span>
        </td>
      )}
      <td className="px-2 py-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <FlagMark team={row.team} small />
          <div className="min-w-0">
            <p className="standing-team-name truncate font-semibold text-[#14201b]">{row.team.country}</p>
            <p className="standing-team-code truncate text-[10px] text-[#65756b] sm:text-xs">
              {row.rematchRequired ? ui.qualificationRequiresRematch : row.team.code}
            </p>
          </div>
          {row.live && <LiveTeamBadge label={ui.live} />}
        </div>
      </td>
      {fullColumns && <StatCell value={row.played} />}
      <StatCell value={row.won} />
      <StatCell value={row.drawn} />
      <StatCell value={row.lost} />
      {fullColumns && <StatCell value={`${row.goalsFor}:${row.goalsAgainst}`} />}
      {fullColumns && <StatCell value={`${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}`} />}
      <td className="standing-points-cell px-2 py-2 text-center text-sm font-bold text-[#14201b] sm:px-3">
        {row.points}
      </td>
    </tr>
  )
}

function QualificationRules() {
  const ui = useUiText()
  const [open, setOpen] = useState(false)

  return (
    <section className="motion-card rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <button
        type="button"
        className="tap-target flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-sm font-semibold text-[#14201b]">{ui.qualificationRules}</span>
          <span className="block text-xs text-[#65756b]">{ui.topTwoEachGroup}</span>
        </span>
        <ChevronDown className={`h-5 w-5 text-[#65756b] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="smooth-collapse grid gap-2 border-t border-[#e5e9e0] px-4 py-3 text-sm text-[#34433a]">
          <p>1. {ui.topTwoEachGroup}</p>
          <p>2. {ui.tiebreakersSummary}</p>
          <p>3. {ui.qualificationRequiresRematch}</p>
        </div>
      )}
    </section>
  )
}

function StatCell({ value }) {
  return <td className="standing-stat-cell px-2 py-2 text-center font-medium text-[#34433a]">{value}</td>
}

function LiveTeamBadge({ label }) {
  return (
    <span className="inline-flex min-h-5 shrink-0 items-center rounded-sm bg-[#bd1f36] px-1.5 text-[10px] font-black uppercase leading-none text-white">
      {label}
    </span>
  )
}

function LeadersBoard({ leaderboards, onPlayerSelect, teamGoalStats }) {
  const ui = useUiText()

  return (
    <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
      <Leaderboard
        title={ui.topScorer}
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.goals}
        valueKey="goals"
        label={ui.goals}
      />
      <Leaderboard
        title={ui.yellowCards}
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.yellowCards}
        valueKey="yellowCards"
        label={ui.yellowCards}
      />
      <Leaderboard
        title={ui.redCards}
        onPlayerSelect={onPlayerSelect}
        players={leaderboards.redCards}
        valueKey="redCards"
        label={ui.redCards}
      />
      <TeamStatLeaderboard
        label={ui.mostScored}
        rows={teamGoalStats.scored}
        title={ui.goalsScored}
        valueKey="goalsScored"
      />
      <TeamStatLeaderboard
        label={ui.fewestConceded}
        rows={teamGoalStats.conceded}
        title={ui.goalsConceded}
        valueKey="goalsConceded"
      />
    </div>
  )
}

function Leaderboard({ title, onPlayerSelect, players, valueKey, label }) {
  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Medal} title={title} detail={label} />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {players.slice(0, 8).map((player, index) => (
          <PlayerStatRow
            key={player.id}
            onPlayerSelect={onPlayerSelect}
            player={player}
            index={index}
            value={player[valueKey]}
            label={label}
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
      className="tap-target grid min-h-16 w-full min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-[#fbfdf9]"
      onClick={() => onPlayerSelect?.(player.id)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#eef3e9] text-xs font-semibold text-[#34433a]">
        {index + 1}
      </span>
      <div className="leaderboard-identity flex min-w-0 items-center gap-3">
        <FlagMark team={player.team} small />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-tight text-[#14201b]">{player.name}</p>
          <p className="break-words text-xs leading-tight text-[#65756b]">
            {player.team.country}
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

function TeamStatLeaderboard({ label, rows, title, valueKey }) {
  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={ShieldCheck} title={title} detail={label} />
      <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
        {rows.slice(0, 8).map((row, index) => (
          <TeamStatRow
            index={index}
            key={row.team.id}
            label={label}
            row={row}
            value={row[valueKey]}
          />
        ))}
      </div>
    </section>
  )
}

function TeamStatRow({ index, label, row, value }) {
  return (
    <div className="grid min-h-16 w-full min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#eef3e9] text-xs font-semibold text-[#34433a]">
        {index + 1}
      </span>
      <div className="leaderboard-identity flex min-w-0 items-center gap-3">
        <FlagMark team={row.team} small />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-tight text-[#14201b]">{row.team.country}</p>
          <p className="break-words text-xs leading-tight text-[#65756b]">{row.team.code}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-[#14201b]">{value}</p>
        <p className="text-xs text-[#65756b]">{label}</p>
      </div>
    </div>
  )
}

function KnockoutPanel({ matches, onMobileBack, teams }) {
  const ui = useUiText()
  const semiFinals = matches.filter((match) => match.stage === tournamentFormat.stages.semiFinal)
  const finalMatch = matches.find((match) => match.stage === tournamentFormat.stages.final)
  const thirdPlaceMatch = matches.find((match) => match.stage === tournamentFormat.stages.thirdPlace)

  return (
    <section className="motion-card content-auto min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <div className="hidden lg:block">
        <PanelHeader icon={Trophy} title={ui.knockoutPath} detail={ui.singleGameBracket} />
      </div>
      <div className="desktop-knockout-path hidden min-w-0 overflow-x-auto border-t border-[#e5e9e0] p-4 lg:block">
        <div className="grid min-w-[760px] gap-6">
          <div className="grid grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] items-center gap-6">
            <BracketRound
              matches={semiFinals.slice(0, 1)}
              side="left"
              teams={teams}
              title="1A vs 2B"
            />
            <FinalNode match={finalMatch} teams={teams} />
            <BracketRound
              matches={semiFinals.slice(1, 2)}
              side="right"
              teams={teams}
              title="1B vs 2A"
            />
          </div>
          {thirdPlaceMatch && (
            <div className="mx-auto w-full max-w-sm">
              <BracketRound
                matches={[thirdPlaceMatch]}
                teams={teams}
                title={ui.thirdPlace}
              />
            </div>
          )}
        </div>
      </div>
      <div className="mobile-knockout-path lg:hidden">
        <MobileKnockoutPath
          finalMatch={finalMatch}
          onBack={onMobileBack}
          semiFinals={semiFinals}
          thirdPlaceMatch={thirdPlaceMatch}
          teams={teams}
        />
      </div>
    </section>
  )
}

function getNeutralTeamLabel(match, teams, side) {
  const team = getMatchTeam(match, teams, side)
  return team?.country ?? 'TBD'
}

function MobileKnockoutPath({ finalMatch, onBack, semiFinals, thirdPlaceMatch, teams }) {
  const ui = useUiText()
  const connectorLineClass = 'mobile-bracket-line'
  const semiFinalSlots = [
    {
      id: 'semi-final-1',
      title: `${ui.semiFinal} 1`,
      detail: 'A1 vs B2',
      stage: tournamentFormat.stages.semiFinal,
      homeLabel: 'A1',
      awayLabel: 'B2',
      match: semiFinals[0],
    },
    {
      id: 'semi-final-2',
      title: `${ui.semiFinal} 2`,
      detail: 'B1 vs A2',
      stage: tournamentFormat.stages.semiFinal,
      homeLabel: 'B1',
      awayLabel: 'A2',
      match: semiFinals[1],
    },
  ]
  const finalSlot = {
    id: 'final',
    title: ui.final,
    detail: ui.semiFinalWinners,
    stage: tournamentFormat.stages.final,
    homeLabel: 'WS1',
    awayLabel: 'WS2',
    match: finalMatch,
  }
  const thirdPlaceSlot = {
    id: 'third-place',
    title: ui.thirdPlace,
    detail: ui.thirdPlace,
    stage: tournamentFormat.stages.thirdPlace,
    homeLabel: 'LS1',
    awayLabel: 'LS2',
    match: thirdPlaceMatch,
  }

  return (
    <div className="mobile-knockout-viewer border-t border-white/10">
      <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb5aa]">{ui.bracketViewer}</p>
          <h3 className="truncate text-lg font-semibold text-white">{ui.knockoutPath}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-[#d8eadf]">
            {ui.semiFinals} · {ui.final} · {ui.thirdPlace}
          </p>
        </div>
        <button
          type="button"
          className="tap-target grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white"
          onClick={() => handleMobileBracketBack(onBack)}
          aria-label={ui.back}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
      <MobileBracketStage
        connectorLineClass={connectorLineClass}
        finalSlot={finalSlot}
        semiFinalSlots={semiFinalSlots}
        teams={teams}
        thirdPlaceSlot={thirdPlaceSlot}
      />
    </div>
  )
}

function handleMobileBracketBack(onBack) {
  if (onBack) {
    onBack()
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function MobileBracketStage({ connectorLineClass, finalSlot, semiFinalSlots, teams, thirdPlaceSlot }) {
  return (
    <section className="mobile-bracket-scroll scrollbar-none px-3 pb-4">
      <div className="mobile-bracket-flow">
        <div className="mobile-bracket-column mobile-bracket-semis">
          <MobileBracketNode slot={semiFinalSlots[0]} teams={teams} />
          <MobileBracketNode slot={semiFinalSlots[1]} teams={teams} />
        </div>
        <div className="mobile-bracket-line-column" aria-hidden="true">
          <span className={`${connectorLineClass} mobile-bracket-line-top`} />
          <span className={`${connectorLineClass} mobile-bracket-line-bottom`} />
          <span className={`${connectorLineClass} mobile-bracket-line-vertical`} />
          <span className={`${connectorLineClass} mobile-bracket-line-final`} />
        </div>
        <div className="mobile-bracket-column mobile-bracket-finals">
          <MobileBracketNode featured slot={finalSlot} teams={teams} />
          <MobileBracketNode compact slot={thirdPlaceSlot} teams={teams} />
        </div>
      </div>
    </section>
  )
}

function MobileBracketNode({ compact = false, featured = false, slot, teams }) {
  return (
    <div
      className={`mobile-bracket-node ${featured ? 'featured' : ''} ${compact ? 'compact' : ''}`}
      data-away-label={slot.awayLabel}
      data-home-label={slot.homeLabel}
    >
      <MobileBracketMatch
        match={slot.match}
        slot={slot}
        teams={teams}
      />
    </div>
  )
}

function MobileBracketMatch({ match, slot, teams }) {
  const ui = useUiText()
  const home = match
    ? getMatchTeam(match, teams, 'home') ?? {
        country: match.homeLabel ?? slot.homeLabel,
        code: match.homeLabel ?? slot.homeLabel,
        color: '#bfc9bb',
        secondary: '#eef3e9',
      }
    : null
  const away = match
    ? getMatchTeam(match, teams, 'away') ?? {
        country: match.awayLabel ?? slot.awayLabel,
        code: match.awayLabel ?? slot.awayLabel,
        color: '#bfc9bb',
        secondary: '#eef3e9',
      }
    : null
  const homeScore = match?.homeScore ?? 0
  const awayScore = match?.awayScore ?? 0
  const showScore = Boolean(match) && (isScoredMatch(match) || match.status === 'live')
  const dateLabel = match?.date ? `${formatDate(match.date)} / ${match.time}` : slot.detail
  const status = match?.status
  const stage = match?.stage ?? slot.stage

  return (
    <article className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block truncate text-[11px] font-black uppercase tracking-wide text-[#9fb5aa]">
            {match ? getStageLabel(match.stage, ui) : slot.title}
          </span>
          <span className="mt-1 block truncate text-[11px] font-semibold text-[#d8eadf]">
            {dateLabel}
          </span>
        </div>
        {status ? (
          <StatusPill status={status} />
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-[#d8eadf]">
            {ui.tbd}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2">
        <MobileBracketTeam fallbackLabel={slot.homeLabel} score={showScore ? homeScore : undefined} team={home} />
        <MobileBracketTeam fallbackLabel={slot.awayLabel} score={showScore ? awayScore : undefined} team={away} />
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="truncate text-[11px] font-semibold text-[#9fb5aa]">
          {match ? getVenueName(match, ui.currentLanguage) : slot.detail}
        </p>
        <span className="shrink-0 text-[11px] font-black uppercase text-[#ffdb70]">
          {getKnockoutDecisionLabel(stage, ui)}
        </span>
      </div>
    </article>
  )
}

function MobileBracketTeam({ fallbackLabel, score, team }) {
  const ui = useUiText()
  const displayTeam = team ?? {
    country: fallbackLabel ?? ui.tbd,
    code: fallbackLabel ?? 'TBD',
    color: '#bfc9bb',
    secondary: '#eef3e9',
  }

  return (
    <div className="mobile-bracket-team-row">
      <FlagMark team={displayTeam} small />
      <span className="min-w-0 truncate text-xs font-bold text-white" dir="auto">
        {displayTeam.country}
      </span>
      {score !== undefined ? (
        <span className="mobile-bracket-score" dir="ltr">
          {score}
        </span>
      ) : (
        <span className="text-[11px] font-black text-[#9fb5aa]" dir="ltr">
          -
        </span>
      )}
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
  const ui = useUiText()
  const decisionLabel = getKnockoutDecisionLabel(match.stage, ui)

  return (
    <div className={`bracket-match-node ${pathOnly ? 'path-only' : ''} ${side ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-[#65756b]">{getStageLabel(match.stage, ui)}</span>
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
      {decisionLabel && (
        <p className="mt-3 border-t border-[#e5e9e0] pt-3 text-xs font-semibold text-[#17633f]">
          {decisionLabel}
        </p>
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
  match,
  now,
  onBack,
  onMatchSelect,
  onPlayerSelect,
  onTeamSelect,
  onVote,
  players,
  standings,
  suspensions,
  teams,
  votes,
}) {
  const ui = useUiText()
  const [activeTab, setActiveTab] = useState('Details')
  const home = getMatchTeam(match, teams, 'home')
  const away = getMatchTeam(match, teams, 'away')
  const liveClock = getLiveClock(match, now)
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
      <DetailTopBar onBack={onBack} title={ui.matchCenter} />
      <section className="premium-card motion-card overflow-hidden rounded-xl border border-[#dce1d7] bg-[#10261d] text-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {getMatchCompetitionLabel(match, ui)}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#14201b] transition hover:bg-[#eef3e9]"
              onClick={() => openWhatsAppMatchShare({ match, now, players, teams, ui })}
            >
              <Share2 className="h-4 w-4" />
              {ui.share}
            </button>
          </div>
        </div>
        <div dir="ltr" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 pb-5 pt-2">
          <MatchHeroTeam align="right" onTeamSelect={onTeamSelect} team={home} />
          <div className="rounded-xl bg-white px-4 py-3 text-center text-[#14201b] shadow-sm">
            <p className="text-2xl font-semibold leading-none">
              <MatchScoreText match={match} />
            </p>
            <p className="mt-1 text-xs font-semibold uppercase text-[#65756b]">
              {match.status === 'live' ? liveClock.displayMinute : getStatusLabel(match.status, ui)}
            </p>
            <MatchCountdown className="mt-2 justify-center" match={match} now={now} />
          </div>
          <MatchHeroTeam onTeamSelect={onTeamSelect} team={away} />
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-center text-xs font-semibold text-[#cfe7d8]">
          {formatLongDate(match.date)} / {match.venue}
        </div>
      </section>
      <TabStrip activeTab={activeTab} onChange={setActiveTab} tabs={detailTabs} />
      {activeTab === 'Details' && (
        <div className="tab-panel-enter grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <MatchCompetitionCard match={match} />
            {match.status === 'scheduled' && match.homeTeamId && match.awayTeamId && (
              <PredictionVote match={match} onVote={onVote} teams={teams} votes={votes} />
            )}
            <TeamComparisonCard allMatches={allMatches} away={away} home={home} standings={standings} />
            <ScoringSummary match={match} players={players} teams={teams} />
          </div>
          <div className="grid content-start gap-4">
            <MatchShareCardPanel match={match} players={players} teams={teams} />
            <StandingsPreview match={match} onTeamSelect={onTeamSelect} standings={standings} />
            <RecentFormCard allMatches={allMatches} away={away} home={home} />
          </div>
        </div>
      )}
      {activeTab === 'Players' && (
        <div className="tab-panel-enter">
          <MatchPlayersPanel
            match={match}
            onPlayerSelect={onPlayerSelect}
            players={players}
            suspensions={suspensions}
            teams={teams}
          />
        </div>
      )}
      {activeTab === 'Standings' && (
        <div className="tab-panel-enter">
          <StandingsPreview large match={match} onTeamSelect={onTeamSelect} standings={standings} />
        </div>
      )}
      {activeTab === 'Matches' && (
        <section className="tab-panel-enter motion-card content-auto overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title={ui.relatedMatches} detail={ui.bothTeams} />
          <div className="divide-y divide-[#e5e9e0] border-t border-[#e5e9e0]">
            {relatedMatches.length ? (
              relatedMatches.map((item) => (
                <MatchRow
                  key={item.id}
                  match={item}
                  now={now}
                  onMatchSelect={onMatchSelect}
                  teams={teams}
                  votes={votes}
                />
              ))
            ) : (
              <div className="p-4">
                <EmptyState text={ui.noRelatedMatchesYet} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function MatchShareCardPanel({ match, players, teams }) {
  const ui = useUiText()
  const [busyAction, setBusyAction] = useState('')
  const [notice, setNotice] = useState('')
  const [shareCardFlagState, setShareCardFlagState] = useState({ data: {}, key: '' })
  const [brandLogoUrl, setBrandLogoUrl] = useState(brandLogoFallbackDataUrl)
  const selectedFormat = shareCardFormats[0]
  const shareCardTeams = useMemo(() => getShareCardTeams(match, teams), [match, teams])
  const shareCardFlagKey = useMemo(
    () => shareCardTeams.map((team) => getTeamFlag(team)?.code ?? team.id).join('|'),
    [shareCardTeams],
  )
  const flagsReady = shareCardFlagState.key === shareCardFlagKey
  const flagDataByCode = useMemo(
    () => (flagsReady ? shareCardFlagState.data : {}),
    [flagsReady, shareCardFlagState.data],
  )

  useEffect(() => {
    let cancelled = false

    loadShareCardFlagData(shareCardTeams)
      .then((data) => {
        if (!cancelled) {
          setShareCardFlagState({ data, key: shareCardFlagKey })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setShareCardFlagState({ data: {}, key: shareCardFlagKey })
          setNotice(error.message || ui.couldNotGenerateImage)
        }
      })

    return () => {
      cancelled = true
    }
  }, [shareCardFlagKey, shareCardTeams, ui])

  useEffect(() => {
    let cancelled = false

    loadBrandLogoDataUrl()
      .then((nextBrandLogoUrl) => {
        if (!cancelled) {
          setBrandLogoUrl(nextBrandLogoUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBrandLogoUrl(brandLogoFallbackDataUrl)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const previewSvg = useMemo(
    () => flagsReady
      ? buildMatchShareCardSvg({
          brandLogoUrl,
          flagDataByCode,
          format: selectedFormat,
          match,
          players,
          teams,
          ui,
        })
      : '',
    [brandLogoUrl, flagDataByCode, flagsReady, match, players, selectedFormat, teams, ui],
  )
  const previewUrl = previewSvg ? encodeSvgDataUri(previewSvg) : ''
  const aspectClass = 'aspect-[9/16]'

  async function runShareCardAction(action, handler) {
    setBusyAction(action)
    setNotice('')

    try {
      const result = await handler()
      setNotice(result === 'downloaded' && action === 'share'
        ? ui.sharingNotSupportedDownloaded
        : action === 'share'
          ? ui.shareSheetOpened
          : ui.imageDownloaded)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setNotice(error.message || ui.couldNotGenerateImage)
      }
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Share2} title={ui.matchShareCard} detail={ui.shareCardDestinations} />
      <div className="grid gap-4 border-t border-[#e5e9e0] p-4">
        <div className="inline-flex min-h-9 w-fit items-center rounded-full border border-[#dce1d7] bg-[#f8faf5] px-3 text-xs font-black uppercase text-[#34433a]">
          {getShareCardFormatLabel(selectedFormat, ui)} / 1080x1920
        </div>

        <div className={`mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-[#dce1d7] bg-[#10261d] shadow-sm ${aspectClass}`}>
          {previewUrl ? (
            <img
              alt={ui.matchShareCardPreview}
              className="h-full w-full object-cover"
              src={previewUrl}
            />
          ) : (
            <div className="grid h-full place-items-center bg-[#10261d] px-4 text-center text-sm font-semibold text-white">
              {ui.generating}
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(busyAction)}
            onClick={() =>
              runShareCardAction('download', () =>
                downloadMatchShareCard({ format: selectedFormat, match, players, teams, ui }),
              )
            }
          >
            <Download className="h-4 w-4" />
            {busyAction === 'download' ? ui.generating : ui.downloadImage}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d4dace] bg-[#fbfdf9] px-4 text-sm font-semibold text-[#34433a] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(busyAction)}
            onClick={() =>
              runShareCardAction('share', () =>
                shareMatchShareCard({ format: selectedFormat, match, players, teams, ui }),
              )
            }
          >
            <Share2 className="h-4 w-4" />
            {busyAction === 'share' ? ui.generating : ui.shareImageButton}
          </button>
        </div>

        {notice && (
          <p className="rounded-md bg-[#eef3e9] px-3 py-2 text-xs font-semibold text-[#34433a]">
            {notice}
          </p>
        )}
      </div>
    </section>
  )
}

function DetailTopBar({ onBack, title }) {
  const ui = useUiText()

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#d4dace] bg-white px-3 text-sm font-semibold text-[#34433a]"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        {ui.back}
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
      dir="ltr"
      className={`tap-target grid min-w-0 justify-items-center gap-2 text-center ${
        align === 'right' ? 'sm:justify-items-end sm:text-right' : 'sm:justify-items-start sm:text-left'
      }`}
      onClick={() => team?.id && onTeamSelect?.(team.id)}
    >
      <FlagMark team={team} />
      <span className="max-w-full truncate text-sm font-semibold sm:text-base" dir="auto">{team.country}</span>
    </button>
  )
}

function TabStrip({ activeTab, onChange, tabs }) {
  const ui = useUiText()

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-[#dce1d7]">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`nav-tab tap-target relative min-h-11 shrink-0 px-3 text-sm font-semibold ${
            activeTab === tab
              ? 'nav-tab-active text-[#14201b]'
              : 'text-[#65756b]'
          }`}
          onClick={() => onChange(tab)}
        >
          {getTabLabel(tab, ui)}
        </button>
      ))}
    </div>
  )
}

function MatchCompetitionCard({ match }) {
  const ui = useUiText()

  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Trophy} title={ui.competition} detail={getMatchRoundLabel(match, ui)} />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2">
        <AdminMetric label={ui.tournament} value={ui.tournamentTitle} />
        <AdminMetric label={ui.round} value={getMatchRoundLabel(match, ui)} />
        <AdminMetric label={ui.date} value={formatLongDate(match.date)} />
        <AdminMetric label={ui.time} value={match.time} />
        <AdminMetric label={ui.venue} value={match.venue} />
        <AdminMetric label={ui.status} value={getStatusLabel(match.status, ui)} />
      </div>
    </section>
  )
}

function StandingsPreview({ large = false, match, onTeamSelect, standings }) {
  const ui = useUiText()
  const rows = isLeagueStage(match.stage) ? getMatchStandingsRows(standings, match) : []
  const groupCode = rows[0]?.group

  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader
        icon={Table2}
        title={large ? ui.leagueStandings : ui.standingsPreview}
        detail={isLeagueStage(match.stage) && groupCode ? getLocalizedGroupLabel(groupCode, ui) : ui.knockoutMatch}
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
          <EmptyState text={ui.standingsAvailableForLeague} />
        )}
      </div>
    </section>
  )
}

function TeamComparisonCard({ allMatches, away, home, standings }) {
  const ui = useUiText()
  const homeRecord = getTeamRecord(allMatches, home.id)
  const awayRecord = getTeamRecord(allMatches, away.id)
  const homeStanding = getTeamStandingRow(standings, home.id)
  const awayStanding = getTeamStandingRow(standings, away.id)

  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={BarChart3} title={ui.compareTeams} detail={ui.tournamentForm} />
      <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
        <ComparisonRow away={awayStanding?.rank ?? '-'} home={homeStanding?.rank ?? '-'} label={ui.ranking} />
        <ComparisonRow away={awayRecord.goalsFor} home={homeRecord.goalsFor} label={ui.goalsScored} />
        <ComparisonRow away={awayRecord.goalsAgainst} home={homeRecord.goalsAgainst} label={ui.goalsConceded} />
        <ComparisonRow away={awayRecord.wins} home={homeRecord.wins} label={ui.wins} />
        <ComparisonRow away={awayRecord.draws} home={homeRecord.draws} label={ui.draws} />
        <ComparisonRow away={awayRecord.losses} home={homeRecord.losses} label={ui.losses} />
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
  const ui = useUiText()

  return (
    <section className="motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Activity} title={ui.recentForm} detail={ui.lastMatches} />
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

function TeamPage({ allMatches, onBack, onMatchSelect, onPlayerSelect, players, standings, suspensions, team, teams }) {
  const ui = useUiText()
  const [activeTab, setActiveTab] = useState('Matches')
  const [playerQuery, setPlayerQuery] = useState('')
  const teamMatches = getTeamMatches(allMatches, team.id)
  const standing = getTeamStandingRow(standings, team.id)
  const teamStandingsRows = getTeamStandingsRows(standings, team.id)
  const teamEventTotals = getTeamEventTotals(players, team.id)
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(playerQuery.trim().toLowerCase()),
  )
  const suspendedPlayers = players.filter((player) =>
    getPlayerSuspension(suspensions, player.id).suspended,
  )

  return (
    <div className="grid min-w-0 gap-4">
      <DetailTopBar onBack={onBack} title={ui.teamPage} />
      <section className="premium-card motion-card overflow-hidden rounded-xl border border-[#dce1d7] bg-[#10261d] text-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <FlagMark team={team} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{team.country}</h1>
              <p className="mt-1 text-sm text-[#cfe7d8]">{getTournamentTableLabel(ui)} / {players.length} {ui.playersCount}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <IconButton icon={Share2} label={ui.shareTeam} />
          </div>
        </div>
      </section>
      <TabStrip activeTab={activeTab} onChange={setActiveTab} tabs={teamPageTabs} />
      {activeTab === 'Matches' && (
        <section className="tab-panel-enter premium-card overflow-hidden rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title={ui.matches} detail={`${teamMatches.length} ${ui.fixtures}`} />
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
        <section className="tab-panel-enter premium-card motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Table2} title={ui.standings} detail={standing ? getLocalizedGroupLabel(standing.group, ui) : getTournamentTableLabel(ui)} />
          <div className="grid gap-2 border-t border-[#e5e9e0] p-3">
            {teamStandingsRows.map((row) => (
              <CompactStandingRow key={row.team.id} row={row} />
            ))}
          </div>
        </section>
      )}
      {activeTab === 'Players' && (
        <section className="tab-panel-enter premium-card motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Users} title={ui.players} detail={ui.searchPlayers} />
          <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
            {suspendedPlayers.length > 0 && (
              <section className="grid gap-2 rounded-lg border border-[#f0d491] bg-[#fffaf0] p-3">
                <h3 className="text-sm font-semibold text-[#7a5300]">{ui.unavailable}</h3>
                {suspendedPlayers.map((player) => (
                  <SuspendedPlayerRow
                    key={player.id}
                    player={player}
                    suspension={getPlayerSuspension(suspensions, player.id)}
                  />
                ))}
              </section>
            )}
            <SearchInput
              onChange={setPlayerQuery}
              placeholder={ui.searchPlayers}
              value={playerQuery}
            />
            <div className="grid gap-2">
              {filteredPlayers.map((player) => (
                <CleanPlayerCard
                  key={player.id}
                  onClick={() => onPlayerSelect(player.id)}
                  player={player}
                  suspension={getPlayerSuspension(suspensions, player.id)}
                  team={team}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      {activeTab === 'Statistics' && (
        <section className="tab-panel-enter premium-card motion-card content-auto rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={BarChart3} title={ui.statistics} detail={ui.tournamentTotals} />
          <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetric label={ui.rank} value={standing ? `#${standing.rank}` : '-'} />
            <AdminMetric label={ui.points} value={standing?.points ?? 0} />
            <AdminMetric label="GF:GA" value={`${standing?.goalsFor ?? 0}:${standing?.goalsAgainst ?? 0}`} />
            <AdminMetric label={ui.goals} value={teamEventTotals.goals} />
            <AdminMetric label={ui.yellowCards} value={teamEventTotals.yellowCards} />
            <AdminMetric label={ui.redCards} value={teamEventTotals.redCards} />
            <AdminMetric label={ui.form} value={getTeamForm(allMatches, team.id).join(' ') || '-'} />
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

function CleanPlayerCard({ onClick, player, suspension, team }) {
  const ui = useUiText()
  const suspended = suspension?.suspended

  return (
    <button
      type="button"
      aria-label={`${ui.playerProfile}: ${player.name}`}
      className={`tap-target grid min-h-16 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 text-left hover:border-[#9cb4a5] ${
        suspended ? 'border-[#f0d491] bg-[#fffaf0]' : 'border-[#dce1d7] bg-white'
      }`}
      onClick={onClick}
    >
      <PlayerAvatar player={player} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#14201b]">{player.name}</span>
        <span className="block truncate text-xs text-[#65756b]">
          {team.country}
        </span>
      </span>
      {suspended ? <SuspensionBadge label={ui.suspended} /> : <FlagMark team={team} small />}
    </button>
  )
}

function SuspendedPlayerRow({ player, suspension }) {
  const ui = useUiText()

  return (
    <div className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-white px-3">
      <PlayerAvatar player={player} small />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#14201b]">{player.name}</span>
        <span className="block truncate text-xs text-[#7a5300]">{formatSuspensionDetail(suspension)}</span>
      </span>
      <SuspensionBadge label={ui.suspended} />
    </div>
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

function PlayerPage({ allMatches, onBack, onMatchSelect, onTeamSelect, player, suspension, teams }) {
  const ui = useUiText()
  const team = getPlayerTeam(player, teams)
  const playerMatches = getTeamMatches(allMatches, player.teamId)
  const playerNames = getPlayerNameCandidates(player)
  const chartRows = playerMatches.map((match) => {
    const matchEvents = (match.events ?? []).filter(
      (event) =>
        event.playerId === player.id ||
        playerNames.includes(event.player),
    )

    return {
      label: formatDate(match.date),
      goals: matchEvents.filter((event) =>
        event.type === liveEventTypes.goal &&
        (event.playerId === player.id || playerNames.includes(event.player)),
      ).length,
    }
  }).filter((row) => row.goals > 0).slice(-6)

  return (
    <div className="grid min-w-0 gap-4">
      <DetailTopBar onBack={onBack} title={ui.player} />
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
              <span className="truncate">{team?.country}</span>
            </button>
          </div>
        </div>
      </section>
      {suspension?.suspended && (
        <section className="rounded-lg border border-[#f0d491] bg-[#fffaf0] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#7a5300]">{ui.suspensionStatus}</h2>
              <p className="mt-1 text-sm text-[#34433a]">{formatSuspensionDetail(suspension)}</p>
            </div>
            <SuspensionBadge label={ui.suspended} />
          </div>
        </section>
      )}
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={BarChart3} title={ui.tournamentStats} detail={ui.currentData} />
        <div className="grid gap-3 border-t border-[#e5e9e0] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <AdminMetric label={ui.matches} value={playerMatches.filter(isScoredMatch).length} />
          <AdminMetric label={ui.goals} value={player.goals} />
          <AdminMetric label={ui.yellowCards} value={player.yellowCards ?? 0} />
          <AdminMetric label={ui.redCards} value={player.redCards ?? 0} />
          <AdminMetric label={ui.suspensionStatus} value={suspension?.suspended ? ui.suspended : '-'} />
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Activity} title={ui.goalsByMatch} detail={ui.recentFixtures} />
        <div className="grid gap-3 border-t border-[#e5e9e0] p-4">
          {chartRows.length ? <PlayerMiniChart rows={chartRows} /> : <EmptyState text={ui.noGoalsRecordedYet} />}
        </div>
      </section>
      <section className="rounded-lg border border-[#dce1d7] bg-white shadow-sm">
        <PanelHeader icon={Clock} title={ui.matchHistory} detail={ui.previousMatches} />
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
              <EmptyState text={ui.noMatchHistoryYet} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function PlayerMiniChart({ rows }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.goals))

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        return (
          <div key={row.label} className="grid grid-cols-[58px_minmax(0,1fr)_52px] items-center gap-3">
            <span className="text-xs font-semibold text-[#65756b]">{row.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[#eef3e9]">
              <div
                className="h-full rounded-full bg-[#1f6d4d]"
                style={{ width: `${(row.goals / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-right text-xs font-semibold text-[#34433a]">
              {row.goals}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function KnockoutBoard({ matches, onBack, onMatchSelect, teams }) {
  const ui = useUiText()
  const [activeStage, setActiveStage] = useState(tournamentFormat.stages.semiFinal)
  const [expanded, setExpanded] = useState(false)
  const stageMatches = matches
    .filter((match) => match.stage === activeStage)
    .sort(compareMatchKickoffAsc)

  return (
    <div className="grid min-w-0 gap-4">
      <Toolbar title={ui.knockout} icon={Trophy}>
        <button
          type="button"
          className="tap-target inline-flex min-h-11 items-center gap-2 rounded-md bg-[#163428] px-3 text-sm font-semibold text-white"
          onClick={() => setExpanded(true)}
        >
          <Expand className="h-4 w-4" />
          {ui.expand}
        </button>
      </Toolbar>
      <section className="motion-card overflow-hidden rounded-lg border border-[#dce1d7] bg-[#10261d] shadow-sm">
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-3">
          {knockoutStageFilters.map((stage) => (
            <FilterChip
              active={activeStage === stage.id}
              key={stage.id}
              label={getStageLabel(stage.id, ui)}
              onClick={() => setActiveStage(stage.id)}
            />
          ))}
        </div>
        <div className="grid gap-3 bg-[#07100d] p-3">
          <section className="motion-card content-auto overflow-hidden rounded-xl border border-white/10 bg-white">
            <div className="border-b border-[#e5e9e0] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#14201b]">
                {getStageLabel(activeStage, ui)}
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
                  <EmptyState text={ui.noMatchesAvailableForStageYet} />
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
      <div className="mobile-knockout-board-path lg:hidden">
        <KnockoutPanel matches={matches} onMobileBack={onBack} teams={teams} />
      </div>
      <div className="hidden lg:block">
        <KnockoutPanel matches={matches} teams={teams} />
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 bg-[#07100d] p-4 text-white">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#9fb5aa]">{ui.bracketViewer}</p>
              <h2 className="text-lg font-semibold">{ui.knockoutPath}</h2>
            </div>
            <button
              type="button"
              className="tap-target grid h-10 w-10 place-items-center rounded-md bg-white/10"
              onClick={() => setExpanded(false)}
              aria-label={ui.closeBracket}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100vh-84px)] overflow-auto rounded-xl border border-white/10 bg-[#07100d] p-4 text-white">
            <KnockoutPanel matches={matches} onMobileBack={() => setExpanded(false)} teams={teams} />
          </div>
        </div>
      )}
    </div>
  )
}

function createEmptyTeamDraft() {
  return {
    countryEn: '',
    countryHe: '',
    countryAr: '',
    code: '',
    group: 'B',
    color: '#1f6d4d',
    secondary: '#eef3e9',
  }
}

function getContestantKey(match, side) {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  const label = side === 'home' ? match.homeLabel : match.awayLabel

  if (teamId) return `team:${teamId}`
  if (label) return `placeholder:${label}`
  return ''
}

function getContestantSelectValue(match, side) {
  return getContestantKey(match, side)
}

function applyContestantDraft(draft, side, value) {
  const teamField = side === 'home' ? 'homeTeamId' : 'awayTeamId'
  const labelField = side === 'home' ? 'homeLabel' : 'awayLabel'

  if (value.startsWith('team:')) {
    return {
      ...draft,
      [labelField]: '',
      [teamField]: value.replace('team:', ''),
    }
  }

  if (value.startsWith('placeholder:')) {
    return {
      ...draft,
      [labelField]: value.replace('placeholder:', ''),
      [teamField]: '',
    }
  }

  return {
    ...draft,
    [labelField]: '',
    [teamField]: '',
  }
}

function getDefaultKnockoutContestants(stage) {
  const options = getKnockoutPlaceholderOptions(stage)

  return {
    awayLabel: options[1]?.value ?? '',
    homeLabel: options[0]?.value ?? '',
  }
}

function validateMatchDraft(match, ui = getUiDictionary('en')) {
  const homeKey = getContestantKey(match, 'home')
  const awayKey = getContestantKey(match, 'away')

  if (isLeagueStage(match.stage)) {
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new Error(`${ui.groupStage}: ${ui.team1} / ${ui.team2}`)
    }
  } else if (!homeKey || !awayKey) {
    throw new Error(`${getShortStageLabel(match.stage, ui)}: ${ui.team1} / ${ui.team2}`)
  }

  if (homeKey && homeKey === awayKey) {
    throw new Error(`${ui.team1} / ${ui.team2}`)
  }

  if (!match.date || !match.time) {
    throw new Error(`${ui.date} / ${ui.time}`)
  }
}

function createNewMatchDraft(teams) {
  const firstTeam = teams[0]

  return {
    stage: tournamentFormat.stages.group,
    group: firstTeam ? getTeamGroupCode(firstTeam) : 'A',
    matchday: 1,
    date: '2026-06-20',
    time: '19:30',
      venue: tournamentFormat.fixedVenueEn,
      venueEn: tournamentFormat.fixedVenueEn,
      venueHe: tournamentFormat.fixedVenueHe,
      venueAr: tournamentFormat.fixedVenueAr,
    homeTeamId: teams[0]?.id ?? '',
    awayTeamId: teams[1]?.id ?? '',
    homeLabel: '',
    awayLabel: '',
    homeScore: '',
    awayScore: '',
    status: 'scheduled',
    matchPhase: matchPhases.scheduled,
    phasePausedSeconds: 0,
    matchStartTime: undefined,
    matchEndTime: undefined,
  }
}

function createBlankMatchDraft(teams) {
  return {
    ...createNewMatchDraft(teams),
    awayTeamId: '',
    date: '',
    homeTeamId: '',
    time: '',
  }
}

function matchToAdminDraft(match) {
  if (!match) {
    return null
  }

  return {
    ...match,
    stage: isLeagueStage(match.stage) ? tournamentFormat.stages.group : match.stage,
    events: (match.events ?? []).map((event) => ({
      automatic: event.automatic ?? false,
      minute: event.minute,
      eventPhase: event.eventPhase ?? '',
      displayMinute: event.displayMinute ?? '',
      type: event.type ?? 'goal',
      teamId: event.teamId ?? '',
      playerId: event.playerId ?? '',
      player: event.player ?? '',
      assistPlayerId: event.assistPlayerId ?? '',
      assist: event.assist ?? '',
      reason: event.reason ?? '',
    })),
    group: match.group ?? 'A',
    matchday: match.matchday ?? 1,
    homeTeamId: match.homeTeamId ?? '',
    awayTeamId: match.awayTeamId ?? '',
    homeLabel: match.homeLabel ?? '',
    awayLabel: match.awayLabel ?? '',
    homeScore: match.homeScore ?? '',
    awayScore: match.awayScore ?? '',
    minute: match.minute ?? '',
    matchPhase: match.matchPhase ?? (match.status === 'live' ? matchPhases.firstHalf : match.status),
    phaseStartedAt: match.phaseStartedAt ?? match.matchStartTime ?? undefined,
    pauseStartedAt: match.pauseStartedAt ?? undefined,
    phasePausedSeconds: match.phasePausedSeconds ?? 0,
    previousPhase: match.previousPhase ?? undefined,
    matchStartTime: match.matchStartTime ?? undefined,
    matchEndTime: match.matchEndTime ?? undefined,
    firstHalfStartTime: match.firstHalfStartTime ?? match.matchStartTime ?? undefined,
    firstHalfEndTime: match.firstHalfEndTime ?? undefined,
    secondHalfStartTime: match.secondHalfStartTime ?? undefined,
    secondHalfEndTime: match.secondHalfEndTime ?? undefined,
    venue: tournamentFormat.fixedVenueEn,
    venueEn: tournamentFormat.fixedVenueEn,
    venueHe: tournamentFormat.fixedVenueHe,
    venueAr: tournamentFormat.fixedVenueAr,
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
  onDeleteMatch,
  onDeletePlayer,
  onDeleteTeam,
  onInviteAdmin,
  onOpenQuickMode,
  onSaveMatch,
  onSavePlayer,
  onSaveTeam,
  onSignIn,
  onSignOut,
  now,
  players,
  suspensions,
  standings,
  teams,
}) {
  const ui = useUiText()
  const [adminEmailDraft, setAdminEmailDraft] = useState('')
  const [adminNotice, setAdminNotice] = useState(null)
  const [pendingAdminAction, setPendingAdminAction] = useState('')
  const [teamDraft, setTeamDraft] = useState(() => createEmptyTeamDraft())
  const [playerDraft, setPlayerDraft] = useState({
    teamId: teams[0]?.id ?? '',
    nameEn: '',
    nameHe: '',
    nameAr: '',
  })
  const [newMatchDraft, setNewMatchDraft] = useState(() => createNewMatchDraft(teams))
  const preferredAdminMatch = useMemo(
    () => allMatches.find((match) => match.status === 'live') ?? getUpcomingMatches(allMatches)[0] ?? allMatches[0] ?? null,
    [allMatches],
  )
  const [selectedMatchId, setSelectedMatchId] = useState(preferredAdminMatch?.id ?? '')
  const effectivePlayerTeamId = teams.some((team) => team.id === playerDraft.teamId)
    ? playerDraft.teamId
    : teams[0]?.id ?? ''
  const effectiveSelectedMatchId = allMatches.some((match) => match.id === selectedMatchId)
    ? selectedMatchId
    : preferredAdminMatch?.id ?? ''
  const selectedMatch = allMatches.find((match) => match.id === effectiveSelectedMatchId)
  const selectedTeamPlayerCount = players.filter(
    (player) => player.teamId === effectivePlayerTeamId,
  ).length

  const teamOptions = teams.map((team) => ({
    label: `${team.country} (${team.code})`,
    team,
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
  const rematchRows = Object.values(standings).flat().filter((row) => row.rematchRequired)

  async function runAdminFormAction(actionKey, successMessage, action) {
    if (pendingAdminAction) {
      return false
    }

    setPendingAdminAction(actionKey)
    setAdminNotice(null)

    try {
      await action()
      setAdminNotice({ message: successMessage, type: 'success' })
      return true
    } catch (error) {
      setAdminNotice({ message: error.message || ui.actionFailed, type: 'error' })
      return false
    } finally {
      setPendingAdminAction('')
    }
  }

  async function submitAdminLogin(event) {
    event.preventDefault()

    if (!adminEmailDraft.trim()) {
      return
    }

    await onSignIn(adminEmailDraft.trim())
  }

  async function submitTeam(event) {
    event.preventDefault()

    if (!teamDraft.countryEn.trim() || !teamDraft.countryHe.trim() || !teamDraft.countryAr.trim() || !teamDraft.code.trim()) {
      return
    }

    const saved = await runAdminFormAction('add-team', ui.teamAddedSuccessfully, () => onAddTeam(teamDraft))

    if (saved) {
      setTeamDraft(createEmptyTeamDraft())
    }
  }

  async function submitPlayer(event) {
    event.preventDefault()

    if (!playerDraft.nameEn.trim() || !playerDraft.nameHe.trim() || !playerDraft.nameAr.trim() || !effectivePlayerTeamId) {
      return
    }

    const saved = await runAdminFormAction(
      'add-player',
      ui.playerAddedSuccessfully,
      () => onAddPlayer({ ...playerDraft, teamId: effectivePlayerTeamId }),
    )

    if (saved) {
      setPlayerDraft((draft) => ({
        ...draft,
        nameEn: '',
        nameHe: '',
        nameAr: '',
      }))
    }
  }

  async function submitNewMatch(event) {
    event.preventDefault()
    const saved = await runAdminFormAction(
      'add-match',
      ui.matchAddedSuccessfully,
      () => onAddMatch(newMatchDraft),
    )

    if (saved) {
      setNewMatchDraft(createBlankMatchDraft(teams))
    }
  }

  const saveTeamWithFeedback = (team) => runAdminFormAction(
    'save-team',
    ui.changesSavedSuccessfully,
    () => onSaveTeam(team),
  )
  const deleteTeamWithFeedback = (teamId) => runAdminFormAction(
    'delete-team',
    ui.deletedSuccessfully,
    () => onDeleteTeam(teamId),
  )
  const savePlayerWithFeedback = (player) => runAdminFormAction(
    'save-player',
    ui.changesSavedSuccessfully,
    () => onSavePlayer(player),
  )
  const deletePlayerWithFeedback = (playerId) => runAdminFormAction(
    'delete-player',
    ui.deletedSuccessfully,
    () => onDeletePlayer(playerId),
  )
  const saveMatchWithFeedback = (match) => runAdminFormAction(
    'save-match',
    ui.changesSavedSuccessfully,
    () => onSaveMatch(match),
  )
  const deleteMatchWithFeedback = (matchId) => runAdminFormAction(
    'delete-match',
    ui.deletedSuccessfully,
    () => onDeleteMatch(matchId),
  )

  const adminAccessCard = (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={LockKeyhole} title={ui.adminAccess} detail={ui.adminControlPanel} />
      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4">
        {adminEmail ? (
          <div className="grid gap-3">
            <div className="rounded-md bg-[#eef3e9] px-3 py-3 text-sm text-[#34433a]">
              {ui.signedInAs} {adminEmail}
              <span className="mt-1 block text-xs text-[#65756b]">
                {adminUnlocked
                  ? ui.adminAccessConfirmed
                  : ui.thisEmailIsNotAdmin}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d4dace] bg-white px-4 text-sm font-semibold text-[#34433a]"
              onClick={onSignOut}
            >
              <LockKeyhole className="h-4 w-4" />
              {ui.signOut}
            </button>
          </div>
        ) : (
          <form className="grid min-w-0 gap-3" onSubmit={submitAdminLogin}>
            <AdminTextInput
              disabled={false}
              label={ui.adminEmail}
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
              {ui.sendLoginLink}
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
            <AdminMetric label={ui.teams} value={teams.length} />
            <AdminMetric label={ui.players} value={players.length} />
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
      <AdminActionNotice notice={adminNotice} onClose={() => setAdminNotice(null)} />
      <AdminLiveMatchControl
        key={effectiveSelectedMatchId}
        disabled={disabled}
        match={selectedMatch}
        matchOptions={matchOptions}
        now={now}
        onOpenQuickMode={onOpenQuickMode}
        onSaveMatch={saveMatchWithFeedback}
        selectedMatchId={effectiveSelectedMatchId}
        setSelectedMatchId={setSelectedMatchId}
        teamOptions={teamOptions}
      />

      <AdminAccordionSection icon={PencilLine} title={ui.matchSetup} detail={ui.scoreAndDetails}>
        {rematchRows.length > 0 && (
          <section className="rounded-lg border border-[#f0d491] bg-[#fffaf0] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#7a5300]" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#7a5300]">{ui.scheduleRematch}</h2>
                <p className="mt-1 text-sm leading-6 text-[#34433a]">{ui.rematchAdminSuggestion}</p>
                <p className="mt-2 text-xs font-semibold text-[#7a5300]">
                  {rematchRows.map((row) => row.team.country).join(' / ')}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={PencilLine} title={ui.editMatch} detail={ui.scoreAndDetails} />
          <EditMatchForm
            key={effectiveSelectedMatchId}
            disabled={disabled}
            match={selectedMatch}
            matchOptions={matchOptions}
            onDeleteMatch={deleteMatchWithFeedback}
            onOpenQuickMode={onOpenQuickMode}
            onSaveMatch={saveMatchWithFeedback}
            now={now}
            players={players}
            selectedMatchId={effectiveSelectedMatchId}
            setSelectedMatchId={setSelectedMatchId}
            suspensions={suspensions}
            teamOptions={teamOptions}
          />
        </section>

        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={CalendarDays} title={ui.addMatch} detail={ui.fixtureSetup} />
          <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitNewMatch}>
            <MatchDraftFields
              disabled={disabled}
              draft={newMatchDraft}
              setDraft={setNewMatchDraft}
              teamOptions={teamOptions}
            />
            <AdminSubmit
              disabled={disabled || Boolean(pendingAdminAction) || teams.length < 2}
              icon={Plus}
              label={ui.addMatch}
              pendingLabel={pendingAdminAction === 'add-match' ? ui.adding : ''}
            />
          </form>
        </section>
      </AdminAccordionSection>

      <AdminAccordionSection icon={Users} title={ui.teamsAndPlayers} detail={ui.squadManagement}>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
            <PanelHeader icon={ShieldCheck} title={ui.addTeam} detail={ui.tournamentSetup} />
            <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitTeam}>
              <AdminTextInput
                disabled={disabled}
                label={ui.teamNameEnglish}
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, countryEn: value }))}
                placeholder={ui.teamName}
                value={teamDraft.countryEn}
              />
              <AdminTextInput
                disabled={disabled}
                label={ui.teamNameHebrew}
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, countryHe: value }))}
                placeholder="שם הקבוצה"
                value={teamDraft.countryHe}
              />
              <AdminTextInput
                disabled={disabled}
                label={ui.teamNameArabic}
                onChange={(value) => setTeamDraft((draft) => ({ ...draft, countryAr: value }))}
                placeholder="اسم الفريق"
                value={teamDraft.countryAr}
              />
              <FieldGrid>
                <AdminTextInput
                  disabled={disabled}
                  label={ui.code}
                  maxLength={3}
                  onChange={(value) => setTeamDraft((draft) => ({ ...draft, code: value }))}
                  placeholder={ui.code}
                  value={teamDraft.code}
                />
                <AdminTextInput disabled label={ui.table} value={getTournamentTableLabel(ui)} />
              </FieldGrid>
              <FieldGrid>
                <AdminTextInput
                  disabled={disabled}
                  label={ui.primary}
                  onChange={(value) => setTeamDraft((draft) => ({ ...draft, color: value }))}
                  type="color"
                  value={teamDraft.color}
                />
                <AdminTextInput
                  disabled={disabled}
                  label={ui.secondary}
                  onChange={(value) => setTeamDraft((draft) => ({ ...draft, secondary: value }))}
                  type="color"
                  value={teamDraft.secondary}
                />
              </FieldGrid>
              <AdminSubmit
                disabled={disabled || Boolean(pendingAdminAction)}
                icon={Plus}
                label={ui.addTeam}
                pendingLabel={pendingAdminAction === 'add-team' ? ui.adding : ''}
              />
            </form>
          </section>

          <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
            <PanelHeader icon={Users} title={ui.addPlayer} detail={ui.squadManagement} />
            <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitPlayer}>
              <div className="rounded-md bg-[#eef3e9] px-3 py-3 text-sm text-[#34433a]">
                {ui.players}: {selectedTeamPlayerCount}
              </div>
              <AdminSelect
                disabled={disabled || !teams.length}
                label={ui.team}
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, teamId: value }))}
                options={teamOptions}
                value={effectivePlayerTeamId}
              />
              <AdminTextInput
                disabled={disabled}
                label={ui.playerNameEnglish}
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, nameEn: value }))}
                placeholder={ui.playerName}
                value={playerDraft.nameEn}
              />
              <AdminTextInput
                disabled={disabled}
                label={ui.playerNameHebrew}
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, nameHe: value }))}
                placeholder="שם השחקן"
                value={playerDraft.nameHe}
              />
              <AdminTextInput
                disabled={disabled}
                label={ui.playerNameArabic}
                onChange={(value) => setPlayerDraft((draft) => ({ ...draft, nameAr: value }))}
                placeholder="اسم اللاعب"
                value={playerDraft.nameAr}
              />
              <AdminSubmit
                disabled={disabled || Boolean(pendingAdminAction) || !teams.length}
                icon={Plus}
                label={ui.addPlayer}
                pendingLabel={pendingAdminAction === 'add-player' ? ui.adding : ''}
              />
            </form>
          </section>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <TeamManagementPanel
            disabled={disabled}
            onDeleteTeam={deleteTeamWithFeedback}
            onSaveTeam={saveTeamWithFeedback}
            teams={teams}
          />
          <PlayerManagementPanel
            disabled={disabled}
            onDeletePlayer={deletePlayerWithFeedback}
            onSavePlayer={savePlayerWithFeedback}
            players={players}
            teamOptions={teamOptions}
          />
        </div>
      </AdminAccordionSection>

      <AdminAccordionSection icon={Smartphone} title={ui.sharing} detail={ui.fieldSharing}>
        <QrPosterPanel adminUnlocked={adminUnlocked} />
      </AdminAccordionSection>

      <AdminAccordionSection icon={Settings} title={ui.adminSettings} detail={ui.adminControlPanel}>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {adminAccessCard}
          <InviteAdminPanel onInviteAdmin={onInviteAdmin} />
        </div>
        <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
          <PanelHeader icon={Smartphone} title={ui.versionRoadmap} detail={ui.mvpFirst} />
          <div className="grid min-w-0 gap-3 border-t border-[#e5e9e0] p-4 md:grid-cols-3">
            <RoadmapItem title={ui.publicDashboard} detail={ui.publicDashboardDetail} />
            <RoadmapItem title={ui.adminUpdates} detail={ui.adminUpdatesDetail} />
            <RoadmapItem title={ui.pwaRelease} detail={ui.pwaReleaseDetail} />
          </div>
        </section>
      </AdminAccordionSection>
    </div>
  )
}

function AdminLiveMatchControl({
  disabled,
  match,
  matchOptions,
  now,
  onOpenQuickMode,
  onSaveMatch,
  selectedMatchId,
  setSelectedMatchId,
  teamOptions,
}) {
  const ui = useUiText()
  const [draft, setDraft] = useState(() => matchToAdminDraft(match))
  const [saving, setSaving] = useState(false)
  const adminTeams = teamOptionsToTeams(teamOptions)
  const teamOne = draft ? getMatchTeam(draft, adminTeams, 'home') : null
  const teamTwo = draft ? getMatchTeam(draft, adminTeams, 'away') : null
  const liveClock = draft?.status === 'live' ? getLiveClock(draft, now) : null
  const isPlaying = [matchPhases.firstHalf, matchPhases.secondHalf].includes(draft?.matchPhase)
  const isPaused = draft?.matchPhase === matchPhases.paused
  const isHalftime = draft?.matchPhase === matchPhases.halftime
  const statusOptions = [
    { label: ui.scheduled, value: 'scheduled' },
    { label: ui.live, value: 'live' },
    { label: ui.finished, value: 'final' },
  ]

  async function saveDraft(nextDraft = draft) {
    if (!nextDraft) {
      return
    }

    const adminDraft = matchToAdminDraft(nextDraft)

    setSaving(true)
    try {
      const saved = await onSaveMatch(adminDraft)

      if (saved === false) {
        return false
      }

      setDraft(adminDraft)
      return true
    } finally {
      setSaving(false)
    }
  }

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }))
  }

  async function submitLiveControl(event) {
    event.preventDefault()
    await saveDraft()
  }

  async function submitEndMatch() {
    if (draft && window.confirm(ui.endMatchConfirm)) {
      await saveDraft(endLiveMatch(draft, new Date()))
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Timer} title={ui.liveMatchControl} detail={ui.adminLiveControl} />
      <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitLiveControl}>
        <AdminSelect
          disabled={disabled || saving || !matchOptions.length}
          label={ui.match}
          onChange={setSelectedMatchId}
          options={matchOptions.length ? matchOptions : [{ label: ui.noMatchScheduledYet, value: '' }]}
          value={selectedMatchId}
        />

        {draft ? (
          <>
            <div className="rounded-xl bg-[#10261d] p-4 text-white">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase">
                  {getMatchPhaseLabel(draft, ui)}
                </span>
                <span className="rounded-full bg-[#bd1f36] px-3 py-1 text-sm font-black">
                  {draft.status === 'live' ? liveClock?.displayMinute : draft.status === 'final' ? ui.fullTime : ui.scheduled}
                </span>
              </div>
              <div dir="ltr" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <LiveAdminTeam team={teamOne} align="right" label={ui.team1} />
                <div className="rounded-xl bg-white px-4 py-3 text-center text-[#14201b]">
                  <p className="text-3xl font-black leading-none">
                    <MatchScoreText match={draft} fallbackScore={`${normalizeScore(draft.homeScore) ?? 0}-${normalizeScore(draft.awayScore) ?? 0}`} />
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-[#65756b]">{ui.score}</p>
                </div>
                <LiveAdminTeam team={teamTwo} label={ui.team2} />
              </div>
            </div>

            <FieldGrid>
              <AdminTextInput
                disabled={disabled || saving}
                label={`${ui.team1} ${ui.score}`}
                min="0"
                onChange={(value) => updateDraft('homeScore', value)}
                type="number"
                value={draft.homeScore}
              />
              <AdminTextInput
                disabled={disabled || saving}
                label={`${ui.team2} ${ui.score}`}
                min="0"
                onChange={(value) => updateDraft('awayScore', value)}
                type="number"
                value={draft.awayScore}
              />
            </FieldGrid>

            <FieldGrid>
              <AdminSelect
                disabled={disabled || saving}
                label={ui.status}
                onChange={(value) => updateDraft('status', value)}
                options={statusOptions}
                value={draft.status ?? 'scheduled'}
              />
              <AdminMetric label={ui.venue} value={getVenueName({}, ui.currentLanguage)} />
            </FieldGrid>

            {draft.status === 'live' && (
              <LiveMinuteEditor
                currentMinute={liveClock?.minute}
                disabled={disabled || saving}
                onApply={(minute) => saveDraft(setLiveMatchMinute(draft, minute, new Date()))}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {draft.status === 'scheduled' && (
                <LiveActionButton
                  disabled={disabled || saving || !draft.homeTeamId || !draft.awayTeamId}
                  label={ui.startMatch}
                  onClick={() => saveDraft(startLiveMatch(draft, new Date()))}
                  tone="primary"
                />
              )}
              {draft.status === 'live' && draft.matchPhase === matchPhases.firstHalf && (
                <LiveActionButton disabled={disabled || saving} label={ui.endFirstHalfHalftime} onClick={() => saveDraft(endFirstHalf(draft, new Date()))} tone="primary" />
              )}
              {draft.status === 'live' && isHalftime && (
                <LiveActionButton disabled={disabled || saving} label={ui.startSecondHalf} onClick={() => saveDraft(startSecondHalf(draft, new Date()))} tone="primary" />
              )}
              {draft.status === 'live' && isPlaying && (
                <LiveActionButton disabled={disabled || saving} label={ui.pause} onClick={() => saveDraft(pauseLiveMatch(draft, new Date()))} />
              )}
              {draft.status === 'live' && isPaused && (
                <LiveActionButton disabled={disabled || saving} label={ui.resume} onClick={() => saveDraft(resumeLiveMatch(draft, new Date()))} tone="primary" />
              )}
              {draft.status === 'live' && (draft.matchPhase === matchPhases.secondHalf || isPaused) && (
                <LiveActionButton disabled={disabled || saving} label={ui.endMatch} onClick={submitEndMatch} tone="danger" />
              )}
              <button
                type="button"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#1f6d4d] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                disabled={disabled || saving || !draft.id}
                onClick={() => draft.id && onOpenQuickMode(draft.id)}
              >
                <Timer className="h-4 w-4" />
                {ui.quickMode}
              </button>
              <AdminSubmit disabled={disabled || saving || !draft} icon={Save} label={saving ? ui.saving : ui.save} />
            </div>
          </>
        ) : (
          <EmptyState text={ui.noMatchScheduledYet} />
        )}
      </form>
    </section>
  )
}

function AdminAccordionSection({ children, detail, icon: Icon, title }) {
  return (
    <details className="group min-w-0 overflow-hidden rounded-xl border border-[#dce1d7] bg-white shadow-sm">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-[#f8faf5]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-[#eef3e9] text-[#1f6d4d]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#14201b]">{title}</h2>
            <p className="truncate text-xs text-[#65756b]">{detail}</p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-[#65756b] transition group-open:rotate-180" />
      </summary>
      <div className="grid min-w-0 gap-6 border-t border-[#e5e9e0] bg-[#fbfdf9] p-4">
        {children}
      </div>
    </details>
  )
}

function QrPosterPanel({ adminUnlocked }) {
  const ui = useUiText()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [notice, setNotice] = useState('')
  const [brandLogoUrl, setBrandLogoUrl] = useState(brandLogoFallbackDataUrl)
  const posterSvg = useMemo(
    () => qrDataUrl ? buildPosterSvg({ brandLogoUrl, qrDataUrl, ui, websiteUrl: tournamentPublicUrl }) : '',
    [brandLogoUrl, qrDataUrl, ui],
  )
  const posterPreviewUrl = posterSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg)}`
    : ''

  useEffect(() => {
    let mounted = true

    Promise.all([
      QRCode.toDataURL(tournamentPublicUrl, {
        color: {
          dark: '#10261d',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 900,
      }),
      loadBrandLogoDataUrl(),
    ])
      .then(([nextQrDataUrl, nextBrandLogoUrl]) => {
        if (mounted) {
          setQrDataUrl(nextQrDataUrl)
          setBrandLogoUrl(nextBrandLogoUrl)
        }
      })
      .catch((error) => {
        if (mounted) {
          setNotice(error.message || ui.couldNotGenerateQrCode)
          setBrandLogoUrl(brandLogoFallbackDataUrl)
        }
      })

    return () => {
      mounted = false
    }
  }, [ui])

  async function runPosterAction(action, handler) {
    setBusyAction(action)
    setNotice('')

    try {
      await handler()
      setNotice(action === 'print' ? ui.printDialogOpened : ui.posterDownloaded)
    } catch (error) {
      setNotice(error.message || ui.couldNotGeneratePoster)
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Smartphone} title={ui.qrPoster} detail={ui.fieldSharing} />
      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4">
        <div className="rounded-lg bg-[#10261d] p-3">
          <div className="mx-auto aspect-[8/11] w-full max-w-[220px] overflow-hidden rounded-md bg-white">
            {posterPreviewUrl ? (
              <img
                alt={ui.qrPosterPreview}
                className="h-full w-full object-cover"
                src={posterPreviewUrl}
              />
            ) : (
              <div className="grid h-full place-items-center px-4 text-center text-sm font-semibold text-[#65756b]">
                {ui.generatingQrPoster}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-[#14201b]">{ui.scanToFollow}</p>
          <p className="break-all rounded-md bg-[#f8faf5] px-3 py-2 text-xs font-semibold text-[#65756b]">
            {tournamentPublicUrl}
          </p>
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!adminUnlocked || Boolean(busyAction)}
            onClick={() => runPosterAction('download', () => downloadQrPoster(tournamentPublicUrl, ui))}
          >
            <Download className="h-4 w-4" />
            {busyAction === 'download' ? ui.generating : ui.downloadPoster}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d4dace] bg-[#fbfdf9] px-4 text-sm font-semibold text-[#34433a] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!adminUnlocked || Boolean(busyAction) || !posterSvg}
            onClick={() => runPosterAction('print', () => printQrPoster({ posterSvg, ui }))}
          >
            <Smartphone className="h-4 w-4" />
            {busyAction === 'print' ? ui.preparing : ui.printPoster}
          </button>
        </div>
        {notice && (
          <p className="rounded-md bg-[#eef3e9] px-3 py-2 text-xs font-semibold text-[#34433a]">
            {notice}
          </p>
        )}
      </div>
    </section>
  )
}

function InviteAdminPanel({ onInviteAdmin }) {
  const ui = useUiText()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submitInvite(event) {
    event.preventDefault()
    const nextEmail = email.trim().toLowerCase()

    if (!nextEmail || saving) {
      return
    }

    setSaving(true)
    setNotice('')
    setErrorMessage('')

    try {
      const invitedEmail = await onInviteAdmin(nextEmail)
      setNotice(ui.t('adminInviteSuccess', { email: invitedEmail }))
      setEmail('')
    } catch (error) {
      setErrorMessage(error.message || ui.adminInviteError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={ShieldCheck} title={ui.inviteAdmin} detail={ui.inviteAdminDetail} />
      <form className="grid min-w-0 gap-3 border-t border-[#e5e9e0] p-4" onSubmit={submitInvite}>
        <AdminTextInput
          disabled={saving}
          label={ui.adminEmail}
          onChange={setEmail}
          placeholder="name@example.com"
          type="email"
          value={email}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          disabled={saving || !email.trim()}
        >
          <ShieldCheck className="h-4 w-4" />
          {saving ? ui.saving : ui.inviteAdmin}
        </button>
        {notice && (
          <p className="rounded-md bg-[#eef3e9] px-3 py-2 text-xs font-semibold text-[#34433a]">
            {notice}
          </p>
        )}
        {errorMessage && (
          <p className="rounded-md bg-[#fff1f1] px-3 py-2 text-xs font-semibold text-[#9b2f2f]">
            {errorMessage}
          </p>
        )}
      </form>
    </section>
  )
}

function TeamManagementPanel({ disabled, onDeleteTeam, onSaveTeam, teams }) {
  const ui = useUiText()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  const teamOptions = [
    { label: ui.selectTeam, value: '' },
    ...teams.map((team) => ({
      label: `${team.countryEn || team.country} (${team.code})`,
      team,
      value: team.id,
    })),
  ]

  async function saveSelectedTeam(team) {
    const saved = await onSaveTeam(team)

    if (saved) {
      setSelectedTeamId('')
    }

    return saved
  }

  async function deleteSelectedTeam(teamId) {
    const deleted = await onDeleteTeam(teamId)

    if (deleted) {
      setSelectedTeamId('')
    }

    return deleted
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={ShieldCheck} title={ui.manageTeams} detail={ui.editOrDelete} />
      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4">
        {teams.length ? (
          <>
            <AdminSelect
              disabled={disabled}
              label={ui.team}
              onChange={setSelectedTeamId}
              options={teamOptions}
              value={selectedTeamId}
            />
            {selectedTeam && (
              <TeamEditForm
                disabled={disabled}
                key={selectedTeam.id}
                onDeleteTeam={deleteSelectedTeam}
                onSaveTeam={saveSelectedTeam}
                team={selectedTeam}
              />
            )}
          </>
        ) : (
          <EmptyState text={ui.noTeamsYet} />
        )}
      </div>
    </section>
  )
}

function TeamEditForm({ disabled, onDeleteTeam, onSaveTeam, team }) {
  const ui = useUiText()
  const [draft, setDraft] = useState(team)

  async function submitTeamEdit(event) {
    event.preventDefault()

    if (!draft.countryEn?.trim() || !draft.countryHe?.trim() || !draft.countryAr?.trim() || !draft.code?.trim()) {
      return
    }

    await onSaveTeam(draft)
  }

  async function submitTeamDelete() {
    if (window.confirm(ui.t('deleteTeamConfirm', { name: draft.countryEn || draft.country }))) {
      await onDeleteTeam(draft.id)
    }
  }

  return (
    <form className="grid min-w-0 gap-4" onSubmit={submitTeamEdit}>
      <AdminTextInput disabled={disabled} label={ui.teamNameEnglish} onChange={(value) => setDraft((current) => ({ ...current, countryEn: value }))} value={draft.countryEn ?? ''} />
      <AdminTextInput disabled={disabled} label={ui.teamNameHebrew} onChange={(value) => setDraft((current) => ({ ...current, countryHe: value }))} value={draft.countryHe ?? ''} />
      <AdminTextInput disabled={disabled} label={ui.teamNameArabic} onChange={(value) => setDraft((current) => ({ ...current, countryAr: value }))} value={draft.countryAr ?? ''} />
      <FieldGrid>
        <AdminTextInput disabled={disabled} label={ui.code} maxLength={3} onChange={(value) => setDraft((current) => ({ ...current, code: value }))} value={draft.code ?? ''} />
        <AdminTextInput disabled label={ui.table} value={getTournamentTableLabel(ui)} />
      </FieldGrid>
      <FieldGrid>
        <AdminTextInput disabled={disabled} label={ui.primary} onChange={(value) => setDraft((current) => ({ ...current, color: value }))} type="color" value={draft.color ?? '#1f6d4d'} />
        <AdminTextInput disabled={disabled} label={ui.secondary} onChange={(value) => setDraft((current) => ({ ...current, secondary: value }))} type="color" value={draft.secondary ?? '#eef3e9'} />
      </FieldGrid>
      <div className="flex flex-wrap gap-2">
        <AdminSubmit disabled={disabled} icon={Save} label={ui.save} />
        <AdminDangerButton disabled={disabled} icon={Trash2} label={ui.deleteTeam} onClick={submitTeamDelete} />
      </div>
    </form>
  )
}

function PlayerManagementPanel({ disabled, onDeletePlayer, onSavePlayer, players, teamOptions }) {
  const ui = useUiText()
  const [selectedTeamId, setSelectedTeamId] = useState(teamOptions[0]?.value ?? '')
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const effectiveSelectedTeamId = teamOptions.some((option) => option.value === selectedTeamId)
    ? selectedTeamId
    : ''
  const teamPlayers = players.filter((player) => player.teamId === effectiveSelectedTeamId)
  const filteredPlayers = filterQuickModePlayers(teamPlayers, playerSearch)
  const selectedPlayer = teamPlayers.find((player) => player.id === selectedPlayerId)
  const playerOptions = [
    { label: ui.selectPlayer, value: '' },
    ...filteredPlayers.map((player) => ({
      label: player.name,
      value: player.id,
    })),
  ]

  function selectTeam(teamId) {
    setSelectedTeamId(teamId)
    setPlayerSearch('')
    setSelectedPlayerId('')
  }

  async function saveSelectedPlayer(player) {
    const saved = await onSavePlayer(player)

    if (saved) {
      setSelectedPlayerId('')
      setPlayerSearch('')
    }

    return saved
  }

  async function deleteSelectedPlayer(playerId) {
    const deleted = await onDeletePlayer(playerId)

    if (deleted) {
      setSelectedPlayerId('')
      setPlayerSearch('')
    }

    return deleted
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-white shadow-sm">
      <PanelHeader icon={Users} title={ui.managePlayers} detail={ui.editOrDelete} />
      <div className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4">
        {players.length ? (
          <>
            <AdminSelect
              disabled={disabled || !teamOptions.length}
              label={ui.team}
              onChange={selectTeam}
              options={teamOptions}
              value={effectiveSelectedTeamId}
            />
            <AdminTextInput
              disabled={disabled || !effectiveSelectedTeamId}
              label={ui.searchPlayers}
              onChange={(value) => {
                setPlayerSearch(value)
                setSelectedPlayerId('')
              }}
              placeholder={ui.searchPlayer}
              value={playerSearch}
            />
            <AdminSelect
              disabled={disabled || !effectiveSelectedTeamId || !filteredPlayers.length}
              label={ui.player}
              onChange={setSelectedPlayerId}
              options={playerOptions}
              value={selectedPlayerId}
            />
            {selectedPlayer && (
              <PlayerEditForm
                disabled={disabled}
                key={selectedPlayer.id}
                onDeletePlayer={deleteSelectedPlayer}
                onSavePlayer={saveSelectedPlayer}
                player={selectedPlayer}
                teamOptions={teamOptions}
              />
            )}
          </>
        ) : (
          <EmptyState text={ui.noPlayersAdmin} />
        )}
      </div>
    </section>
  )
}

function PlayerEditForm({ disabled, onDeletePlayer, onSavePlayer, player, teamOptions }) {
  const ui = useUiText()
  const [draft, setDraft] = useState(player)

  async function submitPlayerEdit(event) {
    event.preventDefault()

    if (!draft.nameEn?.trim() || !draft.nameHe?.trim() || !draft.nameAr?.trim() || !draft.teamId) {
      return
    }

    await onSavePlayer(draft)
  }

  async function submitPlayerDelete() {
    if (window.confirm(ui.t('deletePlayerConfirm', { name: draft.nameEn || draft.name }))) {
      await onDeletePlayer(draft.id)
    }
  }

  return (
    <form className="grid min-w-0 gap-4" onSubmit={submitPlayerEdit}>
      <AdminSelect disabled={disabled || !teamOptions.length} label={ui.team} onChange={(value) => setDraft((current) => ({ ...current, teamId: value }))} options={teamOptions} value={draft.teamId ?? ''} />
      <AdminTextInput disabled={disabled} label={ui.playerNameEnglish} onChange={(value) => setDraft((current) => ({ ...current, nameEn: value }))} value={draft.nameEn ?? ''} />
      <AdminTextInput disabled={disabled} label={ui.playerNameHebrew} onChange={(value) => setDraft((current) => ({ ...current, nameHe: value }))} value={draft.nameHe ?? ''} />
      <AdminTextInput disabled={disabled} label={ui.playerNameArabic} onChange={(value) => setDraft((current) => ({ ...current, nameAr: value }))} value={draft.nameAr ?? ''} />
      <div className="flex flex-wrap gap-2">
        <AdminSubmit disabled={disabled} icon={Save} label={ui.save} />
        <AdminDangerButton disabled={disabled} icon={Trash2} label={ui.deletePlayer} onClick={submitPlayerDelete} />
      </div>
    </form>
  )
}

function MatchDraftFields({ disabled, draft, setDraft, showScoreFields = false, teamOptions }) {
  const ui = useUiText()
  const isGroupStage = isLeagueStage(draft.stage)
  const localizedStageOptions = stageOptions.map((stage) => ({
    ...stage,
    label: getStageLabel(stage.value, ui),
  }))
  const groupOptions = tournamentFormat.groupKeys.map((groupCode) => ({
    label: getLocalizedGroupLabel(groupCode, ui),
    value: groupCode,
  }))
  const groupTeamOptions = [
    { label: ui.selectTeam, value: '' },
    ...teamOptions,
  ]
  const knockoutContestantOptions = [
    { label: ui.tbd, value: '' },
    ...teamOptions.map((teamOption) => ({
      ...teamOption,
      value: `team:${teamOption.value}`,
    })),
    ...getKnockoutPlaceholderOptions(draft.stage).map((placeholder) => ({
      label: placeholder.label,
      value: `placeholder:${placeholder.value}`,
    })),
  ]
  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }
  const updateStage = (stage) => {
    setDraft((currentDraft) => {
      if (isLeagueStage(stage)) {
        return {
          ...currentDraft,
          awayLabel: '',
          group: currentDraft.group || tournamentFormat.groupKeys[0],
          homeLabel: '',
          stage,
        }
      }

      return {
        ...currentDraft,
        ...getDefaultKnockoutContestants(stage),
        awayTeamId: '',
        group: undefined,
        homeTeamId: '',
        stage,
      }
    })
  }
  const updateContestant = (side, value) => {
    if (isGroupStage) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        [`${side}Label`]: '',
        [`${side}TeamId`]: value,
      }))
      return
    }

    setDraft((currentDraft) => applyContestantDraft(currentDraft, side, value))
  }

  return (
    <div className="grid min-w-0 gap-4">
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label={ui.stage}
          onChange={updateStage}
          options={localizedStageOptions}
          value={draft.stage}
        />
        {isGroupStage && (
          <AdminSelect
            disabled={disabled}
            label={ui.group}
            onChange={(value) => updateDraft('group', value)}
            options={groupOptions}
            value={draft.group ?? tournamentFormat.groupKeys[0]}
          />
        )}
      </FieldGrid>
      <FieldGrid>
        <AdminTextInput
          disabled={disabled}
          label={ui.date}
          onChange={(value) => updateDraft('date', value)}
          type="date"
          value={draft.date}
        />
        <AdminTextInput
          disabled={disabled}
          label={ui.time}
          onChange={(value) => updateDraft('time', value)}
          type="time"
          value={draft.time}
        />
      </FieldGrid>
      <AdminMetric label={ui.venue} value={getVenueName({}, ui.currentLanguage)} />
      <FieldGrid>
        <AdminSelect
          disabled={disabled}
          label={ui.team1}
          onChange={(value) => updateContestant('home', value)}
          options={isGroupStage ? groupTeamOptions : knockoutContestantOptions}
          value={isGroupStage ? draft.homeTeamId : getContestantSelectValue(draft, 'home')}
        />
        <AdminSelect
          disabled={disabled}
          label={ui.team2}
          onChange={(value) => updateContestant('away', value)}
          options={isGroupStage ? groupTeamOptions : knockoutContestantOptions}
          value={isGroupStage ? draft.awayTeamId : getContestantSelectValue(draft, 'away')}
        />
      </FieldGrid>
      <FieldGrid>
        <AdminMetric label={ui.status} value={getStatusLabel(draft.status ?? 'scheduled', ui)} />
        <AdminTextInput
          disabled={disabled}
          label={ui.matchday}
          min="1"
          onChange={(value) => updateDraft('matchday', value)}
          type="number"
          value={draft.matchday}
        />
      </FieldGrid>
      {showScoreFields && (
        <FieldGrid>
          <AdminTextInput
            disabled={disabled}
            label={`${ui.team1} ${ui.score}`}
            min="0"
            onChange={(value) => updateDraft('homeScore', value)}
            type="number"
            value={draft.homeScore}
          />
          <AdminTextInput
            disabled={disabled}
            label={`${ui.team2} ${ui.score}`}
            min="0"
            onChange={(value) => updateDraft('awayScore', value)}
            type="number"
            value={draft.awayScore}
          />
        </FieldGrid>
      )}
    </div>
  )
}

function EditMatchForm({
  disabled,
  match,
  matchOptions,
  now,
  onDeleteMatch,
  onOpenQuickMode,
  onSaveMatch,
  players,
  selectedMatchId,
  setSelectedMatchId,
  suspensions,
  teamOptions,
}) {
  const ui = useUiText()
  const [draft, setDraft] = useState(() => matchToAdminDraft(match))
  const [eventAction, setEventAction] = useState(null)
  const [editingEventIndex, setEditingEventIndex] = useState(null)
  const [eventNotice, setEventNotice] = useState('')
  const [eventError, setEventError] = useState('')
  const adminTeams = teamOptionsToTeams(teamOptions)
  const teamOne = draft ? getMatchTeam(draft, adminTeams, 'home') : null
  const teamTwo = draft ? getMatchTeam(draft, adminTeams, 'away') : null
  const liveClock = draft?.status === 'live' ? getLiveClock(draft, now) : null

  async function submitEditMatch(event) {
    event.preventDefault()

    if (!draft) {
      return
    }

    await onSaveMatch(draft)
  }

  async function saveDraft(nextDraft) {
    const adminDraft = matchToAdminDraft(nextDraft)

    const saved = await onSaveMatch(adminDraft)

    if (saved === false) {
      return false
    }

    setDraft(adminDraft)
    return true
  }

  async function submitStartMatch() {
    if (!draft) {
      return
    }

    await saveDraft(startLiveMatch(draft, new Date()))
  }

  async function submitEndFirstHalf() {
    if (!draft) {
      return
    }

    await saveDraft(endFirstHalf(draft, new Date()))
  }

  async function submitStartSecondHalf() {
    if (!draft) {
      return
    }

    await saveDraft(startSecondHalf(draft, new Date()))
  }

  async function submitPauseMatch() {
    if (!draft) {
      return
    }

    await saveDraft(pauseLiveMatch(draft, new Date()))
  }

  async function submitResumeMatch() {
    if (!draft) {
      return
    }

    await saveDraft(resumeLiveMatch(draft, new Date()))
  }

  async function submitEndMatch() {
    if (!draft || !window.confirm('End this match and keep the current score as final?')) {
      return
    }

    await saveDraft(endLiveMatch(draft, new Date()))
  }

  async function submitLiveEvent(event) {
    if (!draft) {
      return
    }

    const nextDraft = editingEventIndex === null
      ? applyLiveEventToMatch(draft, event)
      : replaceEventInMatchAtIndex(draft, editingEventIndex, event)

    setEventError('')

    try {
      const saved = await saveDraft(nextDraft)

      if (saved === false) {
        setEventError(ui.eventSaveFailed)
        return
      }

      setEventAction(null)
      setEditingEventIndex(null)
      setEventNotice(ui.changesSavedSuccessfully)
    } catch (error) {
      setEventError(error.message || ui.eventSaveFailed)
    }
  }

  function editMatchEvent(index) {
    const event = draft?.events?.[index]

    if (!event || event.automatic) {
      return
    }

    setEditingEventIndex(index)
    setEventAction([liveEventTypes.penaltyGoal, liveEventTypes.penaltyMiss].includes(event.type)
      ? liveEventTypes.penalty
      : event.type)
  }

  async function deleteMatchEvent(index) {
    if (!draft || !window.confirm(ui.deleteEventConfirm)) {
      return
    }

    const saved = await saveDraft(removeEventFromMatch(draft, index))

    if (saved !== false) {
      setEventAction(null)
      setEditingEventIndex(null)
      setEventNotice(ui.eventDeletedSuccessfully)
    }
  }

  async function submitDeleteMatch() {
    if (draft?.id && window.confirm('Delete this match and its events?')) {
      await onDeleteMatch(draft.id)
    }
  }

  return (
    <>
      <form className="grid min-w-0 gap-4 border-t border-[#e5e9e0] p-4" onSubmit={submitEditMatch}>
        <AdminSelect
          disabled={disabled || !matchOptions.length}
          label={ui.match}
          onChange={(value) => setSelectedMatchId(value)}
          options={matchOptions}
          value={selectedMatchId}
        />
        {draft && (
          <MatchDraftFields
            disabled={disabled}
            draft={draft}
            setDraft={setDraft}
            showScoreFields
            teamOptions={teamOptions}
          />
        )}
        {draft && (
          <LiveMatchAdminPanel
            disabled={disabled}
            draft={draft}
            liveClock={liveClock}
            onAddEvent={setEventAction}
            onCorrectMinute={(minute) => saveDraft(setLiveMatchMinute(draft, minute, new Date()))}
            onEndFirstHalf={submitEndFirstHalf}
            onEndMatch={submitEndMatch}
            onPauseMatch={submitPauseMatch}
            onResumeMatch={submitResumeMatch}
            onStartSecondHalf={submitStartSecondHalf}
            onStartMatch={submitStartMatch}
            teamOne={teamOne}
            teamTwo={teamTwo}
          />
        )}
        {draft && (
          <AdminEventTimeline
            match={draft}
            onDeleteEvent={deleteMatchEvent}
            onEditEvent={editMatchEvent}
            players={players}
            teams={adminTeams}
          />
        )}
        {eventNotice && (
          <p className="rounded-md border border-[#b8dcc7] bg-[#eef3e9] px-3 py-2 text-sm font-semibold text-[#163428]">
            {eventNotice}
          </p>
        )}
        {eventError && (
          <p className="rounded-md border border-[#e2b7b7] bg-[#fff1f1] px-3 py-2 text-sm font-semibold text-[#8b2e2e]">
            {eventError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <AdminSubmit disabled={disabled || !draft} icon={Save} label={ui.saveDetails} />
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={disabled || !draft}
            onClick={() => draft?.id && onOpenQuickMode(draft.id)}
          >
            <Timer className="h-4 w-4" />
            {ui.quickMode}
          </button>
          <AdminDangerButton disabled={disabled || !draft} icon={Trash2} label={ui.deleteMatch} onClick={submitDeleteMatch} />
        </div>
      </form>
      {draft && eventAction && (
        <LiveEventModal
          action={eventAction}
          disabled={disabled}
          editEvent={editingEventIndex === null ? null : draft.events?.[editingEventIndex]}
          match={draft}
          now={now}
          onClose={() => {
            setEventAction(null)
            setEditingEventIndex(null)
          }}
          onSubmit={submitLiveEvent}
          players={players}
          suspensions={suspensions}
          teamOne={teamOne}
          teamTwo={teamTwo}
        />
      )}
    </>
  )
}

function removeEventFromMatch(match, eventIndex) {
  const events = [...(match.events ?? [])]
  const [removedEvent] = events.splice(eventIndex, 1)

  if (!removedEvent) {
    return match
  }

  const scoreUpdate = [liveEventTypes.goal, liveEventTypes.ownGoal, liveEventTypes.penaltyGoal].includes(removedEvent.type)
    ? removedEvent.teamId === match.homeTeamId
      ? { homeScore: Math.max(0, (normalizeScore(match.homeScore) ?? 0) - 1) }
      : { awayScore: Math.max(0, (normalizeScore(match.awayScore) ?? 0) - 1) }
    : {}

  return {
    ...match,
    ...scoreUpdate,
    events: normalizeMatchDisciplineEvents(events),
    minute: events.at(-1)?.minute ?? calculateLiveMinute(match, new Date()),
  }
}

function undoLastEventFromMatch(match) {
  return removeEventFromMatch(match, (match.events?.length ?? 0) - 1)
}

function replaceEventInMatchAtIndex(match, eventIndex, event) {
  const withoutEvent = removeEventFromMatch(match, eventIndex)
  const eventsBefore = withoutEvent.events ?? []
  const nextMatch = applyLiveEventToMatch(withoutEvent, event)
  const addedEvents = (nextMatch.events ?? []).slice(eventsBefore.length)
  const nextEvents = [...eventsBefore]

  if (addedEvents.length) {
    nextEvents.splice(Math.min(eventIndex, nextEvents.length), 0, ...addedEvents)
  }

  return {
    ...nextMatch,
    events: normalizeMatchDisciplineEvents(nextEvents),
  }
}

function replaceLastEventInMatch(match, event) {
  return applyLiveEventToMatch(undoLastEventFromMatch(match), event)
}

function getEventTeamSide(match, event) {
  return event?.teamId === match.awayTeamId ? 'away' : 'home'
}

function getEditEventTeamSide(match, event, players) {
  if (event?.type !== liveEventTypes.ownGoal) {
    return getEventTeamSide(match, event)
  }

  const player = players.find((item) => item.id === event.playerId)

  if (player?.teamId === match.awayTeamId) {
    return 'away'
  }

  if (player?.teamId === match.homeTeamId) {
    return 'home'
  }

  return getEventTeamSide(match, event)
}

function AdminQuickModeScreen({ match, now, onClose, onSaveMatch, players, suspensions, teams }) {
  const ui = useUiText()
  const [draft, setDraft] = useState(() => matchToAdminDraft(match))
  const [eventAction, setEventAction] = useState(null)
  const [editingLastEvent, setEditingLastEvent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quickEventNotice, setQuickEventNotice] = useState('')
  const [quickEventError, setQuickEventError] = useState('')
  const teamOne = draft ? getMatchTeam(draft, teams, 'home') : null
  const teamTwo = draft ? getMatchTeam(draft, teams, 'away') : null
  const liveClock = draft?.status === 'live' ? getLiveClock(draft, now) : null
  const isPlaying = [matchPhases.firstHalf, matchPhases.secondHalf].includes(draft?.matchPhase)
  const isPaused = draft?.matchPhase === matchPhases.paused
  const isHalftime = draft?.matchPhase === matchPhases.halftime
  const canEditEvents = draft?.status === 'final' || (draft?.status === 'live' && isPlaying)
  const lastEvent = draft?.events?.at(-1)

  async function handleQuickModeSaveMatch(nextDraft) {
    const adminDraft = matchToAdminDraft(nextDraft)

    setSaving(true)
    try {
      const saved = await onSaveMatch(adminDraft)

      if (saved === false) {
        return false
      }

      setDraft(adminDraft)
      return true
    } finally {
      setSaving(false)
    }
  }

  async function saveQuickAction(nextDraft) {
    if (!draft) {
      return
    }

    await handleQuickModeSaveMatch(nextDraft)
  }

  async function submitEvent(event) {
    if (!draft) {
      return
    }

    const nextDraft = editingLastEvent
      ? replaceLastEventInMatch(draft, event)
      : applyLiveEventToMatch(draft, event)

    setQuickEventError('')

    try {
      const saved = await handleQuickModeSaveMatch(nextDraft)

      if (saved === false) {
        setQuickEventError(ui.eventSaveFailed)
        return
      }

      setEventAction(null)
      setEditingLastEvent(false)
      setQuickEventNotice(ui.changesSavedSuccessfully)
    } catch (error) {
      setQuickEventError(error.message || ui.eventSaveFailed)
    }
  }

  async function undoLastEvent() {
    if (!draft?.events?.length) {
      return
    }

    await handleQuickModeSaveMatch(undoLastEventFromMatch(draft))
  }

  function editLastEvent() {
    if (!lastEvent) {
      return
    }

    setEditingLastEvent(true)
    setQuickEventNotice('')
    setQuickEventError('')
    setEventAction([liveEventTypes.penaltyGoal, liveEventTypes.penaltyMiss].includes(lastEvent.type)
      ? liveEventTypes.penalty
      : lastEvent.type)
  }

  function startEvent(action) {
    setEditingLastEvent(false)
    setQuickEventNotice('')
    setQuickEventError('')
    setEventAction(action)
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f6f7f2] text-[#14201b]">
      <div className="mx-auto grid min-h-screen w-full max-w-3xl gap-4 px-4 py-4">
        <div className="sticky top-0 z-10 -mx-4 border-b border-[#dce1d7] bg-[#f6f7f2]/95 px-4 py-3 mobile-shadow-light">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#65756b]">{ui.adminLiveControl}</p>
              <h1 className="truncate text-xl font-semibold text-[#14201b]">{ui.quickMode}</h1>
            </div>
            <button
              type="button"
              className="tap-target grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#d4dace] bg-white"
              onClick={onClose}
              aria-label={ui.closeQuickMode}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {draft && (
          <>
            <section className="rounded-2xl bg-[#10261d] p-4 text-white shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase">
                  {getMatchPhaseLabel(draft, ui)}
                </span>
                <span className="rounded-full bg-[#bd1f36] px-3 py-1 text-sm font-bold">
                  {draft.status === 'live' ? liveClock?.displayMinute : draft.status === 'final' ? ui.fullTime : ui.scheduled}
                </span>
              </div>
              <div dir="ltr" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <QuickModeTeam team={teamOne} label={ui.team1} />
                <div className="rounded-2xl bg-white px-4 py-4 text-center text-[#14201b]">
                  <p className="text-4xl font-black leading-none">
                    <MatchScoreText match={draft} fallbackScore={`${normalizeScore(draft.homeScore) ?? 0}-${normalizeScore(draft.awayScore) ?? 0}`} />
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase text-[#65756b]">{ui.score}</p>
                </div>
                <QuickModeTeam align="right" team={teamTwo} label={ui.team2} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-[#cfe7d8]">
                <span>{formatDate(draft.date)} / {draft.time}</span>
                <span className="text-right">{getVenueName({}, ui.currentLanguage)}</span>
              </div>
            </section>

            <section className="grid gap-3 rounded-2xl border border-[#dce1d7] bg-white p-4 shadow-sm">
              {draft.status === 'live' && (
                <LiveMinuteEditor
                  currentMinute={liveClock?.minute}
                  disabled={saving}
                  onApply={(minute) => saveQuickAction(setLiveMatchMinute(draft, minute, new Date()))}
                />
              )}
              <div className="quick-action-grid grid grid-cols-2 gap-3">
                <QuickModeActionButton
                  disabled={saving || draft.status !== 'scheduled' || !draft.homeTeamId || !draft.awayTeamId}
                  label={ui.startMatch}
                  onClick={() => saveQuickAction(startLiveMatch(draft, new Date()))}
                  tone="primary"
                />
                <QuickModeActionButton
                  disabled={saving || draft.status !== 'live' || draft.matchPhase !== matchPhases.firstHalf}
                  label={ui.halftime}
                  onClick={() => saveQuickAction(endFirstHalf(draft, new Date()))}
                  tone="primary"
                />
                <QuickModeActionButton
                  disabled={saving || draft.status !== 'live' || !isHalftime}
                  label={ui.startSecondHalf}
                  onClick={() => saveQuickAction(startSecondHalf(draft, new Date()))}
                  tone="primary"
                />
                <QuickModeActionButton
                  disabled={saving || draft.status !== 'live' || !(draft.matchPhase === matchPhases.secondHalf || isPaused)}
                  label={ui.endMatch}
                  onClick={() => window.confirm(ui.endMatchConfirm) && saveQuickAction(endLiveMatch(draft, new Date()))}
                  tone="danger"
                />
                <QuickModeActionButton
                  disabled={saving || !canEditEvents}
                  label={ui.goal}
                  onClick={() => startEvent(liveEventTypes.goal)}
                  tone="score"
                />
                <QuickModeActionButton
                  disabled={saving || !canEditEvents}
                  label={ui.ownGoal}
                  onClick={() => startEvent(liveEventTypes.ownGoal)}
                  tone="score"
                />
                <QuickModeActionButton
                  disabled={saving || !canEditEvents}
                  label={ui.penalty}
                  onClick={() => startEvent(liveEventTypes.penalty)}
                  tone="warning"
                />
                <QuickModeActionButton
                  disabled={saving || !canEditEvents}
                  label={ui.yellowCard}
                  onClick={() => startEvent(liveEventTypes.yellowCard)}
                  tone="warning"
                />
                <QuickModeActionButton
                  disabled={saving || !canEditEvents}
                  label={ui.redCard}
                  onClick={() => startEvent(liveEventTypes.redCard)}
                  tone="danger"
                />
              </div>
              {draft.status === 'live' && (
                <div className="grid grid-cols-2 gap-3">
                  <QuickModeActionButton
                    disabled={saving || !isPlaying}
                    label={ui.pause}
                    onClick={() => saveQuickAction(pauseLiveMatch(draft, new Date()))}
                  />
                  <QuickModeActionButton
                    disabled={saving || !isPaused}
                    label={ui.resume}
                    onClick={() => saveQuickAction(resumeLiveMatch(draft, new Date()))}
                    tone="primary"
                  />
                </div>
              )}
            </section>

            {eventAction && (
              <QuickModeEventFlow
                action={eventAction}
                disabled={saving}
                editEvent={editingLastEvent ? lastEvent : null}
                match={draft}
                now={now}
                onCancel={() => {
                  setEventAction(null)
                  setEditingLastEvent(false)
                }}
                onSubmit={submitEvent}
                players={players}
                suspensions={suspensions}
                teamOne={teamOne}
                teamTwo={teamTwo}
              />
            )}

            <section className="grid gap-3 rounded-2xl border border-[#dce1d7] bg-white p-4 shadow-sm">
              {quickEventNotice && (
                <p className="rounded-xl border border-[#b8dcc7] bg-[#eef3e9] px-3 py-2 text-sm font-bold text-[#163428]">
                  {quickEventNotice}
                </p>
              )}
              {quickEventError && (
                <p className="rounded-xl border border-[#e2b7b7] bg-[#fff1f1] px-3 py-2 text-sm font-bold text-[#8b2e2e]">
                  {quickEventError}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#14201b]">{ui.eventTimeline}</h2>
                  <p className="text-xs text-[#65756b]">{ui.recentEventsUpdateImmediately}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-[#d4dace] bg-white px-3 text-sm font-semibold text-[#34433a] disabled:opacity-45"
                    disabled={saving || !lastEvent}
                    onClick={undoLastEvent}
                  >
                    {ui.undoLastEvent}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg bg-[#163428] px-3 text-sm font-semibold text-white disabled:opacity-45"
                    disabled={saving || !lastEvent}
                    onClick={editLastEvent}
                  >
                    {ui.editLastEvent}
                  </button>
                </div>
              </div>
              <AdminEventTimeline match={draft} players={players} teams={teams} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function QuickModeTeam({ align = 'left', label, team }) {
  const ui = useUiText()

  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`} dir="ltr">
      <p className="text-xs font-bold uppercase text-[#cfe7d8]">{label}</p>
      <div className={`mt-2 flex min-w-0 items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        {team && <FlagMark team={team} />}
        <p className="truncate text-base font-bold" dir="auto">{team?.country ?? ui.tbd}</p>
      </div>
    </div>
  )
}

function QuickModeActionButton({ disabled, label, onClick, tone = 'default' }) {
  const styles = tone === 'primary'
    ? 'bg-[#163428] text-white'
    : tone === 'score'
      ? 'bg-[#1f6d4d] text-white'
      : tone === 'danger'
        ? 'bg-[#9b2f2f] text-white'
        : tone === 'warning'
          ? 'bg-[#ffdb70] text-[#14201b]'
          : 'border border-[#d4dace] bg-[#fbfdf9] text-[#34433a]'

  return (
    <button
      type="button"
      className={`min-h-20 rounded-2xl px-3 text-base font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-35 ${styles}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function QuickModeEventFlow({
  action,
  disabled,
  editEvent,
  match,
  now,
  onCancel,
  onSubmit,
  players,
  suspensions,
  teamOne,
  teamTwo,
}) {
  const ui = useUiText()
  const initialTeamSide = editEvent ? getEditEventTeamSide(match, editEvent, players) : 'home'
  const [teamSide, setTeamSide] = useState(initialTeamSide)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerId, setPlayerId] = useState(editEvent?.playerId ?? '')
  const [penaltyOutcome, setPenaltyOutcome] = useState(editEvent?.type === liveEventTypes.penaltyMiss ? 'miss' : 'goal')
  const [minuteDraft, setMinuteDraft] = useState(String(editEvent?.minute ?? calculateLiveMinute(match, now)))
  const [warning, setWarning] = useState('')
  const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId
  const teamPlayers = players.filter((player) => player.teamId === teamId)
  const searchedPlayers = filterQuickModePlayers(teamPlayers, playerSearch)
  const selectedPlayer = teamPlayers.find((player) => player.id === playerId)
  const selectedPlayerSuspension = selectedPlayer
    ? getPlayerSuspension(suspensions, selectedPlayer.id)
    : null
  const title = editEvent ? `${ui.edit} ${formatEventTypeLabel(action, ui)}` : formatEventTypeLabel(action, ui)
  const playerLabel = action === liveEventTypes.goal
    ? ui.scorer
    : action === liveEventTypes.ownGoal
      ? ui.ownGoalScorer
      : action === liveEventTypes.penalty
        ? ui.penaltyShooter
        : ui.player

  function selectTeam(nextTeamSide) {
    setTeamSide(nextTeamSide)
    setPlayerId('')
    setPlayerSearch('')
  }

  async function submitQuickEvent(event) {
    event.preventDefault()
    setWarning('')

    if (!selectedPlayer) {
      return
    }

    try {
      await onSubmit(createLiveEvent({
        allowSentOff: Boolean(editEvent),
        match,
        minute: minuteDraft,
        now,
        penaltyOutcome,
        player: selectedPlayer,
        teamSide,
        type: action,
      }))
    } catch (error) {
      if (error.message === 'player_sent_off') {
        setWarning(ui.playerAlreadySentOff)
        return
      }

      throw error
    }
  }

  return (
    <form className="grid gap-4 rounded-2xl border border-[#dce1d7] bg-white p-4 shadow-sm" onSubmit={submitQuickEvent}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#65756b]">
            {match.status === 'live' ? getLiveClock(match, now).displayMinute : ui.eventTimeline}
          </p>
          <h2 className="text-xl font-black text-[#14201b]">{title}</h2>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-lg border border-[#d4dace] bg-white"
          onClick={onCancel}
          aria-label={ui.cancelEvent}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickModeActionButton
          disabled={disabled}
          label={`${ui.team1}: ${teamOne?.country ?? ui.tbd}`}
          onClick={() => selectTeam('home')}
          tone={teamSide === 'home' ? 'primary' : 'default'}
        />
        <QuickModeActionButton
          disabled={disabled}
          label={`${ui.team2}: ${teamTwo?.country ?? ui.tbd}`}
          onClick={() => selectTeam('away')}
          tone={teamSide === 'away' ? 'primary' : 'default'}
        />
      </div>
      {action === liveEventTypes.ownGoal && (
        <p className="rounded-lg bg-[#eef3e9] px-3 py-2 text-sm font-semibold text-[#34433a]">
          {ui.ownGoalTeamHelp}
        </p>
      )}

      <div className="grid gap-3">
        <AdminTextInput
          disabled={disabled}
          label={playerLabel}
          onChange={setPlayerSearch}
          placeholder={ui.searchPlayer}
          value={playerSearch}
        />
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-[#e5e9e0] bg-[#fbfdf9] p-2">
          {searchedPlayers.length ? (
            searchedPlayers.map((player) => {
              const suspension = getPlayerSuspension(suspensions, player.id)
              const suspended = isSuspendedForMatch(suspension, match.id)

              return (
                <button
                  type="button"
                  className={`min-h-14 rounded-xl border px-3 text-left text-sm font-bold ${
                    playerId === player.id
                      ? 'border-[#163428] bg-[#163428] text-white'
                      : 'border-[#d4dace] bg-white text-[#14201b]'
                  }`}
                  disabled={disabled}
                  key={player.id}
                  onClick={() => setPlayerId(player.id)}
                >
                  <span className="block truncate">{player.name}</span>
                  {suspended && <span className="mt-1 block text-xs font-semibold opacity-80">{ui.suspended}</span>}
                </button>
              )
            })
          ) : (
            <EmptyState text={ui.noPlayersFound} />
          )}
        </div>
      </div>

      {selectedPlayerSuspension && isSuspendedForMatch(selectedPlayerSuspension, match.id) && (
        <div className="rounded-lg border border-[#f0d491] bg-[#fffaf0] px-3 py-3 text-sm text-[#7a5300]">
          <strong>{ui.suspended}:</strong> {formatSuspensionDetail(selectedPlayerSuspension)}
        </div>
      )}
      {warning && (
        <div className="rounded-lg border border-[#f0d491] bg-[#fffaf0] px-3 py-3 text-sm font-semibold text-[#7a5300]">
          {warning}
        </div>
      )}

      {action === liveEventTypes.penalty && (
        <div className="grid grid-cols-2 gap-3">
          <QuickModeActionButton
            disabled={disabled}
            label={ui.penaltyGoal}
            onClick={() => setPenaltyOutcome('goal')}
            tone={penaltyOutcome === 'goal' ? 'score' : 'default'}
          />
          <QuickModeActionButton
            disabled={disabled}
            label={ui.penaltyMissSaved}
            onClick={() => setPenaltyOutcome('miss')}
            tone={penaltyOutcome === 'miss' ? 'warning' : 'default'}
          />
        </div>
      )}

      <AdminTextInput
        disabled={disabled}
        label={`${ui.minute} (${ui.live})`}
        min="1"
        onChange={setMinuteDraft}
        type="number"
        value={minuteDraft}
      />

      <button
        type="submit"
        className="min-h-16 rounded-2xl bg-[#163428] px-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled || !selectedPlayer}
      >
        {ui.t('confirmEvent', { event: formatEventTypeLabel(action, ui) })}
      </button>
    </form>
  )
}

function filterQuickModePlayers(players, search) {
  const query = search.trim().toLowerCase()

  if (!query) {
    return players
  }

  return players.filter((player) =>
    [player.name, player.nameEn, player.nameHe, player.nameAr]
      .filter(Boolean)
      .some((name) => name.toLowerCase().includes(query)),
  )
}

function teamOptionsToTeams(teamOptions) {
  return teamOptions.map((teamOption) => ({
    ...(teamOption.team ?? {}),
    id: teamOption.value,
    country: teamOption.team?.country ?? teamOption.label.replace(/\s+\([^)]+\)$/, ''),
    code: teamOption.team?.code ?? teamOption.label.match(/\(([^)]+)\)$/)?.[1] ?? 'TBD',
    color: teamOption.team?.color ?? '#1f6d4d',
    secondary: teamOption.team?.secondary ?? '#eef3e9',
  }))
}

function LiveMatchAdminPanel({
  disabled,
  draft,
  liveClock,
  onAddEvent,
  onCorrectMinute,
  onEndFirstHalf,
  onEndMatch,
  onPauseMatch,
  onResumeMatch,
  onStartSecondHalf,
  onStartMatch,
  teamOne,
  teamTwo,
}) {
  const ui = useUiText()
  const isPlaying = [matchPhases.firstHalf, matchPhases.secondHalf].includes(draft.matchPhase)
  const isPaused = draft.matchPhase === matchPhases.paused
  const isHalftime = draft.matchPhase === matchPhases.halftime
  const canEditEvents = draft.status === 'final' || (draft.status === 'live' && isPlaying)

  return (
    <section className="grid min-w-0 gap-4 rounded-lg border border-[#dce1d7] bg-[#fbfdf9] p-4">
      <div className="rounded-lg bg-[#10261d] p-4 text-white">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase">
            {getMatchPhaseLabel(draft, ui)}
          </span>
          <span className="text-sm font-semibold">
            {draft.status === 'live' ? liveClock?.displayMinute : draft.status === 'final' ? ui.fullTime : ui.scheduled}
          </span>
        </div>
        <div dir="ltr" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <LiveAdminTeam team={teamOne} align="right" label={ui.team1} />
          <div className="rounded-lg bg-white px-4 py-3 text-center text-[#14201b]">
            <p className="text-3xl font-semibold leading-none">
              <MatchScoreText match={draft} fallbackScore={`${normalizeScore(draft.homeScore) ?? 0}-${normalizeScore(draft.awayScore) ?? 0}`} />
            </p>
            <p className="mt-1 text-xs font-semibold uppercase text-[#65756b]">{ui.score}</p>
          </div>
          <LiveAdminTeam team={teamTwo} label={ui.team2} />
        </div>
      </div>

      {draft.status === 'live' && (
        <LiveMinuteEditor
          currentMinute={liveClock?.minute}
          disabled={disabled}
          onApply={onCorrectMinute}
        />
      )}

      {draft.status === 'scheduled' && (
        <button
          type="button"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#163428] px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || !draft.homeTeamId || !draft.awayTeamId}
          onClick={onStartMatch}
        >
          <Timer className="h-5 w-5" />
          {ui.startMatch}
        </button>
      )}

      {canEditEvents && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LiveActionButton disabled={disabled} label={ui.addGoal} onClick={() => onAddEvent(liveEventTypes.goal)} tone="primary" />
          <LiveActionButton disabled={disabled} label={ui.addOwnGoal} onClick={() => onAddEvent(liveEventTypes.ownGoal)} tone="primary" />
          <LiveActionButton disabled={disabled} label={ui.penalty} onClick={() => onAddEvent(liveEventTypes.penalty)} tone="primary" />
          <LiveActionButton disabled={disabled} label={ui.addYellowCard} onClick={() => onAddEvent(liveEventTypes.yellowCard)} />
          <LiveActionButton disabled={disabled} label={ui.addRedCard} onClick={() => onAddEvent(liveEventTypes.redCard)} />
        </div>
      )}

      {draft.status === 'live' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {draft.matchPhase === matchPhases.firstHalf && (
              <LiveActionButton disabled={disabled} label={ui.endFirstHalfHalftime} onClick={onEndFirstHalf} tone="primary" />
            )}
            {isHalftime && (
              <LiveActionButton disabled={disabled} label={ui.startSecondHalf} onClick={onStartSecondHalf} tone="primary" />
            )}
            {isPlaying && (
              <LiveActionButton disabled={disabled} label={ui.pause} onClick={onPauseMatch} />
            )}
            {isPaused && (
              <LiveActionButton disabled={disabled} label={ui.resume} onClick={onResumeMatch} tone="primary" />
            )}
            {(draft.matchPhase === matchPhases.secondHalf || isPaused) && (
              <LiveActionButton disabled={disabled} label={ui.endMatch} onClick={onEndMatch} tone="danger" />
            )}
          </div>
        </>
      )}

      {draft.status === 'final' && (
        <div className="rounded-md border border-[#dce1d7] bg-white px-3 py-3 text-sm text-[#34433a]">
          <strong className="block">{ui.finalScoreSaved}</strong>
          <span className="mt-1 block text-xs text-[#65756b]">{ui.finishedMatchEditing}</span>
        </div>
      )}
    </section>
  )
}

function LiveMinuteEditor({ currentMinute, disabled, onApply }) {
  const ui = useUiText()
  const [minuteDraft, setMinuteDraft] = useState('')

  async function submitMinute(event) {
    event.preventDefault()

    if (!minuteDraft) {
      return
    }

    const saved = await onApply(minuteDraft)

    if (saved !== false) {
      setMinuteDraft('')
    }
  }

  return (
    <form className="grid gap-3 rounded-lg border border-[#dce1d7] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={submitMinute}>
      <AdminTextInput
        disabled={disabled}
        label={ui.correctLiveMinute}
        min="1"
        onChange={setMinuteDraft}
        placeholder={currentMinute ? String(currentMinute) : ''}
        type="number"
        value={minuteDraft}
      />
      <button
        type="submit"
        className="min-h-11 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled || !minuteDraft}
      >
        {ui.applyMinuteCorrection}
      </button>
      <p className="text-xs text-[#65756b] sm:col-span-2">{ui.minuteCorrectionHelp}</p>
    </form>
  )
}

function LiveAdminTeam({ align = 'left', label, team }) {
  const ui = useUiText()

  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`} dir="ltr">
      <p className="text-xs font-semibold uppercase text-[#cfe7d8]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" dir="auto">{team?.country ?? ui.tbd}</p>
    </div>
  )
}

function getMatchPhaseLabel(match, ui = getUiDictionary('en')) {
  if (match.status === 'final' || match.matchPhase === matchPhases.final) return ui.finished
  if (match.matchPhase === matchPhases.firstHalf) return ui.firstHalf
  if (match.matchPhase === matchPhases.halftime) return ui.halftime
  if (match.matchPhase === matchPhases.secondHalf) return ui.secondHalf
  if (match.matchPhase === matchPhases.paused) return ui.paused
  return ui.scheduled
}

function LiveActionButton({ disabled, label, onClick, tone = 'default' }) {
  const styles = tone === 'primary'
    ? 'border-[#163428] bg-[#163428] text-white'
    : tone === 'danger'
      ? 'border-[#9b2f2f] bg-[#fff1f1] text-[#9b2f2f]'
      : 'border-[#d4dace] bg-white text-[#34433a]'

  return (
    <button
      type="button"
      className={`min-h-14 rounded-lg border px-3 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-45 ${styles}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function LiveEventModal({ action, disabled, editEvent, match, now, onClose, onSubmit, players, suspensions, teamOne, teamTwo }) {
  const ui = useUiText()
  const [eventType, setEventType] = useState(action)
  const [minuteDraft, setMinuteDraft] = useState(String(editEvent?.minute ?? calculateLiveMinute(match, now)))
  const [teamSide, setTeamSide] = useState(editEvent ? getEditEventTeamSide(match, editEvent, players) : 'home')
  const [playerId, setPlayerId] = useState(editEvent?.playerId ?? '')
  const [penaltyOutcome, setPenaltyOutcome] = useState(editEvent?.type === liveEventTypes.penaltyMiss ? 'miss' : 'goal')
  const [warning, setWarning] = useState('')
  const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId
  const teamPlayers = players.filter((player) => player.teamId === teamId)
  const firstPlayerId = teamPlayers[0]?.id ?? ''
  const effectivePlayerId = teamPlayers.some((player) => player.id === playerId)
    ? playerId
    : firstPlayerId
  const playerOptions = teamPlayers.map((player) => {
    const suspension = getPlayerSuspension(suspensions, player.id)
    const suspended = isSuspendedForMatch(suspension, match.id)

    return {
      label: suspended ? `${player.name} - ${ui.suspended}` : player.name,
      value: player.id,
    }
  })
  const title = editEvent
    ? `${ui.edit} ${formatEventTypeLabel(eventType, ui)}`
    : getLiveEventActionTitle(eventType, ui)
  const selectedPlayer = teamPlayers.find((player) => player.id === effectivePlayerId)
  const selectedPlayerSuspension = selectedPlayer
    ? getPlayerSuspension(suspensions, selectedPlayer.id)
    : null
  const playerLabel = eventType === liveEventTypes.goal
    ? ui.scorer
    : eventType === liveEventTypes.ownGoal
      ? ui.ownGoalScorer
      : eventType === liveEventTypes.penalty
        ? ui.penaltyShooter
        : ui.player

  async function submitEvent(event) {
    event.preventDefault()
    setWarning('')

    if (!selectedPlayer) {
      return
    }

    try {
      await onSubmit(createLiveEvent({
        allowSentOff: Boolean(editEvent),
        match,
        minute: minuteDraft,
        now,
        penaltyOutcome,
        player: selectedPlayer,
        teamSide,
        type: eventType,
      }))
    } catch (error) {
      if (error.message === 'player_sent_off') {
        setWarning(ui.playerAlreadySentOff)
        return
      }

      throw error
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 sm:place-items-center">
      <form
        className="grid max-h-[92vh] w-full max-w-lg gap-4 overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
        onSubmit={submitEvent}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#65756b]">
              {match.status === 'live' ? `${calculateLiveMinute(match, now)}'` : ui.eventTimeline}
            </p>
            <h3 className="text-lg font-semibold text-[#14201b]">{title}</h3>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-[#d4dace]"
            onClick={onClose}
            aria-label={ui.closeEventForm}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <FieldGrid>
          <AdminSelect
            disabled={disabled}
            label={ui.team}
            onChange={(value) => {
              setTeamSide(value)
              setPlayerId('')
            }}
            options={[
              { label: `${ui.team1} - ${teamOne?.country ?? ui.tbd}`, value: 'home' },
              { label: `${ui.team2} - ${teamTwo?.country ?? ui.tbd}`, value: 'away' },
            ]}
            value={teamSide}
          />
          <AdminSelect
            disabled={disabled || !playerOptions.length}
            label={playerLabel}
            onChange={setPlayerId}
            options={playerOptions.length ? playerOptions : [{ label: ui.noPlayersAvailable, value: '' }]}
            value={effectivePlayerId}
          />
        </FieldGrid>
        {eventType === liveEventTypes.ownGoal && (
          <p className="rounded-lg bg-[#eef3e9] px-3 py-2 text-sm font-semibold text-[#34433a]">
            {ui.ownGoalTeamHelp}
          </p>
        )}

        {selectedPlayerSuspension && isSuspendedForMatch(selectedPlayerSuspension, match.id) && (
          <div className="rounded-lg border border-[#f0d491] bg-[#fffaf0] px-3 py-3 text-sm text-[#7a5300]">
            <strong>{ui.suspended}:</strong> {formatSuspensionDetail(selectedPlayerSuspension)}
          </div>
        )}
        {warning && (
          <div className="rounded-lg border border-[#f0d491] bg-[#fffaf0] px-3 py-3 text-sm font-semibold text-[#7a5300]">
            {warning}
          </div>
        )}

        <FieldGrid>
          <AdminSelect
            disabled={disabled}
            label={ui.eventType}
            onChange={(value) => {
              setEventType(value)
            }}
            options={[
              { label: ui.goal, value: liveEventTypes.goal },
              { label: ui.ownGoal, value: liveEventTypes.ownGoal },
              { label: ui.penalty, value: liveEventTypes.penalty },
              { label: ui.yellowCard, value: liveEventTypes.yellowCard },
              { label: ui.redCard, value: liveEventTypes.redCard },
            ]}
            value={eventType}
          />
          <AdminTextInput
            disabled={disabled}
            label={ui.minute}
            min="1"
            onChange={setMinuteDraft}
            type="number"
            value={minuteDraft}
          />
        </FieldGrid>

        {eventType === liveEventTypes.penalty && (
          <AdminSelect
            disabled={disabled}
            label={ui.penaltyResult}
            onChange={setPenaltyOutcome}
            options={[
              { label: ui.penaltyGoal, value: 'goal' },
              { label: ui.penaltyMissSaved, value: 'miss' },
            ]}
            value={penaltyOutcome}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={disabled || !selectedPlayer}
          >
            {ui.save} {title}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d4dace] bg-white px-4 text-sm font-semibold text-[#34433a]"
            onClick={onClose}
          >
            {ui.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}

function getLiveEventActionTitle(action, ui = getUiDictionary('en')) {
  if (action === liveEventTypes.goal) return ui.addGoal
  if (action === liveEventTypes.ownGoal) return ui.addOwnGoal
  if (action === liveEventTypes.penalty) return ui.penalty
  if (action === liveEventTypes.yellowCard) return ui.addYellowCard
  if (action === liveEventTypes.redCard) return ui.addRedCard
  return ui.addEvent
}

function AdminEventTimeline({ match, onDeleteEvent, onEditEvent, players, teams }) {
  const ui = useUiText()
  const events = (match.events ?? [])
    .map((event, originalIndex) => ({ event, originalIndex }))
    .sort((a, b) => a.event.minute - b.event.minute)

  return (
    <section className="min-w-0 rounded-lg border border-[#dce1d7] bg-[#fbfdf9] p-4">
      <div className="mb-3 min-w-0">
        <h3 className="text-sm font-semibold text-[#14201b]">{ui.eventTimeline}</h3>
        <p className="text-xs text-[#65756b]">{ui.minutesAutoCalculated}</p>
      </div>
      <div className="grid min-w-0 gap-2">
        {events.length ? (
          events.map(({ event, originalIndex }, index) => (
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" key={`${match.id}-${event.minute}-${event.type}-${index}`}>
              <GoalEventRow
                event={event}
                players={players}
                teams={teams}
              />
              {!event.automatic && (onEditEvent || onDeleteEvent) && (
                <div className="flex gap-2">
                  {onEditEvent && (
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-md border border-[#d4dace] bg-white text-[#34433a]"
                      onClick={() => onEditEvent(originalIndex)}
                      aria-label={ui.editEvent}
                      title={ui.editEvent}
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                  )}
                  {onDeleteEvent && (
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-md border border-[#e2b7b7] bg-[#fff7f7] text-[#8b2e2e]"
                      onClick={() => onDeleteEvent(originalIndex)}
                      aria-label={ui.deleteEvent}
                      title={ui.deleteEvent}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState text={ui.noMatchEventsYet} />
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

function AdminActionNotice({ notice, onClose }) {
  if (!notice) {
    return null
  }

  const isError = notice.type === 'error'

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
        isError
          ? 'border-[#e2b7b7] bg-[#fff1f1] text-[#8b2e2e]'
          : 'border-[#b8dcc7] bg-[#eef3e9] text-[#163428]'
      }`}
      role={isError ? 'alert' : 'status'}
    >
      <span className="min-w-0 break-words">{notice.message}</span>
      <button
        type="button"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-current/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
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
  const selectedOption = options.find((option) => option.value === value)

  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-[#34433a]">
      {label}
      {selectedOption?.team && (
        <span className="flex min-w-0 items-center gap-2 rounded-md border border-[#dce1d7] bg-white px-3 py-2 text-sm font-semibold text-[#14201b]">
          <FlagMark team={selectedOption.team} small />
          <span className="truncate" dir="auto">{selectedOption.team.country}</span>
          <span className="text-xs text-[#65756b]">{selectedOption.team.code}</span>
        </span>
      )}
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

function AdminSubmit({ disabled, icon: Icon, label, pendingLabel = '' }) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#163428] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
      {pendingLabel || label}
    </button>
  )
}

function AdminDangerButton({ disabled, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#e2b7b7] bg-[#fff7f7] px-4 text-sm font-semibold text-[#8b2e2e] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
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
