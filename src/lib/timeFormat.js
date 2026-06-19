// Time formatting in the viewer's LOCAL timezone (not hardcoded Eastern).

// Short local timezone abbreviation, e.g. "EST", "PST", "GMT", "IST"
export function localTzAbbr(date) {
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date || new Date())
    var tz = parts.find(function(p){ return p.type === 'timeZoneName' })
    return tz ? tz.value : ''
  } catch (e) { return '' }
}

// "3:00 PM EST" in the viewer's local zone
export function localTime(kickoff) {
  if (!kickoff) return ''
  var d = new Date(kickoff)
  var t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  var tz = localTzAbbr(d)
  return tz ? (t + ' ' + tz) : t
}

// "Jun 20" in local zone
export function localDateShort(kickoff) {
  if (!kickoff) return ''
  return new Date(kickoff).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// "Fri, Jun 20" in local zone
export function localDateLong(kickoff) {
  if (!kickoff) return ''
  return new Date(kickoff).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
