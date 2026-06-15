export const languageOptions = [
  { id: 'en', label: 'English', shortLabel: 'EN', direction: 'ltr' },
  { id: 'he', label: 'עברית', shortLabel: 'HE', direction: 'rtl' },
  { id: 'ar', label: 'العربية', shortLabel: 'AR', direction: 'rtl' },
]

const languageStorageKey = 'deir-hanna-world-cup-language'
const fallbackLanguage = 'en'

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function firstValue(...values) {
  return values.map(clean).find(Boolean) ?? ''
}

export function normalizeLanguage(language) {
  return languageOptions.some((option) => option.id === language) ? language : fallbackLanguage
}

export function getStoredLanguage() {
  if (typeof window === 'undefined') {
    return fallbackLanguage
  }

  return normalizeLanguage(window.localStorage.getItem(languageStorageKey))
}

export function storeLanguage(language) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(languageStorageKey, normalizeLanguage(language))
  }
}

export function getLanguageDirection(language) {
  return languageOptions.find((option) => option.id === normalizeLanguage(language))?.direction ?? 'ltr'
}

export function getTeamName(team, language = fallbackLanguage) {
  if (!team) return 'TBD'

  if (language === 'he') return firstValue(team.countryHe, team.countryEn, team.country)
  if (language === 'ar') return firstValue(team.countryAr, team.countryEn, team.country)
  return firstValue(team.countryEn, team.country)
}

export function getPlayerName(player, language = fallbackLanguage) {
  if (!player) return ''

  if (language === 'he') return firstValue(player.nameHe, player.nameEn, player.name)
  if (language === 'ar') return firstValue(player.nameAr, player.nameEn, player.name)
  return firstValue(player.nameEn, player.name)
}

export function getVenueName(match, language = fallbackLanguage) {
  if (!match) return ''

  if (language === 'he') return firstValue(match.venueHe, match.venueEn, match.venue)
  if (language === 'ar') return firstValue(match.venueAr, match.venueEn, match.venue)
  return firstValue(match.venueEn, match.venue)
}

export function getPlayerNameCandidates(player) {
  return Array.from(new Set([
    clean(player?.name),
    clean(player?.nameEn),
    clean(player?.nameHe),
    clean(player?.nameAr),
  ].filter(Boolean)))
}

export function localizeTournamentData(data, language) {
  const normalizedLanguage = normalizeLanguage(language)

  return {
    ...data,
    teams: data.teams.map((team) => ({
      ...team,
      country: getTeamName(team, normalizedLanguage),
    })),
    players: data.players.map((player) => ({
      ...player,
      name: getPlayerName(player, normalizedLanguage),
    })),
    matches: data.matches.map((match) => ({
      ...match,
      venue: getVenueName(match, normalizedLanguage),
    })),
    knockoutMatches: data.knockoutMatches.map((match) => ({
      ...match,
      venue: getVenueName(match, normalizedLanguage),
    })),
  }
}
