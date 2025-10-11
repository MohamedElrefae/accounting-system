import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function readCsv(path) {
  const text = readFileSync(path, 'utf-8').replace(/\r\n/g,'\n').replace(/\r/g,'\n')
  const [headerLine, ...lines] = text.split('\n').filter(Boolean)
  const headers = headerLine.split(',')
  return lines.map(line => {
    const cols = []
    let cur = ''
    let inQuotes = false
    for (let i=0;i<line.length;i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue }
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) { cols.push(cur); cur=''; } else { cur += ch }
    }
    cols.push(cur)
    const row = {}
    headers.forEach((h, idx) => row[h] = cols[idx] ?? '')
    return row
  })
}

function writeXlsx(rows, outPath) {
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'CurrentAccounts')
  XLSX.writeFile(wb, outPath)
}

const root = resolve(process.cwd())
const acceptedCsv = resolve(root, 'samples', 'opening_balance_current_accounts.accepted.csv')
const rejectedCsv = resolve(root, 'samples', 'opening_balance_current_accounts.rejected.csv')

const acceptedRows = readCsv(acceptedCsv)
const rejectedRows = readCsv(rejectedCsv)

writeXlsx(acceptedRows, resolve(root, 'samples', 'opening_balance_current_accounts.accepted.xlsx'))
writeXlsx(rejectedRows, resolve(root, 'samples', 'opening_balance_current_accounts.rejected.xlsx'))

console.log('Generated:')
console.log('- samples/opening_balance_current_accounts.accepted.xlsx')
console.log('- samples/opening_balance_current_accounts.rejected.xlsx')