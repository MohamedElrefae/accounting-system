import React, { useMemo } from 'react'
import SearchableSelect from '../Common/SearchableSelect'
import { useAuthScopeData } from '../../hooks/useAuthScopeData'
import type { Project } from '../../services/projects'

interface LineProjectSelectorProps {
    orgId?: string
    value: string
    onChange: (value: string | undefined) => void
    disabled?: boolean
    placeholder?: string
    error?: boolean
    clearable?: boolean
}

const LineProjectSelector: React.FC<LineProjectSelectorProps> = ({
    orgId,
    value,
    onChange,
    disabled,
    placeholder,
    error,
    clearable = true
}) => {
    const authScopeData = useAuthScopeData();

    const projects = useMemo(() => {
        if (!orgId) return [];
        return authScopeData.projects.filter((p: Project) => p.org_id === orgId);
    }, [authScopeData.projects, orgId]);

    const loading = !authScopeData.isReady;

    const options = useMemo(() => projects.map((p: Project) => ({
        value: p.id,
        label: `${p.code} - ${p.name}`
    })), [projects]);

    return (
        <SearchableSelect
            options={options}
            value={value}
            onChange={(val: string | null) => onChange(val || undefined)}
            disabled={disabled || !orgId || loading}
            placeholder={loading ? "جاري التحميل..." : (placeholder || "بدون مشروع")}
            error={error}
            clearable={clearable}
        />
    )
}

export default LineProjectSelector
