import api from 'backendAPI'
import TabStore from 'components/Tab/store'
import FileStore from 'commons/File/store'
import * as TabActions from 'components/Tab/actions'
import mobxStore from '../../mobxStore'
const { EditorTabState } = mobxStore

export const getCodeAssist = function ({ fqn, offset, content, base64 }) {
  return api.getCodeAssist(fqn, offset, content, base64)
}

export const applyCompletion = function ({ sessionId, index, insert }) {
  return api.applyCompletion(sessionId, index, insert)
}

export const getReconcile = function ({ fqn }) {
  return api.getReconcile(fqn)
}

export const findUsages = function ({ fqn, offset }) {
  return api.findUsages(fqn, offset)
}

export const findDeclaration = function ({ fqn, offset }) {
  return api.findDeclaration(fqn, offset)
}

export const saveCurrentFile = function () {
  const activeTab = EditorTabState.activeTab
  const content = activeTab ? activeTab.editor.cm.getValue() : ''
  return api.writeFile(activeTab.file.path, content)
    .then(() => {
      TabStore.updateTabFlags(activeTab.id, 'modified', false)
      FileStore.updateFile({
        path: activeTab.file.path,
        content,
      })
      return true
    })
}

export const openFile = function ({ path, spotlight }) {
  api.readFile(path)
    .then(data => FileStore.loadNodeData(data))
    .then(() => {
      TabActions.createTab({
        title: path.split('/').pop(),
        icon: 'fa fa-file-o',
        editor: {
          spotlight,
          readOnly: true,
          filePath: path,
        }
      })
    })
}

export const openLibFile = function ({ path, root, spotlight }) {
  api.getContent(path, root)
    .then((data) => {
      FileStore.loadNodeData({
        base64: false,
        content: data.content,
        path,
        name: `${path.split('.').pop()}.class`,
        contentType: 'text/x-java'
      })
    })
    .then(() => {
      TabActions.createTab({
        title: `${path.split('.').pop()}.class`,
        icon: 'fa fa-file-o',
        editor: {
          spotlight,
          readOnly: true,
          filePath: path,
        }
      })
    })
}
