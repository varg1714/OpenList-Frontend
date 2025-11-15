import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
} from "@hope-ui/solid"
import { createEffect, createSignal, For, on } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { useT } from "~/hooks"
import { Addition, DriverItem, Type } from "~/types"
import { ArrayAction, Item } from "~/pages/manage/storages/Item"

function GetDefaultValue(type: Type, value?: string) {
  switch (type) {
    case Type.Bool:
      return value === "true"
    case Type.Number:
      return value ? parseInt(value) : 0
    case Type.Float:
      return value ? parseFloat(value) : 0.0
    default:
      return value ?? ""
  }
}

function initializeState(fields: DriverItem[]): Addition {
  const state: Addition = {}
  for (const field of fields) {
    if (field.type === Type.Group && field.children) {
      state[field.name] = initializeState(field.children)
    } else if (field.type === Type.Array) {
      state[field.name] = []
    } else {
      state[field.name] = GetDefaultValue(field.type, field.default)
    }
  }
  return state
}

function normalizeData(fields: DriverItem[], data: any): any {
  if (!data || typeof data !== "object") {
    if (Array.isArray(data)) {
      return data.map((item) => normalizeData(fields, item))
    }
    return data
  }

  const normalized: Addition = {}

  for (const field of fields) {
    const value = data[field.name]

    if (value === undefined || value === null) {
      if (field.type === Type.Array) {
        normalized[field.name] = []
      } else if (field.type === Type.Group) {
        normalized[field.name] = normalizeData(field.children || [], {})
      } else {
        normalized[field.name] = value
      }
      continue
    }

    if (field.type === Type.Group && field.children) {
      normalized[field.name] = normalizeData(field.children, value)
    } else if (field.type === Type.Array && field.children) {
      // 递归处理数组中的每个对象
      normalized[field.name] = (value as any[]).map((item) =>
        normalizeData(field.children!, item),
      )
    } else if (
      field.type === Type.Select &&
      (typeof value === "number" || typeof value === "boolean")
    ) {
      normalized[field.name] = value.toString()
    } else {
      normalized[field.name] = value
    }
  }

  // 对于那些在`data`中不存在但在`fields`中定义的字段，也需要处理
  for (const field of fields) {
    if (normalized[field.name] === undefined) {
      if (field.type === Type.Array) {
        normalized[field.name] = []
      }
    }
  }

  return normalized
}

function prepareDataForSubmit(fields: DriverItem[], data: Addition): Addition {
  const preparedData: Addition = {}
  for (const field of fields) {
    const value = data[field.name]
    if (value === undefined) continue

    if (field.type === Type.Group && field.children) {
      preparedData[field.name] = prepareDataForSubmit(
        field.children,
        value as Addition,
      )
    } else if (field.type === Type.Array && field.children) {
      preparedData[field.name] = (value as any[]).map((item) =>
        prepareDataForSubmit(field.children!, item),
      )
    } else if (
      (field.type === Type.Number || field.type === Type.Select) &&
      typeof value === "string"
    ) {
      preparedData[field.name] = Number(value)
    } else {
      preparedData[field.name] = value
    }
  }
  return preparedData
}

export interface DynamicFormModalProps {
  title: string
  opened: boolean
  onClose: () => void
  fields: DriverItem[]
  initialData?: Addition
  onSubmit: (data: Addition) => Promise<any>
}

export const DynamicFormModal = (props: DynamicFormModalProps) => {
  const t = useT()
  const [loading, setLoading] = createSignal(false)
  const [addition, setAddition] = createStore<Addition>({})

  createEffect(
    on(
      () => [props.fields, props.initialData],
      ([fields, initialData]) => {
        let stateToSet: Addition
        if (initialData) {
          stateToSet = normalizeData(fields, initialData)
        } else {
          stateToSet = initializeState(fields)
        }
        setAddition(stateToSet)
      },
      { defer: true },
    ),
  )

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const preparedAddition = prepareDataForSubmit(props.fields, addition)
      await props.onSubmit(preparedAddition)
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      blockScrollOnMount={false}
      opened={props.opened}
      onClose={props.onClose}
      size={{ "@initial": "xs", "@md": "lg" }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.mkdir")}</ModalHeader>
        <ModalBody>
          <VStack spacing="$4">
            <For each={props.fields}>
              {(item) => (
                <Item
                  {...item}
                  // driver={objStore.provider}
                  value={addition[item.name] as any}
                  onChange={(...args: any[]) => {
                    if (item.type === Type.Group) {
                      const [childName, childValue] = args
                      setAddition(item.name, childName, childValue)
                    } else if (item.type === Type.Array) {
                      // [NEW] 处理 Array 类型的 actions
                      const action = args[0] as ArrayAction
                      switch (action.type) {
                        case "add":
                          setAddition(
                            item.name,
                            produce((arr) => arr.push(action.payload)),
                          )
                          break
                        case "remove":
                          setAddition(
                            item.name,
                            produce((arr) =>
                              arr.splice(action.payload.index, 1),
                            ),
                          )
                          break
                        case "update":
                          setAddition(
                            item.name,
                            action.payload.index,
                            action.payload.name,
                            action.payload.value,
                          )
                          break
                      }
                    } else {
                      const [value] = args
                      setAddition(item.name, value)
                    }
                  }}
                />
              )}
            </For>
          </VStack>
        </ModalBody>
        <ModalFooter display="flex" gap="$2">
          <Button onClick={props.onClose} colorScheme="neutral">
            {t("global.cancel")}
          </Button>
          <Button loading={loading()} onClick={handleSubmit}>
            {t("global.ok")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
