import React from 'react'
import type { ReportPreset } from '../../services/user-presets'

interface PresetBarProps {
  presets: ReportPreset[]
  selectedPresetId: string
  newPresetName: string
  onChangePreset: (id: string) => void | Promise<void>
  onChangeName: (name: string) => void
  onSave: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  wrapperClassName?: string
  selectClassName?: string
  inputClassName?: string
  buttonClassName?: string
  placeholder?: string
  saveLabel?: string
  deleteLabel?: string
}

const PresetBar: React.FC<PresetBarProps> = ({
  presets,
  selectedPresetId,
  newPresetName,
  onChangePreset,
  onChangeName,
  onSave,
  onDelete,
  wrapperClassName = '',
  selectClassName = '',
  inputClassName = '',
  buttonClassName = '',
  placeholder = 'اسم التهيئة',
  saveLabel = 'حفظ',
  deleteLabel = 'حذف',
}) => {
  return (
    <div className={wrapperClassName}>
      <select className={selectClassName} value={selectedPresetId} onChange={(e) => onChangePreset(e.target.value)}>
        <option value=''>اختر تهيئة محفوظة</option>
        {presets.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
      </select>
      <input className={inputClassName} placeholder={placeholder} value={newPresetName} onChange={e => onChangeName(e.target.value)} />
      <button className={buttonClassName} onClick={() => onSave()}>{saveLabel}</button>
      <button className={buttonClassName} onClick={() => onDelete()}>{deleteLabel}</button>
    </div>
  )
}

export default PresetBar

