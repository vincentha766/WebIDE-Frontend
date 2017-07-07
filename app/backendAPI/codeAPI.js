import { request, qs } from '../utils'
import config from '../config'

export function getCodeAssist (fqn, offset, content, base64 = true) {
  if (base64) {
    content = window.btoa(unescape(encodeURIComponent(content)))
  }
  return request.post(`/ws/${config.spaceKey}/code-assist`, { fqn, offset, content, base64 })
}

export function applyCompletion (sessionId, index, insert = true) {
  return request.get(`/ws/${config.spaceKey}/apply/completion`, { sessionId, index, insert })
}

export function getReconcile (fqn) {
  return request.get(`/ws/${config.spaceKey}/reconcile`, { fqn })
}

export function findUsages (fqn, offset) {
  return request.post(`/ws/${config.spaceKey}/find/usages`, { fqn, offset })
}

export function findDeclaration (fqn, offset) {
  return request.get(`/ws/${config.spaceKey}/find-declaration`, { fqn, offset })
}

export function getContent (path, root) {
  return request.get(`/ws/${config.spaceKey}/content`, { path, root })
}
