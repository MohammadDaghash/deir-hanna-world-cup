import { tournamentFormat } from '../config/tournamentFormat.js'

export const groups = [tournamentFormat.tableKey]

const leagueGroup = tournamentFormat.tableKey

export const teams = [
  { id: 'arg', country: 'Argentina', code: 'ARG', group: leagueGroup, color: '#5dade2', secondary: '#ffffff' },
  { id: 'jpn', country: 'Japan', code: 'JPN', group: leagueGroup, color: '#bc002d', secondary: '#ffffff' },
  { id: 'mar', country: 'Morocco', code: 'MAR', group: leagueGroup, color: '#c1272d', secondary: '#006233' },
  { id: 'bra', country: 'Brazil', code: 'BRA', group: leagueGroup, color: '#f7d117', secondary: '#009b3a' },
  { id: 'ger', country: 'Germany', code: 'GER', group: leagueGroup, color: '#111111', secondary: '#ffce00' },
  { id: 'gha', country: 'Ghana', code: 'GHA', group: leagueGroup, color: '#fcd116', secondary: '#ce1126' },
  { id: 'fra', country: 'France', code: 'FRA', group: leagueGroup, color: '#0055a4', secondary: '#ef4135' },
  { id: 'por', country: 'Portugal', code: 'POR', group: leagueGroup, color: '#006600', secondary: '#ff0000' },
]

const leagueFixtureRows = [
  ['arg', 'por'], ['jpn', 'fra'], ['mar', 'gha'], ['bra', 'ger'],
  ['arg', 'fra'], ['por', 'gha'], ['jpn', 'ger'], ['mar', 'bra'],
  ['arg', 'gha'], ['fra', 'ger'], ['por', 'bra'], ['jpn', 'mar'],
  ['arg', 'ger'], ['gha', 'bra'], ['fra', 'mar'], ['por', 'jpn'],
  ['arg', 'bra'], ['ger', 'mar'], ['gha', 'jpn'], ['fra', 'por'],
  ['arg', 'mar'], ['bra', 'jpn'], ['ger', 'por'], ['gha', 'fra'],
  ['arg', 'jpn'], ['mar', 'por'], ['bra', 'fra'], ['ger', 'gha'],
]

const leagueMatchDetails = {
  1: {
    homeScore: 2,
    awayScore: 1,
    status: 'final',
    events: [
      { minute: 14, type: 'goal', teamId: 'arg', player: 'Rami Saad', assist: 'Karim Haddad' },
      { minute: 38, type: 'goal', teamId: 'por', player: 'Omar Kassis', assist: 'Jad Sabbagh' },
      { minute: 72, type: 'goal', teamId: 'arg', player: 'Karim Haddad', assist: 'Rami Saad' },
    ],
  },
  2: {
    homeScore: 1,
    awayScore: 2,
    status: 'final',
    events: [
      { minute: 33, type: 'goal', teamId: 'jpn', player: 'Nader Saleh', assist: 'Yazan Abbas' },
      { minute: 57, type: 'goal', teamId: 'fra', player: 'Anton Bishara', assist: 'George Tannous' },
      { minute: 81, type: 'goal', teamId: 'fra', player: 'Anton Bishara', assist: 'George Tannous' },
    ],
  },
  4: {
    homeScore: 3,
    awayScore: 1,
    status: 'final',
    events: [
      { minute: 8, type: 'goal', teamId: 'bra', player: 'Sami Nassar', assist: 'Majd Awad' },
      { minute: 44, type: 'goal', teamId: 'bra', player: 'Sami Nassar', assist: 'Majd Awad' },
      { minute: 66, type: 'goal', teamId: 'bra', player: 'Majd Awad', assist: 'Sami Nassar' },
      { minute: 74, type: 'goal', teamId: 'ger', player: 'Ameer Farah', assist: 'Mazen Salame' },
    ],
  },
  5: {
    homeScore: 1,
    awayScore: 1,
    status: 'live',
    minute: 62,
    events: [
      { minute: 21, type: 'goal', teamId: 'fra', player: 'Anton Bishara', assist: 'George Tannous' },
      { minute: 55, type: 'goal', teamId: 'arg', player: 'Rami Saad', assist: 'Karim Haddad' },
    ],
  },
}

export const matches = leagueFixtureRows.map(([homeTeamId, awayTeamId], index) => {
  const fixtureNumber = index + 1
  const round = Math.floor(index / 4) + 1
  const detail = leagueMatchDetails[fixtureNumber] ?? { status: 'scheduled' }
  const day = 10 + Math.floor(index / 2)

  return {
    id: `league-${fixtureNumber}`,
    stage: tournamentFormat.stages.league,
    group: leagueGroup,
    matchday: round,
    date: `2026-06-${String(day).padStart(2, '0')}`,
    time: index % 2 === 0 ? '19:30' : '21:00',
    venue: index % 2 === 0 ? 'Deir Hanna Stadium' : 'Municipal Field',
    homeTeamId,
    awayTeamId,
    ...detail,
  }
})

export const knockoutMatches = [
  { id: 'sf-1', stage: tournamentFormat.stages.semiFinal, date: '2026-06-25', time: '20:15', venue: 'Deir Hanna Stadium', homeLabel: '1st place', awayLabel: '4th place', status: 'scheduled' },
  { id: 'sf-2', stage: tournamentFormat.stages.semiFinal, date: '2026-06-26', time: '20:15', venue: 'Deir Hanna Stadium', homeLabel: '2nd place', awayLabel: '3rd place', status: 'scheduled' },
  { id: 'third', stage: tournamentFormat.stages.thirdPlace, date: '2026-06-29', time: '19:30', venue: 'Municipal Field', homeLabel: 'Loser SF1', awayLabel: 'Loser SF2', status: 'scheduled' },
  { id: 'final', stage: tournamentFormat.stages.final, date: '2026-06-29', time: '21:00', venue: 'Deir Hanna Stadium', homeLabel: 'Winner SF1', awayLabel: 'Winner SF2', status: 'scheduled' },
]

const squadNumbers = [1, 2, 3, 4, 5, 6, 8, 10, 7, 9]
const squadPositions = ['GK', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW']

const squadNames = {
  arg: [
    'Nadim Jaber',
    'Tarek Nassar',
    'Bassem Farah',
    'Omar Srouji',
    'Saleem Awwad',
    'George Khoury',
    'Karim Haddad',
    'Rami Saad',
    'Adam Daher',
    'Firas Hanna',
    'Jalal Mansour',
    'Tony Kassis',
  ],
  jpn: [
    'Sami Elias',
    'Bilal Matar',
    'Laith Daoud',
    'Wadee Salman',
    'Michael Khoury',
    'Yazan Abbas',
    'Fadi Saade',
    'Amir Nicola',
    'Rayan Morcos',
    'Nader Saleh',
    'Ziad Bishara',
    'Samer Asmar',
  ],
  mar: [
    'Majd Saad',
    'Wassim Awwad',
    'Tamer Karam',
    'Jad Haddad',
    'Samir Nassar',
    'Fadi Daher',
    'Loai Farah',
    'Elias Khoury',
    'Rami Matar',
    'Kareem Abbas',
    'Daniel Tannous',
  ],
  bra: [
    'Joud Khoury',
    'Amir Hanna',
    'Ramez Daher',
    'Tony Saad',
    'Nader Farah',
    'Michel Jaber',
    'Majd Awad',
    'Sami Nassar',
    'Peter Kassis',
    'Elias Matar',
    'Karim Srouji',
    'Omar Daoud',
  ],
  ger: [
    'Fadi Hanna',
    'Rayan Saad',
    'Bassem Nicola',
    'Anton Karam',
    'Tarek Awwad',
    'Mazen Salame',
    'George Elias',
    'Ameer Farah',
    'Omar Haddad',
    'Samer Bishara',
    'Jalal Daoud',
    'Wadee Khoury',
  ],
  gha: [
    'Daniel Khoury',
    'Naim Daher',
    'Yazan Jaber',
    'Michael Kassis',
    'Jad Nassar',
    'Wassim Hana',
    'Amir Awwad',
    'Rami Nicola',
    'Firas Saleh',
    'Loai Matar',
    'Tony Srouji',
    'Bilal Morcos',
  ],
  fra: [
    'Peter Saad',
    'Samir Khoury',
    'Wadee Karam',
    'Karim Farah',
    'George Tannous',
    'Laith Haddad',
    'Rayan Daher',
    'Anton Bishara',
    'Jalal Matar',
    'Majd Elias',
    'Nader Awwad',
    'Sami Salman',
  ],
  por: [
    'Firas Khoury',
    'Michael Nassar',
    'Tamer Farah',
    'Rami Elias',
    'Bassem Jaber',
    'Jad Sabbagh',
    'Naim Awwad',
    'Omar Kassis',
    'Saleem Daher',
    'Anton Saad',
    'Mazen Matar',
    'Daniel Karam',
  ],
}

const playerStats = {
  'arg:Rami Saad': { goals: 2, assists: 1 },
  'arg:Karim Haddad': { goals: 1, assists: 2, yellowCards: 1 },
  'jpn:Nader Saleh': { goals: 1 },
  'jpn:Yazan Abbas': { assists: 1, yellowCards: 1 },
  'mar:Elias Khoury': { goals: 1 },
  'mar:Fadi Daher': { assists: 1 },
  'bra:Sami Nassar': { goals: 3 },
  'bra:Majd Awad': { goals: 1, assists: 3 },
  'ger:Ameer Farah': { goals: 1, yellowCards: 1 },
  'ger:Mazen Salame': { assists: 1 },
  'gha:Wassim Hana': { yellowCards: 1 },
  'fra:Anton Bishara': { goals: 2 },
  'fra:George Tannous': { assists: 2, yellowCards: 1 },
  'por:Omar Kassis': { goals: 1, assists: 1 },
  'por:Jad Sabbagh': { goals: 1 },
}

export const players = teams.flatMap((team) =>
  (squadNames[team.id] ?? []).slice(0, 10).map((name, index) => {
    const stats = playerStats[`${team.id}:${name}`] ?? {}

    return {
      id: `p-${team.id}-${index + 1}`,
      name,
      teamId: team.id,
      number: squadNumbers[index],
      position: squadPositions[index],
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      ...stats,
    }
  }),
)

function getTeamPlayerIds(teamId) {
  return players
    .filter((player) => player.teamId === teamId)
    .map((player) => player.id)
}

function makeLineup(teamId) {
  const playerIds = getTeamPlayerIds(teamId)

  return {
    formation: '3-3-1',
    starters: playerIds.slice(0, 7),
    bench: playerIds.slice(7, 10),
  }
}

export const lineups = matches.reduce((matchLineups, match) => {
  if (match.homeTeamId && match.awayTeamId) {
    matchLineups[match.id] = {
      home: makeLineup(match.homeTeamId),
      away: makeLineup(match.awayTeamId),
    }
  }

  return matchLineups
}, {})
