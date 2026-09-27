param([Parameter(Mandatory=$true)][string]$OutputDir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$phrases = @(
  'One idea. One clear story.',
  'Forty two seconds matter.',
  'Compare noise with focus.',
  'Define. Design. Deliver.',
  'Connections make meaning visible.',
  'Let progress match understanding.',
  'Notify only when it matters.',
  'Give the next beat space.',
  'Motion directs the eye.',
  'Review, then render.'
)
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.Rate = -1
for ($i = 0; $i -lt $phrases.Count; $i++) {
  $path = Join-Path $OutputDir ('line-{0:D2}.wav' -f $i)
  $speaker.SetOutputToWaveFile($path)
  $speaker.Speak($phrases[$i])
  $speaker.SetOutputToNull()
}
$phrases | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputDir 'phrases.json') -Encoding utf8
