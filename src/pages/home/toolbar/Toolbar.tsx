import { Portal } from "solid-js/web"
import { Center } from "./Center"
import { Right } from "./Right"
import { Copy, Move } from "./CopyMove"
import { Delete } from "./Delete"
import { Rename } from "./Rename"
import { NewFile } from "./NewFile"
import { MkConfigDir } from "./MkConfigDir"
import { RecursiveMove } from "./RecursiveMove"
import { RemoveEmptyDirectory } from "./RemoveEmptyDirectory"
import { BatchRename } from "./BatchRename"
import { OfflineDownload } from "./OfflineDownload"
import { PackageDownloadModal } from "./Download"
import { lazy } from "solid-js"
import { ModalWrapper } from "./ModalWrapper"
import { LocalSettings } from "./LocalSettings"
import { BackTop } from "./BackTop"
import { Decompress } from "./Decompress"
import { Share } from "./Share"
import { EditDir } from "~/pages/home/toolbar/EditDir"
import { Mkdir } from "~/pages/home/toolbar/Mkdir"
import { RecurseList } from "~/pages/home/toolbar/RecurseList"

const Upload = lazy(() => import("../uploads/Upload"))

export const Modal = () => {
  return (
    <>
      <Copy />
      <Move />
      <Rename />
      <Delete />
      <Decompress />
      <NewFile />
      <Mkdir />
      <MkConfigDir />
      <Share />
      <RecursiveMove />
      <RemoveEmptyDirectory />
      <RecurseList />
      <BatchRename />
      <OfflineDownload />
      <PackageDownloadModal />
      <ModalWrapper name="upload" title="home.toolbar.upload">
        <Upload />
      </ModalWrapper>
      <LocalSettings />
      <EditDir />
    </>
  )
}

export const Toolbar = () => {
  return (
    <Portal>
      <Right />
      <Center />
      <Modal />
      <BackTop />
    </Portal>
  )
}
