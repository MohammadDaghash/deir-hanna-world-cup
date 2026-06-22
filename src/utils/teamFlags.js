export const tournamentTeamCodes = ['ALB', 'ALG', 'EGY', 'FRA', 'MAR', 'POR', 'QAT', 'TUR']

export const teamFlagAssets = {
  ALB: { code: 'ALB', country: 'Albania', path: '/flags/alb.svg' },
  ALG: { code: 'ALG', country: 'Algeria', path: '/flags/alg.svg' },
  EGY: { code: 'EGY', country: 'Egypt', path: '/flags/egy.svg' },
  FRA: { code: 'FRA', country: 'France', path: '/flags/fra.svg' },
  MAR: { code: 'MAR', country: 'Morocco', path: '/flags/mar.svg' },
  POR: { code: 'POR', country: 'Portugal', path: '/flags/por.svg' },
  QAT: { code: 'QAT', country: 'Qatar', path: '/flags/qat.svg' },
  TUR: { code: 'TUR', country: 'Turkey', path: '/flags/tur.svg' },
}

export function normalizeTeamCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

export function getTeamFlag(teamOrCode) {
  const code = normalizeTeamCode(
    typeof teamOrCode === 'string' ? teamOrCode : teamOrCode?.code,
  )

  return teamFlagAssets[code] ?? null
}
