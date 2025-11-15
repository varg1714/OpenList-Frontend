import { createDisclosure } from "@hope-ui/solid"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { bus, fsMkdir, handleRespWithNotifySuccess, pathJoin } from "~/utils"
import { onCleanup } from "solid-js"
import { objStore } from "~/store"
import { DynamicFormModal } from "~/components/DynamicFormModal"
import { Addition } from "~/types"

export const MkConfigDir = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [, ok] = useFetch(fsMkdir)
  const { pathname } = useRouter()
  const { refresh } = usePath()

  const handler = (name: string) => {
    if (name === "mkConfigDir") {
      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const handleMkdirSubmit = async (data: Addition) => {
    const resp = await ok(pathJoin(pathname(), JSON.stringify(data)))
    handleRespWithNotifySuccess(resp, () => {
      refresh()
      onClose()
    })
  }

  const mkdirFields = () => objStore.mkdir_config || []

  return (
    <DynamicFormModal
      title={t("home.toolbar.mkdir")}
      opened={isOpen()}
      onClose={onClose}
      fields={mkdirFields()}
      onSubmit={handleMkdirSubmit}
    />
  )
}
