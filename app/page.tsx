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
    settingsDarkMode: 'Dark Mode'
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
    settingsDarkMode: 'डार्क मोड'
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
    settingsDarkMode: 'ڈارک موڈ'
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

  function acceptFile(next: File | undefined) {
    setError('')
    if (!next || (!next.type.startsWith('audio/') && !next.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i))) {
      setError(appLang === 'ur' ? 'براہ کرم صحیح آڈیو فائل منتخب کریں۔' : appLang === 'hi' ? 'कृपया सही ऑडियो फ़ाइल चुनें।' : 'Please upload an audio file (MP3, WAV, M4A, FLAC, or OGG).')
      return
    }
    if (next.size > 25 * 1024 * 1024) {
      setError(appLang === 'ur' ? 'فائل سائز بہت بڑا ہے۔ (زیادہ سے زیادہ 25MB)' : appLang === 'hi' ? 'फ़ाइल साइज़ बहुत बड़ा है। (अधिकतम 25MB)' : 'This audio file is too large (max 25MB). Please choose a smaller audio file.')
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

    const form = new FormData()
    form.append('audio', file)
    form.append('target_language', selectedLang)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: form
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate lyrics')
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
              <div 
                className={`upload-box ${isDragging ? 'dragging' : ''}`} 
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} 
                onDragLeave={() => setIsDragging(false)} 
                onDrop={onDrop} 
                onClick={() => inputRef.current?.click()} 
                role="button" 
                tabIndex={0} 
                onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="audio/*" onChange={onPick} hidden />
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
              </div>
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
