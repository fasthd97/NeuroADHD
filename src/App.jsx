import { useState, useEffect } from 'react'
import Feed from './components/Feed.jsx'
import Settings from './components/Settings.jsx'
import feedsData from './feeds.json'

const TOPICS_KEY = 'neuroadhd_topics'

export default function App() {
  const [topics, setTopics] = useState(() => {
    try {
      const stored = localStorage.getItem(TOPICS_KEY)
      return stored ? JSON.parse(stored) : feedsData
    } catch {
      return feedsData
    }
  })
  const [showSettings, setShowSettings] = useState(false)

  function saveTopics(newTopics) {
    setTopics(newTopics)
    localStorage.setItem(TOPICS_KEY, JSON.stringify(newTopics))
    const blob = new Blob([JSON.stringify(newTopics, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'feeds.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Feed onOpenSettings={() => setShowSettings(true)} />
      {showSettings && (
        <Settings
          topics={topics}
          onSave={saveTopics}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
