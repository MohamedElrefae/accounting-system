import { useMemo } from 'react'

import { useTransactionsData } from '../contexts/TransactionsDataContext'
import type { SearchableSelectOption } from '../components/Common/SearchableSelect'

export interface FilterOptionsResult {
  accountOptions: SearchableSelectOption[]
  orgOptions: SearchableSelectOption[]
  projectOptions: SearchableSelectOption[]
  classificationOptions: SearchableSelectOption[]
  categoryOptions: SearchableSelectOption[]
  workItemOptions: SearchableSelectOption[]
  analysisOptions: SearchableSelectOption[]
  costCenterOptions: SearchableSelectOption[]
}

export const useFilterOptions = (): FilterOptionsResult => {
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
  } = useTransactionsData()

  const accountOptions = useMemo(() => (
    accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(account => ({
        value: account.id,
        label: `${account.code} - ${(account as any).name_ar || account.name}`,
        searchText: `${account.code} ${(account as any).name_ar || account.name}`.toLowerCase(),
      }))
  ), [accounts])

  const orgOptions = useMemo(() => ([
    { value: '', label: 'جميع المؤسسات', searchText: '' },
    ...organizations.map(org => ({
      value: org.id,
      label: `${org.code} - ${org.name}`.substring(0, 40),
      searchText: `${org.code} ${org.name}`,
    })),
  ]), [organizations])

  const projectOptions = useMemo(() => ([
    { value: '', label: 'جميع المشاريع', searchText: '' },
    ...projects.map(project => ({
      value: project.id,
      label: `${project.code} - ${project.name}`.substring(0, 40),
      searchText: `${project.code} ${project.name}`,
    })),
  ]), [projects])

  const classificationOptions = useMemo(() => ([
    { value: '', label: 'جميع التصنيفات', searchText: '' },
    ...classifications.map(classification => ({
      value: classification.id,
      label: `${classification.code} - ${classification.name}`.substring(0, 40),
      searchText: `${classification.code} ${classification.name}`,
    })),
  ]), [classifications])

  const categoryOptions = useMemo(() => ([
    { value: '', label: 'جميع الشجرة الفرعية', searchText: '' },
    ...categories
      .slice()
      .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
      .map(category => ({
        value: category.id,
        label: `${category.code} - ${category.description}`.substring(0, 52),
        searchText: `${category.code} ${category.description}`,
      })),
  ]), [categories])

  const workItemOptions = useMemo(() => ([
    { value: '', label: 'جميع عناصر العمل', searchText: '' },
    ...workItems
      .slice()
      .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
      .map(item => ({
        value: item.id,
        label: `${item.code} - ${item.name}`.substring(0, 52),
        searchText: `${item.code} ${item.name}`,
      })),
  ]), [workItems])

  const analysisOptions = useMemo(() => ([
    { value: '', label: 'جميع بنود التحليل', searchText: '' },
    ...Object.entries(analysisItemsMap)
      .sort((a, b) => `${a[1].code}`.localeCompare(`${b[1].code}`))
      .map(([id, analysis]) => ({
        value: id,
        label: `${analysis.code} - ${analysis.name}`.substring(0, 52),
        searchText: `${analysis.code} ${analysis.name}`,
      })),
  ]), [analysisItemsMap])

  const costCenterOptions = useMemo(() => ([
    { value: '', label: 'جميع مراكز التكلفة', searchText: '' },
    ...costCenters
      .slice()
      .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
      .map(costCenter => ({
        value: costCenter.id,
        label: `${costCenter.code} - ${costCenter.name}`.substring(0, 52),
        searchText: `${costCenter.code} ${costCenter.name}`,
      })),
  ]), [costCenters])

  return {
    accountOptions,
    orgOptions,
    projectOptions,
    classificationOptions,
    categoryOptions,
    workItemOptions,
    analysisOptions,
    costCenterOptions,
  }
}

export default useFilterOptions
