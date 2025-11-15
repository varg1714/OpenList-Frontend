import {
  Box,
  Button,
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Select,
  Switch as HopeSwitch,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { For, Match, Show, Switch } from "solid-js"
import { useT } from "~/hooks"
import { DriverItem, Type } from "~/types"
import { SelectOptions } from "~/components"
import get from "lodash.get"

export type ArrayAction =
  | { type: "add"; payload: Record<string, any> }
  | { type: "remove"; payload: { index: number } }
  | { type: "update"; payload: { index: number; name: string; value: any } }

export type ItemProps = DriverItem & {
  readonly?: boolean
  full_name_path?: string
  options_prefix?: string
  driver?: string
} & (
    | { type: Type.Bool; onChange?: (value: boolean) => void; value: boolean }
    | { type: Type.Number; onChange?: (value: number) => void; value: number }
    | { type: Type.Float; onChange?: (value: number) => void; value: number }
    | {
        type: Type.String | Type.Text
        onChange?: (value: string) => void
        value: string
      }
    | {
        type: Type.Select
        searchable?: boolean
        onChange?: (value: string) => void
        value: string
      }
    | {
        type: Type.Group
        value: Record<string, any>
        onChange?: (childName: string, value: any) => void
      }
    | {
        type: Type.Array
        value: Record<string, any>[]
        onChange?: (action: ArrayAction) => void
      }
  )

export function getDefaultValue(type: Type, value?: string) {
  switch (type) {
    case Type.Bool:
      return value === "true"
    case Type.Number:
      if (value == null || value === "") {
        return 0
      }
      const num = Number(value)
      return isFinite(num) ? num : 0
    case Type.Float:
      return value ? parseFloat(value) : 0.0
    default:
      return value ?? ""
  }
}

export function isItemVisible(
  item: DriverItem,
  currentData: Record<string, any>,
): boolean {
  if (!item.visibleOn) {
    return true
  }
  if (!currentData) {
    return false
  }

  const { field, op: rawOp, value } = item.visibleOn

  const op = rawOp || "eq"
  const controllingValue = get(currentData, field)

  switch (op) {
    case "eq":
      return controllingValue == value
    case "neq":
      return controllingValue != value
    case "in":
      return Array.isArray(value) && value.includes(controllingValue)
    case "notIn":
      return Array.isArray(value) && !value.includes(controllingValue)
    default:
      console.warn(`Unknown visibility condition operator: ${op}`)
      return true
  }
}

function createDefaultObject(fields: DriverItem[]): Record<string, any> {
  const obj: Record<string, any> = {}
  for (const field of fields) {
    if (field.type === Type.Group && field.children) {
      obj[field.name] = createDefaultObject(field.children)
    } else if (field.type === Type.Array) {
      obj[field.name] = []
    } else {
      obj[field.name] = getDefaultValue(field.type, field.default)
    }
  }
  return obj
}

const Item = (props: ItemProps) => {
  const t = useT()

  const getI18nLabel = (item: DriverItem) => {
    const i18nKey =
      (props.full_name_path ?? props.driver === "common")
        ? `storages.common.${item.name}`
        : `drivers.${props.driver}.${item.name}`
    const translated = t(i18nKey)
    const noChange =
      translated === i18nKey ||
      translated.toLowerCase() === item.name.toLowerCase() ||
      i18nKey.endsWith(translated)

    if (noChange) {
      return item.help ? item.help : item.name
    } else {
      return translated
    }
  }

  const getI18nOptionLabel = (
    item: DriverItem,
    key: string,
    optionMap: Map<string, string>,
  ) => {
    const rawLabel = optionMap.get(key)
    if (rawLabel) return rawLabel
    const i18nKey =
      (props.options_prefix ??
        (props.driver === "common"
          ? `storages.common.${item.name}s`
          : `drivers.${props.driver}.${item.name}s`)) + `.${key}`
    const translated = t(i18nKey)
    return translated === i18nKey || i18nKey.endsWith(translated)
      ? (optionMap.get(key) ?? key)
      : translated
  }

  return (
    <FormControl
      w="$full"
      display="flex"
      flexDirection="column"
      required={props.required}
    >
      <Show when={props.type !== Type.Group && props.type !== Type.Array}>
        <FormLabel for={props.name} display="flex" alignItems="center">
          {getI18nLabel(props)}
        </FormLabel>
      </Show>

      <Switch fallback={<Center>{t("settings.unknown_type")}</Center>}>
        <Match when={props.type === Type.String}>
          <Input
            id={props.name}
            type={props.name == "password" ? "password" : "text"}
            readOnly={props.readonly}
            value={props.value as string}
            onChange={
              props.type === Type.String
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Number}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={props.value as number}
            onInput={
              props.type === Type.Number
                ? (e) => {
                    const rawValue = e.currentTarget.value
                    if (rawValue === "") {
                      props.onChange?.(0)
                      return
                    }
                    const num = Number(rawValue)

                    if (isFinite(num)) {
                      if (props.value !== num) {
                        props.onChange?.(num)
                      }
                    }
                  }
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Float}>
          <Input
            type="number"
            step="any"
            id={props.name}
            readOnly={props.readonly}
            value={props.value as number}
            onInput={
              props.type === Type.Float
                ? (e) => props.onChange?.(parseFloat(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.name}
            readOnly={props.readonly}
            checked={props.value as boolean}
            onChange={
              props.type === Type.Bool
                ? (e: any) => props.onChange?.(e.currentTarget.checked)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.name}
            readOnly={props.readonly}
            value={props.value as string}
            onChange={
              props.type === Type.Text
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.name}
            readOnly={props.readonly}
            value={props.value as string}
            onChange={
              props.type === Type.Select
                ? (e) => props.onChange?.(e)
                : undefined
            }
          >
            <SelectOptions
              readonly={props.readonly}
              searchable={props.type === Type.Select && props.searchable}
              options={(() => {
                const optionMap = new Map<string, string>()
                props.help?.split(";").forEach((subHelp) => {
                  const option = subHelp.split(":")
                  if (option.length == 2) optionMap.set(option[0], option[1])
                })
                return props.options.split(",").map((key) => ({
                  key,
                  label: getI18nOptionLabel(props, key, optionMap),
                }))
              })()}
            />
          </Select>
        </Match>

        <Match when={props.type === Type.Group && props.children}>
          <Box
            border="1px solid"
            borderColor="$neutral6"
            borderRadius="$md"
            p="$4"
            mt="$2"
          >
            <VStack spacing="$4">
              <FormLabel fontWeight="$bold" mb="$2">
                {getI18nLabel(props)}
              </FormLabel>
              <For each={(props as any).children}>
                {(childItem: DriverItem) => (
                  <Show when={isItemVisible(childItem, (props as any).value)}>
                    <Item
                      {...childItem}
                      driver={props.driver}
                      value={(props as any).value?.[childItem.name]}
                      onChange={(val: any) => {
                        if (props.type === Type.Group) {
                          props.onChange?.(childItem.name, val)
                        }
                      }}
                    />
                  </Show>
                )}
              </For>
            </VStack>
          </Box>
        </Match>

        <Match when={props.type === Type.Array && props.children}>
          <VStack w="$full" spacing="$2" alignItems="flex-start">
            <FormLabel fontWeight="$bold">{getI18nLabel(props)}</FormLabel>
            <For each={props.value as Record<string, any>[]}>
              {(itemData, index) => (
                <Box
                  border="1px solid"
                  borderColor="$neutral7"
                  borderRadius="$lg"
                  p="$3"
                  w="$full"
                >
                  <VStack spacing="$3">
                    <HStack w="$full" justifyContent="flex-end">
                      <Button
                        size="xs"
                        colorScheme="danger"
                        variant="subtle"
                        onClick={() => {
                          if (props.type === Type.Array)
                            props.onChange?.({
                              type: "remove",
                              payload: { index: index() },
                            })
                        }}
                      >
                        {t("global.delete")}
                      </Button>
                    </HStack>
                    <For each={(props as any).children}>
                      {(childItem: DriverItem) => (
                        <Show when={isItemVisible(childItem, itemData)}>
                          <Item
                            {...childItem}
                            driver={props.driver}
                            value={itemData[childItem.name]}
                            onChange={(val: any) => {
                              if (props.type === Type.Array)
                                props.onChange?.({
                                  type: "update",
                                  payload: {
                                    index: index(),
                                    name: childItem.name,
                                    value: val,
                                  },
                                })
                            }}
                          />
                        </Show>
                      )}
                    </For>
                  </VStack>
                </Box>
              )}
            </For>
            <Button
              size="sm"
              variant="outline"
              colorScheme="primary"
              onClick={() => {
                if (props.type === Type.Array && props.children) {
                  const newObject = createDefaultObject(props.children)
                  props.onChange?.({ type: "add", payload: newObject })
                }
              }}
            >
              {t("global.add")} {getI18nLabel(props)}
            </Button>
          </VStack>
        </Match>
      </Switch>

      <Show
        when={
          props.help && props.type !== Type.Group && props.type !== Type.Array
        }
      >
        <FormHelperText>
          {t(
            props.driver === "common"
              ? `storages.common.${props.name}-tips`
              : `drivers.${props.driver}.${props.name}-tips`,
          )}
        </FormHelperText>
      </Show>
    </FormControl>
  )
}

export { Item }
