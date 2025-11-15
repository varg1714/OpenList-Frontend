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
import { createEffect, createSignal, For, on, Show } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { useT } from "~/hooks"
import { Addition, DriverItem, Type } from "~/types"
import {
  ArrayAction,
  Item,
  getDefaultValue,
  isItemVisible,
} from "~/pages/manage/storages/Item"

function initializeState(fields: DriverItem[]): Addition {
  const state: Addition = {}
  for (const field of fields) {
    if (field.type === Type.Group && field.children) {
      state[field.name] = initializeState(field.children)
    } else if (field.type === Type.Array) {
      state[field.name] = []
    } else {
      state[field.name] = getDefaultValue(field.type, field.default)
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
    if (!isItemVisible(field, data)) {
      continue
    }

    const value = data[field.name]
    if (value === undefined || value === null) continue

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
      typeof value === "string" &&
      !isNaN(Number(value))
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
        const stateToSet = initialData
          ? normalizeData(fields, initialData)
          : initializeState(fields)
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
      props.onClose()
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
        <ModalHeader>{props.title}</ModalHeader>
        <ModalBody>
          <VStack spacing="$4">
            <For each={props.fields}>
              {(item) => (
                <Show when={isItemVisible(item, addition)}>
                  <Item
                    {...item}
                    value={addition[item.name] as any}
                    onChange={(...args: any[]) => {
                      if (item.type === Type.Group) {
                        const [childName, childValue] = args
                        setAddition(item.name, childName, childValue)
                      } else if (item.type === Type.Array) {
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
                </Show>
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
