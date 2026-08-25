'use client'

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'

type Theme = 'emerald' | 'royal-green' | 'gold' | 'navy' | 'purple' | 'burgundy' | 'teal' | 'dark-islamic'
type LyricsLanguage = 'en' | 'hi' | 'ur'
type AppLanguage = 'en' | 'hi' | 'ur'

const themes: { id: Theme; label: string; swatch: string }[] = [
  { id: 'emerald', label: 'Emerald', swatch: '#0f766e' },
  { id: 'royal-green', label: 'Royal Green', swatch: '#166534' },
  { id: 'gold', label: 'Islamic Gold', swatch: '#b8860b' },
  { id: 'navy', label: 'Deep Navy', swatch: '#1e3a5f' },
  { id: 'purple', label: 'Royal Purple', swatch: '#6d28d9' },
  { id: 'burgundy', label: 'Burgundy', swatch: '#881337' },
  { id: 'teal', label: 'Teal', swatch: '#0f766e' },
  { id: 'dark-islamic', label: 'Dark Islamic', swatch: '#10b981' },
]

const uiTranslations: Record<AppLanguage, {
  brandSubtitle: string
  eyebrow: string
  heroTitleTop: string
  heroTitleBottom: string
  heroSubtitle: string
  uploadTitle: string
  uploadDesc: string
  uploadClick: string
  uploadTypes: string
  audioReady: string
  getLyrics: string
  languageLabel: string
  chooseLanguage: string
  langEn: string
  langHi: string
  langUr: string
  processingWait: string
  processingTitle: string
  processingDesc: string
  resultGeneratedIn: string
  resultTitle: string
  generateAnother: string
  changeLanguage: string
  copyLyrics: string
  copied: string
  downloadTxt: string
  privacy: string
  footerLeft: string
  settingsTitle: string
  settingsAppLang: string
  settingsTheme: string
  settingsDarkMode: string
  settingsApiKey: string
  settingsApiKeyDesc: string
  settingsApiKeyPlaceholder: string
  settingsApiKeySave: string
  settingsApiKeySaved: string
}> = {
  en: {
    brandSubtitle: 'AI Naat Lyrics',
    eyebrow: 'AI-POWERED TRANSCRIPTION',
    heroTitleTop: 'Turn your Naat',
    heroTitleBottom: 'audio into lyrics.',
    heroSubtitle: 'Upload a Naat, choose your language, and get its lyrics with AI.',
    uploadTitle: 'Upload Your Naat',
    uploadDesc: 'Drag & drop your audio here or ',
    uploadClick: 'click to browse',
    uploadTypes: 'MP3 · WAV · M4A · FLAC · OGG (Up to 25 MB)',
    audioReady: 'Audio ready',
    getLyrics: 'Get Lyrics',
    languageLabel: 'Language:',
    chooseLanguage: 'Choose language',
    langEn: 'English (Roman Urdu)',
    langHi: 'Hindi (Devanagari)',
    langUr: 'Urdu Script',
    processingWait: 'PLEASE WAIT',
    processingTitle: 'Listening to your Naat...',
    processingDesc: 'Transcribing lyrics and formatting lines in your selected language.',
    resultGeneratedIn: 'GENERATED IN',
    resultTitle: 'Your Naat Lyrics',
    generateAnother: 'Generate another',
    changeLanguage: 'Change Language',
    copyLyrics: 'Copy lyrics',
    copied: '✓ Lyrics copied',
    downloadTxt: 'Download TXT',
    privacy: 'Your audio is processed safely to generate lyrics and is not permanently stored.',
    footerLeft: 'Simple words. Meaningful moments.',
    settingsTitle: 'Settings & Preferences',
    settingsAppLang: 'App Interface Language',
    settingsTheme: 'Appearance & Theme',
    settingsDarkMode: 'Dark Mode',
    settingsApiKey: 'Live Audio AI Key (Free Gemini Key)',
    settingsApiKeyDesc: 'For 100% live audio transcription without limits, paste a free Google Gemini API key from aistudio.google.com/app/apikey',
    settingsApiKeyPlaceholder: 'Paste Gemini key (AIza...) or OpenRouter key...',
    settingsApiKeySave: 'Save Key',
    settingsApiKeySaved: '✓ Key Saved'
  },
  hi: {
    brandSubtitle: 'एआई नात लिरिक़्स',
    eyebrow: 'एआई संचालित ट्रांसक्रिप्शन',
    heroTitleTop: 'अपनी नात ऑडियो को',
    heroTitleBottom: 'बोल में बदलें.',
    heroSubtitle: 'नात अपलोड करें, अपनी भाषा चुनें और एआई से इसके बोल पाएं।',
    uploadTitle: 'अपनी नात अपलोड करें',
    uploadDesc: 'अपनी ऑडियो यहाँ ड्रैग करें या ',
    uploadClick: 'ब्राउज़ करने के लिए क्लिक करें',
    uploadTypes: 'MP3 · WAV · M4A · FLAC · OGG (25 MB तक)',
    audioReady: 'ऑडियो तैयार है',
    getLyrics: 'बोल प्राप्त करें',
    languageLabel: 'भाषा:',
    chooseLanguage: 'भाषा चुनें',
    langEn: 'अंग्रेज़ी (रोमन उर्दू)',
    langHi: 'हिंदी (देवनागरी)',
    langUr: 'उर्दू लिपि',
    processingWait: 'कृपया प्रतीक्षा करें',
    processingTitle: 'आपकी नात सुनी जा रही है...',
    processingDesc: 'आपकी चुनी हुई भाषा में बोल तैयार किए जा रहे हैं।',
    resultGeneratedIn: 'में जनरेट किया गया',
    resultTitle: 'आपकी नात के बोल',
    generateAnother: 'दूसरी नात चुनें',
    changeLanguage: 'भाषा बदलें',
    copyLyrics: 'बोल कॉपी करें',
    copied: '✓ कॉपी हो गया',
    downloadTxt: 'TXT डाउनलोड करें',
    privacy: 'आपकी ऑडियो सुरक्षित रूप से प्रोसेस की जाती है और स्टोर नहीं की जाती।',
    footerLeft: 'सरल शब्द। अर्थपूर्ण पल।',
    settingsTitle: 'सेटिंग्स और प्राथमिकताएं',
    settingsAppLang: 'ऐप इंटरफ़ेस भाषा',
    settingsTheme: 'अपीयरेंस और थीम',
    settingsDarkMode: 'डार्क मोड',
    settingsApiKey: 'लाइव ऑडियो एआई की (फ्री जेमिनी की)',
    settingsApiKeyDesc: '100% लाइव ऑडियो ट्रांसक्रिप्शन के लिए, aistudio.google.com/app/apikey से अपनी फ्री गूगल जेमिनी एपीआई की डालें',
    settingsApiKeyPlaceholder: 'गूगल जेमिनी की (AIza...) यहाँ पेस्ट करें...',
    settingsApiKeySave: 'की सेव करें',
    settingsApiKeySaved: '✓ की सेव हो गई'
  },
  ur: {
    brandSubtitle: 'مصنوعی ذہانت نعت اشعار',
    eyebrow: 'اے آئی سمارٹ نقل حرفی',
    heroTitleTop: 'اپنی نعت آڈیو کو',
    heroTitleBottom: 'اشعار میں تبدیل کریں۔',
    heroSubtitle: 'نعت اپ لوڈ کریں، زبان منتخب کریں اور اے آئی سے مکمل اشعار حاصل کریں۔',
    uploadTitle: 'اپنی نعت اپ لوڈ کریں',
    uploadDesc: 'آڈیو فائل یہاں کھینچ کر لائیں یا ',
    uploadClick: 'براؤز کرنے کے لیے کلک کریں',
    uploadTypes: 'ایم پی ۳ · ویو · ایم ۴ اے · فیلک · او جی جی (۲۵ ایم بی تک)',
    audioReady: 'آڈیو تیار ہے',
    getLyrics: 'اشعار حاصل کریں',
    languageLabel: 'زبان:',
    chooseLanguage: 'زبان منتخب کریں',
    langEn: 'انگریزی (رومن اردو)',
    langHi: 'ہندی (دیوناگری)',
    langUr: 'اردو رسم الخط',
    processingWait: 'براہ کرم انتظار کریں',
    processingTitle: 'نعت سن رہے ہیں...',
    processingDesc: 'آپ کی منتخب کردہ زبان میں نعت کے بول تیار کیے جا رہے ہیں۔',
    resultGeneratedIn: 'میں تیار شدہ',
    resultTitle: 'آپ کی نعت کے بول',
    generateAnother: 'دوسری نعت منتخب کریں',
    changeLanguage: 'زبان تبدیل کریں',
    copyLyrics: 'اشعار کاپی کریں',
    copied: '✓ کاپی ہو گیا',
    downloadTxt: 'ٹیکسٹ فائل ڈاؤن لوڈ کریں',
    privacy: 'آپ کا آڈیو ڈیٹا محفوظ طریقے سے پروسیس ہوتا ہے اور محفوظ نہیں کیا جاتا۔',
    footerLeft: 'سادگی اور معنویت',
    settingsTitle: 'ترتیبات اور ترجیحات',
    settingsAppLang: 'ایپ کی زبان',
    settingsTheme: 'مظہر اور تھیم',
    settingsDarkMode: 'ڈارک موڈ',
    settingsApiKey: 'لائیو آڈیو اے آئی کی (مفت جیمنی کی)',
    settingsApiKeyDesc: 'مکمل لائیو آڈیو ٹرانسکرپشن کے لیے aistudio.google.com/app/apikey سے اپنی مفت جیمنی اے پی آئی کی دراج کریں',
    settingsApiKeyPlaceholder: 'جیمنی کی (AIza...) یہاں درج کریں...',
    settingsApiKeySave: 'کی محفوظ کریں',
    settingsApiKeySaved: '✓ کی محفوظ ہو گئی'
  }
}

export default function Page() {
  const [theme, setTheme] = useState<Theme>('emerald')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [appLang, setAppLang] = useState<AppLanguage>('en')
  const [language, setLanguage] = useState<LyricsLanguage | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'processing' | 'result'>('idle')
  const [copied, setCopied] = useState(false)
  const [lyrics, setLyrics] = useState('')
  const [error, setError] = useState('')

  // Custom User API Key State
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)

  // Slide-over Settings Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const t = uiTranslations[appLang] || uiTranslations.en

  useEffect(() => {
    const savedTheme = localStorage.getItem('naateraza-theme') as Theme
    if (savedTheme && themes.some(item => item.id === savedTheme)) {
      setTheme(savedTheme)
    }
    const savedAppLang = localStorage.getItem('naateraza-app-lang') as AppLanguage
    if (savedAppLang && ['en', 'hi', 'ur'].includes(savedAppLang)) {
      setAppLang(savedAppLang)
    }
    const savedDarkMode = localStorage.getItem('naateraza-darkmode') === 'true'
    setIsDarkMode(savedDarkMode)

    const savedKey = localStorage.getItem('naateraza-custom-key') || ''
    if (savedKey) {
      setApiKeyInput(savedKey)
    }
  }, [])

  function toggleDarkMode() {
    const nextDark = !isDarkMode
    setIsDarkMode(nextDark)
    localStorage.setItem('naateraza-darkmode', String(nextDark))
  }

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme)
    localStorage.setItem('naateraza-theme', nextTheme)
  }

  function changeAppLang(nextLang: AppLanguage) {
    setAppLang(nextLang)
    localStorage.setItem('naateraza-app-lang', nextLang)
  }

  function saveApiKey() {
    const trimmed = apiKeyInput.trim()
    localStorage.setItem('naateraza-custom-key', trimmed)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  function acceptFile(next: File | undefined) {
    setError('')
    if (!next) return

    // Mobile-friendly audio validation (handles iOS Safari & Android Chrome file selections)
    const mime = (next.type || '').toLowerCase()
    const name = (next.name || '').toLowerCase()
    const isAudioMime = !mime || mime.startsWith('audio/') || mime.includes('octet-stream') || mime.includes('mp4')
    const isAudioExt = !name || !!name.match(/\.(mp3|wav|m4a|flac|ogg|aac|opus|3gp|m4p|mp4|webm|amr|wma)$/i)

    if (!isAudioMime && !isAudioExt) {
      setError(appLang === 'ur' ? 'براہ کرم صحیح آڈیو فائل منتخب کریں۔' : appLang === 'hi' ? 'कृपया सही ऑडियो फ़ाइल चुनें।' : 'Please upload a valid audio file.')
      return
    }

    if (next.size > 35 * 1024 * 1024) {
      setError(appLang === 'ur' ? 'فائل سائز بہت بڑا ہے۔ (زیادہ سے زیادہ 35MB)' : appLang === 'hi' ? 'फ़ाइल साइज़ बहुत बड़ा है। (अधिकतम 35MB)' : 'This audio file is too large (max 35MB). Please choose a smaller audio file.')
      return
    }

    setFile(next)
    setLyrics('')
    setStatus('idle')
    setProgress(0)
    setPlaying(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files[0])
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0])
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  async function generateWithLanguage(targetLang?: LyricsLanguage) {
    const selectedLang = targetLang || language
    if (!file || !selectedLang) return
    setError('')
    setStatus('processing')

    const savedKey = typeof window !== 'undefined' ? localStorage.getItem('naateraza-custom-key') || '' : ''
    const headers: Record<string, string> = {}
    if (savedKey) {
      headers['x-api-key'] = savedKey
      if (savedKey.startsWith('AIza')) headers['x-api-provider'] = 'gemini'
      else if (savedKey.startsWith('sk-or-')) headers['x-api-provider'] = 'openrouter'
      else if (savedKey.startsWith('sk-')) headers['x-api-provider'] = 'openai'
      else if (savedKey.startsWith('gsk_')) headers['x-api-provider'] = 'groq'
    }

    try {
      const CHUNK_SIZE = 2 * 1024 * 1024 // 2 MB per chunk (well under Vercel's 4.5 MB limit)

      if (file.size > CHUNK_SIZE) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
        const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        let lastData: any = null

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE
          const end = Math.min(file.size, start + CHUNK_SIZE)
          const chunkBlob = file.slice(start, end)
          const chunkFile = new File([chunkBlob], file.name, { type: file.type || 'audio/mp3' })

          const chunkForm = new FormData()
          chunkForm.append('audio', chunkFile)
          chunkForm.append('target_language', selectedLang)
          chunkForm.append('upload_id', uploadId)
          chunkForm.append('chunk_index', String(i))
          chunkForm.append('total_chunks', String(totalChunks))

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers,
            body: chunkForm
          })

          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            lastData = await response.json()
          } else {
            const textBody = await response.text()
            throw new Error(textBody || `Server error status ${response.status}`)
          }

          if (!response.ok || !lastData?.success) {
            throw new Error(lastData?.error || 'Failed during chunked audio upload')
          }
        }

        setLyrics(lastData.lyrics)
        setStatus('result')
        return
      }

      // Small files under 2 MB
      const form = new FormData()
      form.append('audio', file)
      form.append('target_language', selectedLang)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers,
        body: form
      })

      let data: any = null
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const textBody = await response.text()
        throw new Error(textBody || `Server error status ${response.status}`)
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate lyrics')
      }
      setLyrics(data.lyrics)
      setStatus('result')
    } catch (requestError) {
      setStatus('idle')
      setError(requestError instanceof Error ? requestError.message : 'We couldn’t generate the lyrics. Please try again.')
    }
  }

  function reset() {
    setFile(null)
    setLanguage('')
    setLyrics('')
    setError('')
    setStatus('idle')
    setProgress(0)
    setPlaying(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function copyLyrics() {
    navigator.clipboard?.writeText(lyrics)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className={`app theme-${theme} ${isDarkMode ? 'dark-mode' : ''}`} dir={appLang === 'ur' ? 'rtl' : 'ltr'}>
      <div className="pattern" aria-hidden="true" />
      
      {/* Top Header */}
      <header className="topbar">
        <div className="brand-group">
          {/* Interactive Crescent Moon Dark Mode Toggle */}
          <button 
            className={`brand-moon-btn ${isDarkMode ? 'dark-active' : ''}`}
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDarkMode ? "Dark Mode ON (Click to toggle)" : "Click moon icon for Dark Mode"}
          >
            {isDarkMode ? '☀️' : '☾'}
          </button>

          <button className="brand-title-btn" onClick={reset} aria-label="Return to home">
            <strong>NaatERaza</strong>
            <small>{t.brandSubtitle}</small>
          </button>
        </div>

        <div className="topbar-actions">
          {/* 3-Line Hamburger Menu Button for Settings */}
          <button 
            className="hamburger-btn" 
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Settings"
          >
            <div className="hamburger-icon">
              <span />
              <span />
              <span />
            </div>
            <span>{appLang === 'ur' ? 'ترتیبات' : appLang === 'hi' ? 'सेटिंग्स' : 'Settings'}</span>
          </button>
        </div>
      </header>

      {/* Slide-Over Settings Drawer */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <div 
            className="drawer-panel" 
            dir={appLang === 'ur' ? 'rtl' : 'ltr'} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h3>{t.settingsTitle}</h3>
              <button className="close-btn" onClick={() => setIsDrawerOpen(false)}>×</button>
            </div>

            {/* Dark Mode Quick Toggle */}
            <div className="drawer-section">
              <p className="drawer-section-title">{t.settingsDarkMode}</p>
              <button 
                className={`lang-chip ${isDarkMode ? 'active' : ''}`}
                onClick={toggleDarkMode}
              >
                <span>{isDarkMode ? '☀️ Dark Mode (ON)' : '☾ Dark Mode (OFF)'}</span>
                <span>{isDarkMode ? '✓' : ''}</span>
              </button>
            </div>

            {/* App Interface Language */}
            <div className="drawer-section">
              <p className="drawer-section-title">{t.settingsAppLang}</p>
              <div className="lang-grid">
                <button 
                  className={`lang-chip ${appLang === 'en' ? 'active' : ''}`}
                  onClick={() => changeAppLang('en')}
                >
                  <span>English</span>
                  {appLang === 'en' && <span>✓</span>}
                </button>
                <button 
                  className={`lang-chip ${appLang === 'hi' ? 'active' : ''}`}
                  onClick={() => changeAppLang('hi')}
                >
                  <span>हिंदी (Hindi)</span>
                  {appLang === 'hi' && <span>✓</span>}
                </button>
                <button 
                  className={`lang-chip ${appLang === 'ur' ? 'active' : ''}`}
                  onClick={() => changeAppLang('ur')}
                >
                  <span>اردو (Urdu)</span>
                  {appLang === 'ur' && <span>✓</span>}
                </button>
              </div>
            </div>

            {/* Live Audio AI API Key Option */}
            <div className="drawer-section">
              <p className="drawer-section-title">{t.settingsApiKey}</p>
              <small style={{ color: 'var(--muted)', display: 'block', marginBottom: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                {t.settingsApiKeyDesc}
              </small>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={t.settingsApiKeyPlaceholder}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button 
                  onClick={saveApiKey}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: 'var(--background)',
                    border: 0,
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {apiKeySaved ? t.settingsApiKeySaved : t.settingsApiKeySave}
                </button>
              </div>
            </div>

            {/* Appearance & Themes */}
            <div className="drawer-section">
              <p className="drawer-section-title">{t.settingsTheme}</p>
              <div className="theme-grid">
                {themes.map((item) => (
                  <button 
                    key={item.id}
                    className={`theme-chip ${theme === item.id ? 'active' : ''}`}
                    onClick={() => changeTheme(item.id)}
                  >
                    <span className="theme-dot" style={{ background: item.swatch }} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Workspace */}
      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow"><span /> {t.eyebrow}</p>
          <h1 id="page-title" className={appLang === 'ur' ? 'hero-urdu' : ''}>
            {t.heroTitleTop}<br />
            <em>{t.heroTitleBottom}</em>
          </h1>
          <p className={`subtitle ${appLang === 'ur' ? 'urdu-sub' : ''}`}>
            {t.heroSubtitle}
          </p>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {status === 'processing' ? (
          <div className="processing" role="status">
            <div className="pulse">◌</div>
            <p className="eyebrow"><span /> {t.processingWait}</p>
            <h2>{t.processingTitle}</h2>
            <p>{t.processingDesc}</p>
            <div className="loader"><i /></div>
          </div>
        ) : status === 'result' ? (
          <div className="result">
            <div className="result-head">
              <div>
                <p className="eyebrow">
                  <span /> {t.resultGeneratedIn} {language === 'en' ? t.langEn.toUpperCase() : language === 'hi' ? t.langHi.toUpperCase() : t.langUr.toUpperCase()}
                </p>
                <h2>{t.resultTitle}</h2>
              </div>
              
              <div className="result-head-actions">
                {/* Quick Language Switcher Dropdown on Result View */}
                <label className="result-lang-select" title={t.changeLanguage}>
                  <span>🌐</span>
                  <select 
                    value={language} 
                    onChange={(e) => {
                      const nextLang = e.target.value as LyricsLanguage
                      if (nextLang && nextLang !== language) {
                        setLanguage(nextLang)
                        generateWithLanguage(nextLang)
                      }
                    }} 
                    aria-label="Change lyrics language"
                  >
                    <option value="en">{t.langEn}</option>
                    <option value="hi">{t.langHi}</option>
                    <option value="ur">{t.langUr}</option>
                  </select>
                  <span>⌄</span>
                </label>

                <button className="quiet-button" onClick={reset}>{t.generateAnother}</button>
              </div>
            </div>

            <article className={`lyrics lyrics-${language}`} dir={language === 'ur' ? 'rtl' : 'ltr'}>
              {lyrics.split('\n').map((line, index) => (
                <p key={index}>{line || '\u00a0'}</p>
              ))}
            </article>

            <div className="result-actions">
              <button className="primary-button" onClick={copyLyrics}>
                {copied ? t.copied : t.copyLyrics}
              </button>
              <button 
                className="secondary-button" 
                onClick={() => {
                  const blob = new Blob([lyrics], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const anchor = document.createElement('a')
                  anchor.href = url
                  anchor.download = 'naateraza-lyrics.txt'
                  anchor.click()
                  URL.revokeObjectURL(url)
                }}
              >
                {t.downloadTxt}
              </button>
            </div>
          </div>
        ) : (
          <>
            {!file ? (
              <label 
                className={`upload-box ${isDragging ? 'dragging' : ''}`} 
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} 
                onDragLeave={() => setIsDragging(false)} 
                onDrop={onDrop} 
                style={{ cursor: 'pointer', display: 'block' }}
              >
                <input 
                  ref={inputRef} 
                  type="file" 
                  accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus,.3gp,.mp4,.m4p" 
                  onChange={onPick} 
                  style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }} 
                />
                <div className="upload-symbol">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h2>{t.uploadTitle}</h2>
                <p>{t.uploadDesc}<u>{t.uploadClick}</u></p>
                <small>{t.uploadTypes}</small>
              </label>
            ) : (
              <div className="audio-card">
                <div className="audio-top">
                  <button className="play-button" onClick={togglePlay} aria-label={playing ? 'Pause audio' : 'Play audio'}>
                    {playing ? 'Ⅱ' : '▶'}
                  </button>
                  <div>
                    <strong>{file.name}</strong>
                    <small>{(file.size / 1024 / 1024).toFixed(1)} MB · {t.audioReady}</small>
                  </div>
                  <button className="remove" onClick={reset} aria-label="Remove audio" dir={appLang === 'ur' ? 'rtl' : 'ltr'}>×</button>
                </div>

                <div className="audio-progress">
                  <span style={{ width: `${progress}%` }} />
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progress} 
                    onChange={(event) => setProgress(Number(event.target.value))} 
                    aria-label="Audio progress" 
                  />
                </div>

                <audio 
                  ref={audioRef} 
                  src={URL.createObjectURL(file)} 
                  onTimeUpdate={(event) => setProgress((event.currentTarget.currentTime / event.currentTarget.duration) * 100 || 0)} 
                  onEnded={() => setPlaying(false)} 
                />
              </div>
            )}

            {file && (
              <div className="controls">
                <button className="primary-button get-button" disabled={!language} onClick={() => generateWithLanguage()} dir={appLang === 'ur' ? 'rtl' : 'ltr'}>
                  <span>{t.getLyrics}</span>
                  <span>{appLang === 'ur' ? '←' : '→'}</span>
                </button>
                <label className="language-select">
                  <span>{t.languageLabel}</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value as LyricsLanguage)} aria-label="Select lyrics language">
                    <option value="">{t.chooseLanguage}</option>
                    <option value="en">{t.langEn}</option>
                    <option value="hi">{t.langHi}</option>
                    <option value="ur">{t.langUr}</option>
                  </select>
                  <span>⌄</span>
                </label>
              </div>
            )}
          </>
        )}

        {status === 'idle' && (
          <p className="privacy"><span>⌁</span> {t.privacy}</p>
        )}
      </section>

      <footer>
        <p className="footer-developer">
          Developed by <strong className="gradient-author">ArshXCoder</strong>
        </p>
        <p className="footer-subtext">
          {t.footerLeft} · NaatERaza © 2026
        </p>
      </footer>
    </main>
  )
}

// Web Audio API Audio Compressor Helper for Vercel 4.5MB Serverless Payload Compliance
async function compressAudioIfNeeded(file: File): Promise<File> {
  // If file size is under 3 MB, no compression needed
  if (file.size <= 3 * 1024 * 1024) {
    return file
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0)

    const renderedBuffer = await offlineCtx.startRendering()
    const pcmData = renderedBuffer.getChannelData(0)
    const wavBlob = encodeWAV(pcmData, 16000)

    return new File([wavBlob], file.name.replace(/\.[^/.]+$/, '') + '_compact.wav', { type: 'audio/wav' })
  } catch (err) {
    console.warn('Client audio compression skipped, using original file:', err)
    return file
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
