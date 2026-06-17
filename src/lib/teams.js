// Comprehensive team-name resolver.
// Every World Cup 2026 team mapped to its canonical DB name, with ALL known
// aliases from FIFA, ESPN, football-data.org, Wikipedia, and common usage.
// This is defensive: it catches variants we haven't explicitly seen by
// normalizing (lowercase, strip accents/punctuation) before lookup.

// Canonical DB name -> array of every known alias (including itself implicitly)
var TEAM_ALIASES = {
  'Algeria': ['Algerie', 'Algérie'],
  'Argentina': [],
  'Australia': ['Socceroos'],
  'Austria': ['Osterreich', 'Österreich'],
  'Belgium': ['Belgique', 'Belgie', 'België'],
  'Bosnia and Herzegovina': ['Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia', 'Bosna i Hercegovina', 'BIH'],
  'Brazil': ['Brasil'],
  'Canada': [],
  'Cape Verde': ['Cabo Verde', 'Cape Verde Islands'],
  'Colombia': [],
  'Croatia': ['Hrvatska'],
  'Curacao': ['Curaçao'],
  'Czechia': ['Czech Republic', 'Czech Rep', 'Czech Rep.', 'Ceska republika'],
  'DR Congo': ['Congo DR', 'Democratic Republic of Congo', 'Democratic Republic of the Congo',
               'DR Congo (Kinshasa)', 'Congo DR (Kinshasa)', 'DRC', 'Congo-Kinshasa', 'Zaire'],
  'Ecuador': [],
  'Egypt': ['Misr'],
  'England': [],
  'France': [],
  'Germany': ['Deutschland'],
  'Ghana': [],
  'Haiti': ['Haïti'],
  'Iran': ['IR Iran', 'Iran (Islamic Republic of)', 'Islamic Republic of Iran'],
  'Iraq': [],
  'Ivory Coast': ["Côte d'Ivoire", "Cote d'Ivoire", "Cote dIvoire", 'Cote d Ivoire'],
  'Japan': ['Nippon', 'Nihon'],
  'Jordan': [],
  'Mexico': ['México'],
  'Morocco': ['Maroc', 'Al Maghrib'],
  'Netherlands': ['Holland', 'Nederland'],
  'New Zealand': ['All Whites'],
  'Norway': ['Norge'],
  'Panama': ['Panamá'],
  'Paraguay': [],
  'Portugal': [],
  'Qatar': [],
  'Saudi Arabia': ['Saudi Arabia (KSA)', 'KSA', 'Kingdom of Saudi Arabia', 'Al Akhdar'],
  'Scotland': [],
  'Senegal': ['Sénégal'],
  'South Africa': ['RSA', 'Bafana Bafana'],
  'South Korea': ['Korea Republic', 'Republic of Korea', 'Korea, Republic of', 'Korea (Republic)',
                  'Korea Rep', 'Korea Rep.', 'KOR', 'Daehan Minguk'],
  'Spain': ['España', 'Espana'],
  'Sweden': ['Sverige'],
  'Switzerland': ['Suisse', 'Schweiz', 'Svizzera', 'Helvetia'],
  'Tunisia': ['Tunisie', 'Tunis'],
  'Turkey': ['Türkiye', 'Turkiye', 'Turkiÿe'],
  'United States': ['USA', 'United States of America', 'US', 'USMNT', 'U.S.A.', 'United States of America (USA)'],
  'Uruguay': [],
  'Uzbekistan': ['Uzbek', "O'zbekiston"],
}

function normTeam(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // strip everything non-alphanumeric
}

// Build a reverse lookup: normalized alias -> canonical DB name
var ALIAS_LOOKUP = {}
for (var canonical in TEAM_ALIASES) {
  ALIAS_LOOKUP[normTeam(canonical)] = canonical // the name maps to itself
  TEAM_ALIASES[canonical].forEach(function(alias) {
    ALIAS_LOOKUP[normTeam(alias)] = canonical
  })
}

// Resolve any source team name to the canonical DB name.
// Returns { name, matched } - matched=false means we couldn't resolve it
// (caller should skip and log, never write a guessed result).
export function resolveTeam(name) {
  if (!name) return { name: name, matched: false }
  var key = normTeam(name)
  if (ALIAS_LOOKUP[key]) return { name: ALIAS_LOOKUP[key], matched: true }
  return { name: name, matched: false }
}

export function allCanonicalTeams() {
  return Object.keys(TEAM_ALIASES)
}
