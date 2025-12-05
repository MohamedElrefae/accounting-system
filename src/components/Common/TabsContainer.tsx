import React, { useState, useEffect } from 'react'
import './TabsContainer.css'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

export interface TabsContainerProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  persistKey?: string // Key for localStorage persistence
}

export const TabsContainer: React.FC<TabsContainerProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  persistKey
}) => {
  // Persist active tab to localStorage
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(`tabs:${persistKey}:active`, activeTab)
    }
  }, [activeTab, persistKey])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, tabId: string, index: number) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTabChange(tabId)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (index + 1) % tabs.length
      const nextTab = tabs[nextIndex]
      if (!nextTab.disabled) {
        onTabChange(nextTab.id)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (index - 1 + tabs.length) % tabs.length
      const prevTab = tabs[prevIndex]
      if (!prevTab.disabled) {
        onTabChange(prevTab.id)
      }
    }
  }

  return (
    <div className="tabs-container">
      <div className="tabs-header" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={tab.disabled}
            id={`tab-${tab.id}`}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
            disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.icon && <span className="tab-icon" aria-hidden="true">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="tab-badge" aria-label={`${tab.badge} items`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="tabs-content"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {children}
      </div>
    </div>
  )
}
