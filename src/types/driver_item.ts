import { Type } from "."

export interface DriverItem {
  name: string
  type: Type
  default: string
  options: string
  required?: boolean
  help?: string
  children?: DriverItem[]
  visibleOn?: VisibilityCondition
}

export interface DriverConfig {
  name: string
  local_sort: boolean
  only_local: boolean
  only_proxy: boolean
  no_cache: boolean
  no_upload: boolean
  need_ms: boolean
  default_root: string
  alert?: string
  link_parse?: LinkParseConfig
}

export interface LinkParseConfig {
  pattern: string
}

export interface VisibilityCondition {
  field: string
  op?: "eq" | "neq" | "in" | "notIn"
  value: any | any[]
}
