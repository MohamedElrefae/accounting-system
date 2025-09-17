import React from 'react'
import type { ReportPreset } from '../../services/user-presets'
import './UltimateButtons.css'

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
  const wrapCls = wrapperClassName || 'presetbar-wrap'
  const selectCls = selectClassName || 'filter-select'
  const inputCls = inputClassName || 'filter-input'
  const saveBtnCls = `ultimate-btn ultimate-btn-success ${buttonClassName || ''}`.trim()
  const delBtnCls = `ultimate-btn ultimate-btn-delete ${buttonClassName || ''}`.trim()

  return (
    <div className={wrapCls}>
      <select className={selectCls} value={selectedPresetId} onChange={(e) => onChangePreset(e.target.value)}>
        <option value=''>اختر تهيئة محفوظة</option>
        {presets.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
      </select>
      <input className={inputCls} placeholder={placeholder} value={newPresetName} onChange={e => onChangeName(e.target.value)} />
      <button className={saveBtnCls} onClick={() => onSave()}>
        <div className="btn-content"><span className="btn-text">{saveLabel}</span></div>
      </button>
      <button className={delBtnCls} onClick={() => onDelete()}>
        <div className="btn-content"><span className="btn-text">{deleteLabel}</span></div>
      </button>
    </div>
  )
}

export default PresetBar

