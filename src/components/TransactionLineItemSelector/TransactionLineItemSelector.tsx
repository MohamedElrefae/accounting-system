import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { useToast } from '../../contexts/ToastContext'
import { lineItemsCatalogService } from '../../services/line-items-catalog'

// Minimal catalog item shape used by this selector
interface SelectorRow {
  id: string
  item_code: string | null
  item_name: string | null
  item_name_ar: string | null
  parent_id?: string | null
  unit_of_measure?: string | null
  unit_price?: number | null
  is_active?: boolean
}

export interface SelectedLineItem {
  id: string
  item_code: string | null
  item_name: string | null
  item_name_ar: string | null
  level: number
  quantity_selected: number
  unit_price_override: number
  total_amount: number
}
  level: number
  quantity_selected: number
  unit_price_override: number
  total_amount: number
}

interface TransactionLineItemSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (items: SelectedLineItem[]) => void
  orgId: string
  selectedItems?: SelectedLineItem[]
  multiSelect?: boolean
  title?: string
  allowQuantityEdit?: boolean
  allowPriceEdit?: boolean
}

const TransactionLineItemSelector: React.FC<TransactionLineItemSelectorProps> = ({
  open,
  onClose,
  onSelect,
  orgId,
  selectedItems = [],
  multiSelect = true,
  title = 'Select Line Items / اختر بنود التكلفة',
  allowQuantityEdit = true,
  allowPriceEdit = false,
}) => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
const [items, setItems] = useState<SelectorRow[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [tempSelections, setTempSelections] = useState<Map<string, SelectedLineItem>>(new Map())
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')

  // Load catalog items
  useEffect(() => {
    if (!open || !orgId) return
    
    const loadItems = async () => {
      setLoading(true)
      try {
const catalogItems = await lineItemsCatalogService.toSelectorItems(orgId)
        // Map to local shape
        setItems(catalogItems.map(ci => ({
          id: ci.id,
          item_code: ci.item_code,
          item_name: ci.item_name,
          item_name_ar: ci.item_name_ar || null,
          parent_id: ci.parent_id ?? null,
          unit_of_measure: ci.unit_of_measure ?? null,
          unit_price: ci.unit_price ?? 0,
          is_active: ci.is_active,
        })))
        
        // Initialize temp selections from existing selected items
        const tempMap = new Map<string, SelectedLineItem>()
        selectedItems.forEach(item => {
          tempMap.set(item.id, item)
        })
        setTempSelections(tempMap)
      } catch (error) {
        showToast(`Failed to load catalog items: ${(error as Error).message}`, { severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [open, orgId, selectedItems, showToast])

  // Calculate level from item code
  const calculateLevelFromCode = useCallback((code: string): number => {
    if (!code || !/^\d+$/.test(code)) return 1
    const codeNum = parseInt(code, 10)
    if (codeNum >= 1000 && codeNum < 10000) {
      if (codeNum % 1000 === 0) return 1
      if (codeNum % 100 === 0) return 2
      if (codeNum % 10 === 0) return 3
      return 4
    }
    return 1
  }, [])

  // Enhanced items with level and selection info
  const enhancedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      level: calculateLevelFromCode(item.item_code || ''),
      isSelected: tempSelections.has(item.id),
      hasChildren: items.some(i => i.parent_id === item.id),
    }))
  }, [items, tempSelections, calculateLevelFromCode])

  // Filter items
  const filteredItems = useMemo(() => {
    let result = enhancedItems

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(item =>
        (item.item_code && item.item_code.toLowerCase().includes(searchLower)) ||
        (item.item_name && item.item_name.toLowerCase().includes(searchLower)) ||
        (item.item_name_ar && item.item_name_ar.toLowerCase().includes(searchLower))
      )
    }

    // Level filter
    if (filterLevel !== 'all') {
      result = result.filter(item => item.level === filterLevel)
    }

    return result
  }, [enhancedItems, search, filterLevel])

  // Hierarchical grouping for display
  const groupedItems = useMemo(() => {
    const rootItems = filteredItems.filter(item => !item.parent_id)
    const childrenMap = new Map<string, typeof filteredItems>()
    
    filteredItems.forEach(item => {
      if (item.parent_id) {
        if (!childrenMap.has(item.parent_id)) {
          childrenMap.set(item.parent_id, [])
        }
        childrenMap.get(item.parent_id)!.push(item)
      }
    })

    return { rootItems, childrenMap }
  }, [filteredItems])

  const handleRowToggle = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

const handleItemSelect = (item: SelectorRow & { level: number }, checked: boolean) => {
    setTempSelections(prev => {
      const newMap = new Map(prev)
      
      if (checked) {
const selectedItem: SelectedLineItem = {
          id: item.id,
          item_code: item.item_code || null,
          item_name: item.item_name || null,
          item_name_ar: item.item_name_ar || null,
          level: item.level,
          quantity_selected: 1,
          unit_price_override: item.unit_price || 0,
          total_amount: 1 * (item.unit_price || 0)
        }
        newMap.set(item.id, selectedItem)
      } else {
        newMap.delete(item.id)
      }

      // If not multiSelect, clear other selections
      if (!multiSelect && checked) {
        newMap.clear()
const selectedItem: SelectedLineItem = {
          id: item.id,
          item_code: item.item_code || null,
          item_name: item.item_name || null,
          item_name_ar: item.item_name_ar || null,
          level: item.level,
          quantity_selected: 1,
          unit_price_override: item.unit_price || 0,
          total_amount: 1 * (item.unit_price || 0)
        }
        newMap.set(item.id, selectedItem)
      }
      
      return newMap
    })
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setTempSelections(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(itemId)
      if (item) {
        item.quantity_selected = Math.max(0, quantity)
        item.total_amount = item.quantity_selected * item.unit_price_override
        newMap.set(itemId, { ...item })
      }
      return newMap
    })
  }

  const handlePriceChange = (itemId: string, price: number) => {
    setTempSelections(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(itemId)
      if (item) {
        item.unit_price_override = Math.max(0, price)
        item.total_amount = item.quantity_selected * item.unit_price_override
        newMap.set(itemId, { ...item })
      }
      return newMap
    })
  }

  const handleConfirm = () => {
    const selectedList = Array.from(tempSelections.values())
    onSelect(selectedList)
    onClose()
  }

  const handleCancel = () => {
    onClose()
    // Reset temp selections
    setTimeout(() => {
      const tempMap = new Map<string, SelectedLineItem>()
      selectedItems.forEach(item => {
        tempMap.set(item.id, item)
      })
      setTempSelections(tempMap)
    }, 300)
  }

  const renderItemRow = (item: DbTxLineItem & { level: number; hasChildren: boolean; isSelected: boolean }, depth: number = 0) => {
    const isExpanded = expandedRows.has(item.id)
    const selection = tempSelections.get(item.id)
    
    return (
      <React.Fragment key={item.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: `${depth * 24 + 8}px` }}>
            <Box display="flex" alignItems="center">
              {item.hasChildren && (
                <IconButton size="small" onClick={() => handleRowToggle(item.id)}>
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
              <Checkbox
                checked={item.isSelected}
                onChange={(e) => handleItemSelect(item, e.target.checked)}
                size="small"
              />
            </Box>
          </TableCell>
          <TableCell>
            <Box>
              <Typography variant="body2" fontWeight={item.level <= 2 ? 'bold' : 'normal'}>
                {item.item_code}
              </Typography>
              <Chip 
                label={`L${item.level}`} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: '16px' }}
              />
            </Box>
          </TableCell>
          <TableCell>
            <Box>
              <Typography variant="body2">{item.item_name}</Typography>
              {item.item_name_ar && (
                <Typography variant="caption" color="text.secondary">
                  {item.item_name_ar}
                </Typography>
              )}
            </Box>
          </TableCell>
          <TableCell>{item.unit_of_measure || 'piece'}</TableCell>
          <TableCell>
            {allowQuantityEdit && selection ? (
              <TextField
                size="small"
                type="number"
                value={selection.quantity_selected}
                onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ width: '80px' }}
              />
            ) : (
              item.quantity || 1
            )}
          </TableCell>
          <TableCell>
            {allowPriceEdit && selection ? (
              <TextField
                size="small"
                type="number"
                value={selection.unit_price_override}
                onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ width: '100px' }}
              />
            ) : (
              item.unit_price || 0
            )}
          </TableCell>
          <TableCell>
            {selection ? selection.total_amount.toFixed(2) : ((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}
          </TableCell>
        </TableRow>
        
        {/* Render children */}
        {item.hasChildren && isExpanded && (
          <TableRow>
            <TableCell colSpan={7} sx={{ padding: 0 }}>
              <Collapse in={isExpanded}>
                <Table size="small">
                  <TableBody>
                    {groupedItems.childrenMap.get(item.id)?.map(child =>
                      renderItemRow(child, depth + 1)
                    )}
                  </TableBody>
                </Table>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    )
  }

  const totalAmount = Array.from(tempSelections.values()).reduce(
    (sum, item) => sum + item.total_amount,
    0
  )

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Chip 
              icon={<AddIcon />}
              label={`${tempSelections.size} selected`} 
              color="primary" 
              variant="outlined"
            />
            <Typography variant="body2" color="primary">
              Total: {totalAmount.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            size="small"
            label="Search / بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: '200px' }}
          />
          <FormControl size="small" sx={{ minWidth: '120px' }}>
            <InputLabel>Level Filter</InputLabel>
            <Select
              value={filterLevel}
              label="Level Filter"
              onChange={(e) => setFilterLevel(e.target.value as number | 'all')}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value={1}>Level 1</MenuItem>
              <MenuItem value={2}>Level 2</MenuItem>
              <MenuItem value={3}>Level 3</MenuItem>
              <MenuItem value={4}>Level 4</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedItems.rootItems.map(item => renderItemRow(item))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm}
          disabled={tempSelections.size === 0}
        >
          Select ({tempSelections.size} items)
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TransactionLineItemSelector