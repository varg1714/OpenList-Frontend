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
import { createSignal, For, onCleanup, Show } from "solid-js"
import { Item } from "../../manage/storages/Item"
import { Addition, DriverItem, Type } from "~/types"
import { createStore } from "solid-js/store"
import { objStore } from "~/store"

function GetDefaultValue(type: Type, value?: string) {
  switch (type) {
    case Type.Bool:
      if (value) {
        return value === "true"
      }
      return false
    case Type.Number:
      if (value) {
        return parseInt(value)
      }
      return 0
    case Type.Float:
      if (value) {
        return parseFloat(value)
      }
      return 0
    default:
      if (value) {
        return value
      }
      return ""
  }
}

export const Mkdir = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsMkdir)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [mkdirFields, setMkdirFields] = createSignal<DriverItem[]>([])
  const [addition, setAddition] = createStore<Addition>({})

  const handler = (name: string) => {
    if (name === "mkdir") {
      const mkdirInfo = objStore.mkdir_config
      if (mkdirInfo !== undefined && mkdirInfo.length > 0) {
        setMkdirFields(mkdirInfo)

        const initialAddition = addition
        for (const field of mkdirInfo) {
          if (initialAddition[field.name] === undefined) {
            initialAddition[field.name] = GetDefaultValue(
              field.type,
              field.default,
            )
          }
        }
        setAddition(initialAddition)
      } else {
        setMkdirFields([])
        setAddition({})
      }
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const handleSubmit = async () => {
    const fieldsMap = new Map<string, DriverItem>()
    mkdirFields().forEach((field) => fieldsMap.set(field.name, field))

    const preparedAddition: Record<string, any> = {}

    for (const key in addition) {
      const value = addition[key]
      const fieldInfo = fieldsMap.get(key)

      if (
        fieldInfo &&
        (fieldInfo.type === Type.Number || fieldInfo.type === Type.Select)
      ) {
        const numValue = Number(value)
        preparedAddition[key] = isNaN(numValue) ? value : numValue
      } else {
        preparedAddition[key] = value
      }
    }

    const resp = await ok(
      pathJoin(pathname(), JSON.stringify(preparedAddition)),
    )
    handleRespWithNotifySuccess(resp, () => {
      refresh()
      onClose()
      const mkdirInfo = objStore.mkdir_config
      if (mkdirInfo !== undefined && mkdirInfo.length > 0) {
        const initialAddition: Addition = {}
        for (const field of mkdirInfo) {
          initialAddition[field.name] = GetDefaultValue(
            field.type,
            field.default,
          )
        }
        setAddition(initialAddition)
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
        size={{ "@initial": "xs", "@md": "md" }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t(`home.toolbar.input_dir_name`)}</ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <For each={mkdirFields()}>
                {(item) => (
                  <Item
                    {...item}
                    driver={objStore.provider}
                    value={addition[item.name] as any}
                    onChange={(val: any) => {
                      setAddition(item.name, val)
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
