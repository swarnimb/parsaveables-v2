import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'

const STORAGE_KEY = 'parsaveables_podcast_seen'

export function usePodcastNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    checkUnreadEpisodes()
  }, [])

  const checkUnreadEpisodes = async () => {
    try {
      // Fetch all published episodes
      const { data: episodes, error } = await supabase
        .from('podcast_episodes')
        .select('id')
        .eq('is_published', true)
        .order('episode_number', { ascending: false })

      if (error) throw error

      if (!episodes || episodes.length === 0) {
        setUnreadCount(0)
        return
      }

      // Get seen episode IDs from localStorage
      const seenIds = getSeenEpisodeIds()

      // Count how many episodes haven't been seen
      const unread = episodes.filter(ep => !seenIds.includes(ep.id)).length

      setUnreadCount(unread)
    } catch (err) {
      console.error('Error checking podcast notifications:', err)
      setUnreadCount(0)
    }
  }

  const markAllAsRead = async () => {
    try {
      // Fetch all published episodes
      const { data: episodes, error } = await supabase
        .from('podcast_episodes')
        .select('id')
        .eq('is_published', true)

      if (error) throw error

      if (!episodes || episodes.length === 0) return

      // Mark all as seen
      const allIds = episodes.map(ep => ep.id)
      saveSeenEpisodeIds(allIds)

      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking podcasts as read:', err)
    }
  }

  return { unreadCount, markAllAsRead, refreshUnreadCount: checkUnreadEpisodes }
}

// Helper functions for localStorage
function getSeenEpisodeIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (err) {
    console.error('Error reading podcast seen IDs:', err)
    return []
  }
}

function saveSeenEpisodeIds(ids) {
  try {
    // Get existing seen IDs
    const existing = getSeenEpisodeIds()

    // Merge with new IDs (avoid duplicates)
    const merged = [...new Set([...existing, ...ids])]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch (err) {
    console.error('Error saving podcast seen IDs:', err)
  }
}
