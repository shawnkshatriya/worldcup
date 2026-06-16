// Match venues - FIFA World Cup 2026
var VENUES = {
  1: 'Estadio Azteca, Mexico City',
  2: 'Estadio Akron, Guadalajara',
  3: 'BMO Field, Toronto',
  4: 'SoFi Stadium, Los Angeles',
  5: 'Gillette Stadium, Foxborough',
  6: 'BC Place, Vancouver',
  7: 'MetLife Stadium, East Rutherford',
  8: 'Lumen Field, Seattle',
  9: 'Lincoln Financial Field, Philadelphia',
  10: 'NRG Stadium, Houston',
  11: 'AT&T Stadium, Dallas',
  12: 'Estadio BBVA, Monterrey',
  13: 'Hard Rock Stadium, Miami',
  14: 'Mercedes-Benz Stadium, Atlanta',
  15: 'Lumen Field, Seattle',
  16: 'SoFi Stadium, Los Angeles',
  17: 'Lincoln Financial Field, Philadelphia',
  18: 'BMO Field, Toronto',
  19: 'Hard Rock Stadium, Miami',
  20: 'Levi\'s Stadium, Santa Clara',
  21: 'Gillette Stadium, Foxborough',
  22: 'MetLife Stadium, East Rutherford',
  23: 'NRG Stadium, Houston',
  24: 'Estadio Akron, Guadalajara',
  25: 'Estadio Azteca, Mexico City',
  26: 'BC Place, Vancouver',
  27: 'Lumen Field, Seattle',
  28: 'AT&T Stadium, Dallas',
  29: 'Estadio BBVA, Monterrey',
  30: 'MetLife Stadium, East Rutherford',
  31: 'Estadio Akron, Guadalajara',
  32: 'Lincoln Financial Field, Philadelphia',
  33: 'NRG Stadium, Houston',
  34: 'AT&T Stadium, Dallas',
  35: 'Gillette Stadium, Foxborough',
  36: 'Estadio BBVA, Monterrey',
  37: 'Hard Rock Stadium, Miami',
  38: 'Mercedes-Benz Stadium, Atlanta',
  39: 'SoFi Stadium, Los Angeles',
  40: 'BC Place, Vancouver',
  41: 'MetLife Stadium, East Rutherford',
  42: 'Lincoln Financial Field, Philadelphia',
  43: 'AT&T Stadium, Dallas',
  44: 'Levi\'s Stadium, Santa Clara',
  45: 'Gillette Stadium, Foxborough',
  46: 'NRG Stadium, Houston',
  47: 'NRG Stadium, Houston',
  48: 'Estadio Azteca, Mexico City',
  49: 'Estadio BBVA, Monterrey',
  50: 'Estadio Akron, Guadalajara',
  51: 'BC Place, Vancouver',
  52: 'Lumen Field, Seattle',
  53: 'Estadio Azteca, Mexico City',
  54: 'AT&T Stadium, Dallas',
  55: 'Hard Rock Stadium, Miami',
  56: 'MetLife Stadium, East Rutherford',
  57: 'Levi\'s Stadium, Santa Clara',
  58: 'Mercedes-Benz Stadium, Atlanta',
  59: 'SoFi Stadium, Los Angeles',
  60: 'Lincoln Financial Field, Philadelphia',
  61: 'Gillette Stadium, Foxborough',
  62: 'BMO Field, Toronto',
  63: 'NRG Stadium, Houston',
  64: 'Lumen Field, Seattle',
  65: 'AT&T Stadium, Dallas',
  66: 'Estadio BBVA, Monterrey',
  67: 'Hard Rock Stadium, Miami',
  68: 'Mercedes-Benz Stadium, Atlanta',
  69: 'Estadio Akron, Guadalajara',
  70: 'Estadio Azteca, Mexico City',
  71: 'MetLife Stadium, East Rutherford',
  72: 'BC Place, Vancouver',
}

export function getVenue(matchNumber) {
  return VENUES[matchNumber] || null
}

// Verified matchup-based venues (home|away -> venue). Complete group stage.
// Source: official FIFA 2026 schedule via MLSsoccer.com (verified).
var MATCHUP_VENUES = {
  // Atlanta - Mercedes-Benz Stadium
  'Spain|Cape Verde': 'Mercedes-Benz Stadium, Atlanta',
  'Czechia|South Africa': 'Mercedes-Benz Stadium, Atlanta',
  'Spain|Saudi Arabia': 'Mercedes-Benz Stadium, Atlanta',
  'Morocco|Haiti': 'Mercedes-Benz Stadium, Atlanta',
  'DR Congo|Uzbekistan': 'Mercedes-Benz Stadium, Atlanta',
  // Boston - Gillette Stadium
  'Haiti|Scotland': 'Gillette Stadium, Boston',
  'Iraq|Norway': 'Gillette Stadium, Boston',
  'Scotland|Morocco': 'Gillette Stadium, Boston',
  'England|Ghana': 'Gillette Stadium, Boston',
  'Norway|France': 'Gillette Stadium, Boston',
  // Dallas - AT&T Stadium
  'Netherlands|Japan': 'AT&T Stadium, Dallas',
  'England|Croatia': 'AT&T Stadium, Dallas',
  'Argentina|Austria': 'AT&T Stadium, Dallas',
  'Japan|Sweden': 'AT&T Stadium, Dallas',
  'Jordan|Argentina': 'AT&T Stadium, Dallas',
  // Guadalajara - Estadio Akron
  'South Korea|Czechia': 'Estadio Akron, Guadalajara',
  'Mexico|South Korea': 'Estadio Akron, Guadalajara',
  'Colombia|DR Congo': 'Estadio Akron, Guadalajara',
  'Uruguay|Spain': 'Estadio Akron, Guadalajara',
  // Houston - NRG Stadium
  'Germany|Curacao': 'NRG Stadium, Houston',
  'Portugal|DR Congo': 'NRG Stadium, Houston',
  'Netherlands|Sweden': 'NRG Stadium, Houston',
  'Portugal|Uzbekistan': 'NRG Stadium, Houston',
  'Cape Verde|Saudi Arabia': 'NRG Stadium, Houston',
  // Kansas City - Arrowhead Stadium
  'Argentina|Algeria': 'Arrowhead Stadium, Kansas City',
  'Ecuador|Curacao': 'Arrowhead Stadium, Kansas City',
  'Tunisia|Netherlands': 'Arrowhead Stadium, Kansas City',
  'Algeria|Austria': 'Arrowhead Stadium, Kansas City',
  // Los Angeles - SoFi Stadium
  'United States|Paraguay': 'SoFi Stadium, Los Angeles',
  'Iran|New Zealand': 'SoFi Stadium, Los Angeles',
  'Switzerland|Bosnia and Herzegovina': 'SoFi Stadium, Los Angeles',
  'Belgium|Iran': 'SoFi Stadium, Los Angeles',
  'Turkey|United States': 'SoFi Stadium, Los Angeles',
  // Mexico City - Estadio Azteca
  'Mexico|South Africa': 'Estadio Azteca, Mexico City',
  'Uzbekistan|Colombia': 'Estadio Azteca, Mexico City',
  'Czechia|Mexico': 'Estadio Azteca, Mexico City',
  // Miami - Hard Rock Stadium
  'Saudi Arabia|Uruguay': 'Hard Rock Stadium, Miami',
  'Uruguay|Cape Verde': 'Hard Rock Stadium, Miami',
  'Scotland|Brazil': 'Hard Rock Stadium, Miami',
  'Colombia|Portugal': 'Hard Rock Stadium, Miami',
  // Monterrey - Estadio BBVA
  'Sweden|Tunisia': 'Estadio BBVA, Monterrey',
  'Tunisia|Japan': 'Estadio BBVA, Monterrey',
  'South Africa|South Korea': 'Estadio BBVA, Monterrey',
  // New York/New Jersey - MetLife Stadium
  'Brazil|Morocco': 'MetLife Stadium, East Rutherford',
  'France|Senegal': 'MetLife Stadium, East Rutherford',
  'Norway|Senegal': 'MetLife Stadium, East Rutherford',
  'Ecuador|Germany': 'MetLife Stadium, East Rutherford',
  'Panama|England': 'MetLife Stadium, East Rutherford',
  // Philadelphia - Lincoln Financial Field
  'Ivory Coast|Ecuador': 'Lincoln Financial Field, Philadelphia',
  'Brazil|Haiti': 'Lincoln Financial Field, Philadelphia',
  'France|Iraq': 'Lincoln Financial Field, Philadelphia',
  'Curacao|Ivory Coast': 'Lincoln Financial Field, Philadelphia',
  'Croatia|Ghana': 'Lincoln Financial Field, Philadelphia',
  // San Francisco - Levi's Stadium
  'Qatar|Switzerland': "Levi's Stadium, San Francisco",
  'Austria|Jordan': "Levi's Stadium, San Francisco",
  'Turkey|Paraguay': "Levi's Stadium, San Francisco",
  'Jordan|Algeria': "Levi's Stadium, San Francisco",
  'Paraguay|Australia': "Levi's Stadium, San Francisco",
  // Seattle - Lumen Field
  'Belgium|Egypt': 'Lumen Field, Seattle',
  'United States|Australia': 'Lumen Field, Seattle',
  'Bosnia and Herzegovina|Qatar': 'Lumen Field, Seattle',
  'Egypt|Iran': 'Lumen Field, Seattle',
  // Toronto - BMO Field
  'Canada|Bosnia and Herzegovina': 'BMO Field, Toronto',
  'Ghana|Panama': 'BMO Field, Toronto',
  'Germany|Ivory Coast': 'BMO Field, Toronto',
  'Panama|Croatia': 'BMO Field, Toronto',
  'Senegal|Iraq': 'BMO Field, Toronto',
  // Vancouver - BC Place
  'Australia|Turkey': 'BC Place, Vancouver',
  'Canada|Qatar': 'BC Place, Vancouver',
  'New Zealand|Egypt': 'BC Place, Vancouver',
  'Switzerland|Canada': 'BC Place, Vancouver',
  'New Zealand|Belgium': 'BC Place, Vancouver',
}

export function getVenueByMatchup(homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) return null
  return MATCHUP_VENUES[homeTeam + '|' + awayTeam] || null
}

// Knockout stage venues by match number (verified official schedule)
var KO_VENUES = {
  // Round of 32 (M73-M88)
  73: 'SoFi Stadium, Los Angeles',
  74: 'Gillette Stadium, Boston',
  75: 'Estadio BBVA, Monterrey',
  76: 'NRG Stadium, Houston',
  77: 'MetLife Stadium, East Rutherford',
  78: 'AT&T Stadium, Dallas',
  79: 'Estadio Azteca, Mexico City',
  80: 'Mercedes-Benz Stadium, Atlanta',
  81: "Levi's Stadium, San Francisco",
  82: 'Lumen Field, Seattle',
  83: 'BMO Field, Toronto',
  84: 'SoFi Stadium, Los Angeles',
  85: 'BC Place, Vancouver',
  86: 'Hard Rock Stadium, Miami',
  87: 'Arrowhead Stadium, Kansas City',
  88: 'AT&T Stadium, Dallas',
  // Round of 16 (M89-M96)
  89: 'Lincoln Financial Field, Philadelphia',
  90: 'NRG Stadium, Houston',
  91: 'MetLife Stadium, East Rutherford',
  92: 'Estadio Azteca, Mexico City',
  93: 'AT&T Stadium, Dallas',
  94: 'Lumen Field, Seattle',
  95: 'Mercedes-Benz Stadium, Atlanta',
  96: 'BC Place, Vancouver',
  // Quarterfinals (M97-M100)
  97: 'Gillette Stadium, Boston',
  98: 'SoFi Stadium, Los Angeles',
  99: 'Hard Rock Stadium, Miami',
  100: 'Arrowhead Stadium, Kansas City',
  // Semifinals (M101-M102)
  101: 'AT&T Stadium, Dallas',
  102: 'Mercedes-Benz Stadium, Atlanta',
  // Third place (M103)
  103: 'Hard Rock Stadium, Miami',
  // Final (M104)
  104: 'MetLife Stadium, East Rutherford',
}

export function getKnockoutVenue(matchNumber) {
  return KO_VENUES[matchNumber] || null
}
