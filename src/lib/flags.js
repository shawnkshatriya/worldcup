// Maps WC26 team names to ISO 3166-1 alpha-2 codes for flag display.
// Flags served from flagcdn.com (free CDN, no key).
var TEAM_ISO = {
  'Argentina':'ar','Australia':'au','Austria':'at','Belgium':'be',
  'Bosnia and Herzegovina':'ba','Brazil':'br','Canada':'ca','Cape Verde':'cv',
  'Colombia':'co','Croatia':'hr','Curacao':'cw','Czechia':'cz','DR Congo':'cd',
  'Ecuador':'ec','Egypt':'eg','England':'gb-eng','France':'fr','Germany':'de',
  'Ghana':'gh','Haiti':'ht','Iran':'ir','Iraq':'iq','Ivory Coast':'ci',
  'Japan':'jp','Jordan':'jo','Mexico':'mx','Morocco':'ma','Netherlands':'nl',
  'New Zealand':'nz','Norway':'no','Panama':'pa','Paraguay':'py','Portugal':'pt',
  'Qatar':'qa','Saudi Arabia':'sa','Scotland':'gb-sct','Senegal':'sn',
  'South Africa':'za','South Korea':'kr','Spain':'es','Sweden':'se',
  'Switzerland':'ch','Tunisia':'tn','Turkey':'tr','United States':'us',
  'Uruguay':'uy','Uzbekistan':'uz','Algeria':'dz',
  // Possible additional qualifiers
  'Italy':'it','Nigeria':'ng','Cameroon':'cm','Serbia':'rs','Denmark':'dk',
  'Poland':'pl','Ukraine':'ua','Wales':'gb-wls','Peru':'pe','Chile':'cl',
  'Costa Rica':'cr','Jamaica':'jm','Honduras':'hn','Mali':'ml','Bolivia':'bo',
  'Venezuela':'ve','North Korea':'kp','China':'cn','Greece':'gr','Romania':'ro',
}

export function getFlagUrl(teamName, size) {
  var iso = TEAM_ISO[teamName]
  if (!iso) return null
  var w = size === 'lg' ? 'w80' : size === 'sm' ? 'w20' : 'w40'
  return 'https://flagcdn.com/' + w + '/' + iso + '.png'
}

export function hasFlag(teamName) {
  return !!TEAM_ISO[teamName]
}
