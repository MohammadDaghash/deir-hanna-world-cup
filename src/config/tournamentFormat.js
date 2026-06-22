const legacyLeagueStage = 'League'

export const tournamentFormat = {
  name: 'Deir Hanna World Cup',
  tableKey: 'A',
  tableLabel: 'Group Stage',
  groupKeys: ['A', 'B'],
  groupLabels: {
    A: 'Group A',
    B: 'Group B',
  },
  groupATeams: ['Albania', 'Qatar', 'Morocco', 'Portugal'],
  teamCount: 8,
  teamsPerGroup: 4,
  qualifyingTeamsPerGroup: 2,
  qualifyingTeams: 4,
  groupStageRounds: 3,
  leagueRounds: 3,
  fixedVenue: 'El Capitano Stadium - Deir Hanna',
  fixedVenueEn: 'El Capitano Stadium - Deir Hanna',
  fixedVenueAr: 'ملعب الكابيتانو ديرحنا (السهل)',
  fixedVenueHe: 'אצטדיון אל קפיטנו - דיר חנא',
  stages: {
    group: 'Group',
    league: legacyLeagueStage,
    semiFinal: 'Semi-final',
    final: 'Final',
    thirdPlace: 'Third place',
  },
}

const groupATeamNames = new Set(tournamentFormat.groupATeams.map((name) => name.toLowerCase()))

function normalizeTeamName(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function getTeamGroupCode(team) {
  const names = [
    team?.country,
    team?.countryEn,
    team?.name,
    team?.nameEn,
  ]

  return names.some((name) => groupATeamNames.has(normalizeTeamName(name))) ? 'A' : 'B'
}

export function getGroupLabel(groupCode) {
  return tournamentFormat.groupLabels[groupCode] ?? `Group ${groupCode}`
}

export const stageLabels = {
  [tournamentFormat.stages.group]: 'Group stage',
  [tournamentFormat.stages.league]: 'Group stage',
  [tournamentFormat.stages.semiFinal]: 'Semi-final',
  [tournamentFormat.stages.final]: 'Final',
  [tournamentFormat.stages.thirdPlace]: 'Third place',
}

export const knockoutPlaceholderDefinitions = {
  A1: '1st Group A',
  A2: '2nd Group A',
  B1: '1st Group B',
  B2: '2nd Group B',
  WS1: 'Winner Semi-final 1',
  WS2: 'Winner Semi-final 2',
  LS1: 'Loser Semi-final 1',
  LS2: 'Loser Semi-final 2',
}

export const knockoutPlaceholdersByStage = {
  [tournamentFormat.stages.semiFinal]: ['A1', 'B2', 'B1', 'A2'],
  [tournamentFormat.stages.final]: ['WS1', 'WS2'],
  [tournamentFormat.stages.thirdPlace]: ['LS1', 'LS2'],
}

export const stageOptions = [
  { label: 'Group stage', value: tournamentFormat.stages.group },
  { label: 'Semi-final', value: tournamentFormat.stages.semiFinal },
  { label: 'Third place', value: tournamentFormat.stages.thirdPlace },
  { label: 'Final', value: tournamentFormat.stages.final },
]

export const knockoutStageFilters = [
  { id: tournamentFormat.stages.semiFinal, label: 'Semi-finals' },
  { id: tournamentFormat.stages.thirdPlace, label: 'Third place' },
  { id: tournamentFormat.stages.final, label: 'Final' },
]

export const roundFilterOptions = [
  ...Array.from({ length: tournamentFormat.groupStageRounds }, (_, index) => ({
    id: `group-${index + 1}`,
    label: `Round ${index + 1}`,
  })),
  ...knockoutStageFilters,
]

export function getKnockoutPlaceholderOptions(stage) {
  return (knockoutPlaceholdersByStage[stage] ?? []).map((value) => ({
    label: `${value} - ${knockoutPlaceholderDefinitions[value]}`,
    value,
  }))
}

export function getShortMatchStageLabel(stage) {
  return stageLabels[stage] ?? stage
}

export function isLeagueStage(stage) {
  return stage === tournamentFormat.stages.group || stage === tournamentFormat.stages.league
}

export function isDrawAllowedStage(stage) {
  return isLeagueStage(stage)
}
