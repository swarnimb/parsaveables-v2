import { useState, useEffect } from 'react'

const TUTORIAL_STORAGE_KEY = 'parsaveables_tutorials'

/**
 * Tutorial Tracking Hook
 * Manages tutorial completion state in localStorage
 *
 * @param {string} tutorialId - Unique identifier for the tutorial
 * @returns {Object} - Tutorial state and control functions
 */
export function useTutorialTracking(tutorialId) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSkipped, setIsSkipped] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const tutorialData = getTutorialData()
    const tutorial = tutorialData[tutorialId]

    if (tutorial) {
      setIsCompleted(tutorial.completed || false)
      setIsSkipped(tutorial.skipped || false)
      setShouldShow(false) // Already seen
    } else {
      setShouldShow(true) // First time, should show
    }
  }, [tutorialId])

  const markCompleted = () => {
    const tutorialData = getTutorialData()
    tutorialData[tutorialId] = {
      ...tutorialData[tutorialId],
      completed: true,
      completedAt: new Date().toISOString()
    }
    saveTutorialData(tutorialData)
    setIsCompleted(true)
    setShouldShow(false)
  }

  const markSkipped = () => {
    const tutorialData = getTutorialData()
    tutorialData[tutorialId] = {
      ...tutorialData[tutorialId],
      skipped: true,
      skippedAt: new Date().toISOString()
    }
    saveTutorialData(tutorialData)
    setIsSkipped(true)
    setShouldShow(false)
  }

  const reset = () => {
    const tutorialData = getTutorialData()
    delete tutorialData[tutorialId]
    saveTutorialData(tutorialData)
    setIsCompleted(false)
    setIsSkipped(false)
    setShouldShow(true)
  }

  return {
    isCompleted,
    isSkipped,
    shouldShow,
    markCompleted,
    markSkipped,
    reset
  }
}

/**
 * Hook to check if user is on first login
 * Checks if ANY tutorial has been completed/skipped
 */
export function useIsFirstLogin() {
  const [isFirstLogin, setIsFirstLogin] = useState(false)

  useEffect(() => {
    const tutorialData = getTutorialData()
    const hasCompletedAnyTutorial = Object.values(tutorialData).some(
      t => t.completed || t.skipped
    )
    setIsFirstLogin(!hasCompletedAnyTutorial)
  }, [])

  return isFirstLogin
}

/**
 * Get all tutorial data from localStorage
 */
function getTutorialData() {
  try {
    const data = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('Error reading tutorial data:', error)
    return {}
  }
}

/**
 * Save tutorial data to localStorage
 */
function saveTutorialData(data) {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving tutorial data:', error)
  }
}

/**
 * Get completion status for a specific tutorial
 */
export function isTutorialCompleted(tutorialId) {
  const tutorialData = getTutorialData()
  return tutorialData[tutorialId]?.completed || false
}

/**
 * Get all completed tutorials
 */
export function getCompletedTutorials() {
  const tutorialData = getTutorialData()
  return Object.entries(tutorialData)
    .filter(([_, data]) => data.completed)
    .map(([id, data]) => ({ id, ...data }))
}

/**
 * Reset all tutorials (useful for testing or user preference)
 */
export function resetAllTutorials() {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch (error) {
    console.error('Error resetting tutorials:', error)
  }
}
