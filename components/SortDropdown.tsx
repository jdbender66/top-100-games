"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SortKey } from "@/types/game"

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rank", label: "Rank" },
  { value: "score_desc", label: "Score" },
  { value: "year_asc", label: "Year (oldest)" },
  { value: "year_desc", label: "Year (newest)" },
  { value: "title_az", label: "Title A–Z" },
  { value: "platform", label: "Platform" },
]

interface Props {
  value: SortKey
  onChange: (v: SortKey) => void
}

export default function SortDropdown({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="h-8 w-40 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
