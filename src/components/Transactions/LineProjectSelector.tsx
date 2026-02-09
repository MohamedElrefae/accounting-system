import React, { useState, useEffect } from 'react'
import SearchableSelect from '../Common/SearchableSelect'
import { getActiveProjectsByOrg, type Project } from '../../services/projects'

interface LineProjectSelectorProps {
    orgId?: string
    value: string
    onChange: (value: string | undefined) => void
    disabled?: boolean
    placeholder?: string
    error?: boolean
    clearable?: boolean
}

// Simple in-memory cache to prevent redundant fetches for same org in same session
const PROJECTS_CACHE: Record<string, Project[]> = {}

const LineProjectSelector: React.FC<LineProjectSelectorProps> = ({
    orgId,
    value,
    onChange,
    disabled,
    placeholder,
    error,
    clearable = true
}) => {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!orgId) {
            setProjects([])
            return
        }

        const fetchProjects = async () => {
            // Check cache first
            if (PROJECTS_CACHE[orgId]) {
                console.log(`[LineProjectSelector] Using cached projects for org ${orgId}`)
                setProjects(PROJECTS_CACHE[orgId])
                return
            }

            setLoading(true)
            try {
                console.log(`[LineProjectSelector] Fetching projects for org ${orgId}`)
                const data = await getActiveProjectsByOrg(orgId)

                // Update cache
                PROJECTS_CACHE[orgId] = data
                setProjects(data)
            } catch (err) {
                console.error('[LineProjectSelector] Failed to fetch projects:', err)
                setProjects([]) // Fallback to empty on error
            } finally {
                setLoading(false)
            }
        }

        fetchProjects()
    }, [orgId])

    // Reset value if selected project is not valid for new org?
    // No, let the parent handle clearing invalid values if org changes, 
    // or just show "Invalid Project" if needed.
    // TransactionWizard already handles clearing invalid projects when loadSecureProjects runs for header, 
    // but for line items, we should be careful. 
    // The SearchableSelect will likely show the ID if label is not found in options, 
    // or we can handle it. 

    const options = projects.map(p => ({
        value: p.id,
        label: `${p.code} - ${p.name}`
    }))

    return (
        <SearchableSelect
            options={options}
            value={value}
            onChange={(val) => onChange(val || undefined)}
            disabled={disabled || !orgId || loading}
            placeholder={loading ? "جاري التحميل..." : (placeholder || "بدون مشروع")}
            error={error}
            clearable={clearable}
        />
    )
}

export default LineProjectSelector
