import type { ToggleOption } from "@/components/ui/OptionToggle.vue"

/** Ámbito de partidos para stats: todos, solo oficiales (liga/playoff) o solo amistosos */
export type MatchScope = "all" | "official" | "friendly"

export const MATCH_SCOPE_OPTIONS: ToggleOption<MatchScope>[] = [
    { value: "official", label: "Oficiales" },
    { value: "all", label: "Todos" },
    { value: "friendly", label: "Amistosos" }
]
