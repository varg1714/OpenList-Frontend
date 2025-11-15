import { createDisclosure } from "@hope-ui/solid"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { bus, fsRename, handleRespWithNotifySuccess, pathJoin } from "~/utils"
import { onCleanup } from "solid-js"
import { objStore, selectedObjs } from "~/store"
import { DynamicFormModal } from "~/components/DynamicFormModal"
import { Addition } from "~/types"

export const EditDir = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [, ok] = useFetch(fsRename)
  const { pathname } = useRouter()
  const { refresh } = usePath()

  const handler = (name: string) => {
    if (name === "editDir") {
      console.log("editDir")
      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const handleMkdirSubmit = async (data: Addition) => {
    const resp = await ok(
      pathJoin(pathname(), selectedObjs()[0].name),
      JSON.stringify(data),
      false,
    )
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
      initialData={selectedObjs()?.[0]?.additional}
      onSubmit={handleMkdirSubmit}
    />
  )
}
