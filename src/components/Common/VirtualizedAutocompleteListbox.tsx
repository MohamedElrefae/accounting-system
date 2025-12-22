import * as React from 'react'
import { forwardRef, useEffect, useRef } from 'react'
import { styled } from '@mui/material/styles'

import { autocompleteClasses } from '@mui/material/Autocomplete'
import { VariableSizeList } from 'react-window'
import type { ListChildComponentProps } from 'react-window'

// A virtualized ListboxComponent for MUI Autocomplete using react-window.
// - Supports variable item sizes
// - Respects MUI theming and RTL

const LISTBOX_PADDING = 8 // px

const StyledListbox = styled('div')(() => ({
  [`& .${autocompleteClasses.listbox}`]: {
    boxSizing: 'border-box',
    padding: 0,
    margin: 0,
  },
})) as any

function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props
  const dataSet = data[index]
  const inlineStyle = {
    ...style,
    top: (style.top as number) + LISTBOX_PADDING,
  }
  return (
    <div style={inlineStyle} key={dataSet.key}>
      {dataSet}
    </div>
  )
}

const OuterElementContext = React.createContext({})

const OuterElementType = forwardRef<HTMLDivElement>(function OuterElementType(props, ref) {
  const outerProps = React.useContext(OuterElementContext)
  return <div ref={ref} {...props} {...outerProps} />
})

function useResetCache(data: any) {
  const ref = useRef<VariableSizeList>(null)
  useEffect(() => {
    if (ref.current != null) {
      ref.current.resetAfterIndex(0, true)
    }
  }, [data])
  return ref
}

export interface VirtualizedListboxProps {
  itemSize?: number
  getItemSize?: (child: React.ReactNode) => number
}

// The ListboxComponent signature required by MUI Autocomplete.
// Usage: <Autocomplete ListboxComponent={VirtualizedAutocompleteListbox as any} ... />
const VirtualizedAutocompleteListbox = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement>>(function VirtualizedAutocompleteListbox(props, ref) {
  const { children, ...other } = props
  const itemSize = 36

  const itemData = React.Children.toArray(children)
  const gridRef = useResetCache(itemData)
  const getChildSize = (_child: React.ReactNode) => {

    // Could be enhanced to read a prop set by renderOption for variable heights
    return itemSize
  }
  const getHeight = () => {
    const items = itemData.length
    const height = items > 8 ? 8 * itemSize : items * itemSize
    return height + 2 * LISTBOX_PADDING
  }

  return (
    <StyledListbox ref={ref} {...other}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight()}
          width="100%"
          ref={gridRef}
          outerElementType={OuterElementType as any}
          innerElementType="ul"
          itemSize={(index: number) => getChildSize(itemData[index])}
          overscanCount={5}
          itemCount={itemData.length}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </StyledListbox>
  )
})

export default VirtualizedAutocompleteListbox