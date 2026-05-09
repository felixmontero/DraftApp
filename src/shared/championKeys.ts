const KEY_ALIASES: Record<string, string> = {
  aurelionsol: 'AurelionSol',
  belveth: 'Belveth',
  chogath: 'Cho',
  cho: 'Cho',
  drmundo: 'DrMundo',
  mundo: 'DrMundo',
  fiddlesticks: 'Fiddlesticks',
  jarvaniv: 'JarvanIV',
  jarvan: 'JarvanIV',
  kaisa: 'Kaisa',
  kha: 'Khazix',
  khazix: 'Khazix',
  kogmaw: 'Kogmaw',
  leblanc: 'Leblanc',
  leesin: 'LeeSin',
  masteryi: 'MasterYi',
  missfortune: 'MissFortune',
  monkeyking: 'MonkeyKing',
  nunuwillump: 'Nunu',
  nunu: 'Nunu',
  reksai: 'RekSai',
  tahmkench: 'TahmKench',
  twistedfate: 'TwistedFate',
  velkoz: 'Vel',
  vel: 'Vel',
  xinzhao: 'XinZhao',
}

export function championKeyToken(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function normalizeChampionKey(key: string): string {
  const token = championKeyToken(key)
  return KEY_ALIASES[token] ?? token
}

export function sameChampionKey(a: string, b: string): boolean {
  return normalizeChampionKey(a) === normalizeChampionKey(b)
}
