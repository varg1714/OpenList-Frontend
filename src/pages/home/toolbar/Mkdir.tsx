import {
  Button,
  createDisclosure,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
} from "@hope-ui/solid"
import { ModalInput } from "~/components"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { bus, fsMkdir, handleRespWithNotifySuccess, pathJoin } from "~/utils"
import { createSignal, For, onCleanup, Show, createEffect } from "solid-js"
import { Item, ArrayAction } from "../../manage/storages/Item" // [CHANGED] 引入 ArrayAction
import { Addition, DriverItem, Type } from "~/types"
import { createStore, produce } from "solid-js/store" // [CHANGED] 引入 produce
import { objStore } from "~/store"

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

const prepareDataForSubmit = (
  fields: DriverItem[],
  data: Addition,
): Record<string, any> => {
  const result: Record<string, any> = {}
  const fieldsMap = new Map(fields.map((f) => [f.name, f]))

  for (const key in data) {
    const fieldInfo = fieldsMap.get(key)
    const value = data[key]

    if (fieldInfo) {
      if (
        fieldInfo.type === Type.Group &&
        fieldInfo.children &&
        typeof value === "object" &&
        value !== null
      ) {
        result[key] = prepareDataForSubmit(fieldInfo.children, value)
      } else if (
        fieldInfo.type === Type.Array &&
        fieldInfo.children &&
        Array.isArray(value)
      ) {
        result[key] = value.map((item) =>
          prepareDataForSubmit(fieldInfo.children!, item),
        )
      } else if (
        fieldInfo.type === Type.Number ||
        (fieldInfo.type === Type.Select && !isNaN(Number(value)))
      ) {
        const numValue = Number(value)
        result[key] = isNaN(numValue) ? value : numValue
      } else {
        result[key] = value
      }
    }
  }
  return result
}

export const Mkdir = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsMkdir)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [mkdirFields, setMkdirFields] = createSignal<DriverItem[]>([])
  const [addition, setAddition] = createStore<Addition>({})

  createEffect(() => {
    const mkdirInfo = objStore.mkdir_config // 依赖于 store 中的配置

    // 当配置加载或变更时，执行初始化
    if (mkdirInfo && mkdirInfo.length > 0) {
      setMkdirFields(mkdirInfo)
      setAddition(initializeState(mkdirInfo))
    } else {
      setMkdirFields([])
      setAddition({})
    }
  })

  // [逻辑简化] handler 现在只负责打开面板，不再处理状态初始化
  const handler = (name: string) => {
    if (name === "mkdir") {
      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const handleSubmit = async () => {
    const preparedAddition = prepareDataForSubmit(mkdirFields(), addition)
    const fields = mkdirFields()
    let finalPath = ""
    if (
      fields.length === 1 &&
      fields[0].name === "name" &&
      typeof preparedAddition.name === "string"
    ) {
      finalPath = pathJoin(pathname(), preparedAddition.name)
    } else {
      finalPath = pathJoin(pathname(), JSON.stringify(preparedAddition))
    }

    const resp = await ok(finalPath)
    handleRespWithNotifySuccess(resp, () => {
      refresh()
      onClose()
      const mkdirInfo = objStore.mkdir_config
      if (mkdirInfo && mkdirInfo.length > 0) {
        setAddition(initializeState(mkdirInfo))
      }
    })
  }

  return (
    <Show
      when={mkdirFields().length > 0}
      fallback={
        <ModalInput
          title="home.toolbar.input_dir_name"
          opened={isOpen()}
          onClose={onClose}
          loading={loading()}
          onSubmit={async (dirName) => {
            const resp = await ok(pathJoin(pathname(), dirName))
            handleRespWithNotifySuccess(resp, () => {
              refresh()
              onClose()
            })
          }}
        />
      }
    >
      <Modal
        blockScrollOnMount={false}
        opened={isOpen()}
        onClose={onClose}
        size={{ "@initial": "xs", "@md": "lg" }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("home.toolbar.mkdir")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <For each={mkdirFields()}>
                {(item) => (
                  <Item
                    {...item}
                    driver={objStore.provider}
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
            <Button onClick={onClose} colorScheme="neutral">
              {t("global.cancel")}
            </Button>
            <Button loading={loading()} onClick={handleSubmit}>
              {t("global.ok")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Show>
  )
}
