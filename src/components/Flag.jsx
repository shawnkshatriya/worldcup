import { getFlagUrl } from '../lib/flags'

export default function Flag({ team, size, style }) {
  var url = getFlagUrl(team, size)
  var dim = size === 'lg' ? 28 : size === 'sm' ? 14 : 20
  if (!url) {
    // Fallback: empty placeholder keeps alignment
    return <span style={{ display:'inline-block', width:dim, height:Math.round(dim*0.7), ...style }} />
  }
  return (
    <img
      src={url}
      alt={team}
      width={dim}
      height={Math.round(dim*0.7)}
      style={{ borderRadius:2, objectFit:'cover', verticalAlign:'middle', ...style }}
      loading="lazy"
    />
  )
}
