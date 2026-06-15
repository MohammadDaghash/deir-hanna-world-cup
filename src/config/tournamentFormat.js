export const tournamentFormat = {
  name: 'Deir Hanna World Cup',
  tableKey: 'LEAGUE',
  tableLabel: 'League',
  teamCount: 8,
  qualifyingTeams: 4,
  leagueRounds: 7,
  fixedVenue: 'El Maracana Stadium - Deir Hanna',
  stages: {
    league: 'League',
    semiFinal: 'Semi-final',
    final: 'Final',
  },
}

export const stageLabels = {
[tournamentFormat.stages.league]: 'League',
[tournamentFormat.stages.semiFinal]: 'Semi-finals',
[tournamentFormat.stages.final]: 'Final',
}

export const stageOptions = [
{ label: 'League', value: tournamentFormat.stages.league },
{ label: 'Semi-final', value: tournamentFormat.stages.semiFinal },
{ label: 'Final', value: tournamentFormat.stages.final },
]

export const knockoutStageFilters = [
{ id: tournamentFormat.stages.semiFinal, label: 'Semi-finals' },
{ id: tournamentFormat.stages.final, label: 'Final' },
]

export const roundFilterOptions = [
  ...Array.from({ length: tournamentFormat.leagueRounds }, (_, index) => ({
    id: `league-${index + 1}`,
    label: `League Round ${index + 1}`,
  })),
  ...knockoutStageFilters,
]

export function isLeagueStage(stage) {
  return stage === tournamentFormat.stages.league
}

export function isDrawAllowedStage(stage) {
  return isLeagueStage(stage)
}
