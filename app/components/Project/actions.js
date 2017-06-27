import _ from 'lodash'
import api from 'backendAPI'
import state from './state'
import { dismissModal } from '../Modal/actions'
import { CLASSPATH_TYPE } from './constant'
const { CPE_LIBRARY, CPE_PROJECT, CPE_SOURCE, CPE_VARIABLE, CPE_CONTAINER } = CLASSPATH_TYPE

export const fetchProjectType = function () {
  api.fetchProjectType().then((res) => {
    state.estimated = res.estimated
    if (res.estimated) {
      state.projectResolve = res.estimations
    } else {
      state.projectResolve = res
      state.selectedResolve = res.type
    }
  })
}

export const putProjectType = function (projectConfigDto) {
  return dispatch => api.putProjectType(projectConfigDto).then((res) => {
    state.selectedResolve = res.type
    // TODO 文件树获取 libs 目录
    // LibTreeActions.getLibs()
    state.estimated = res.estimated
    if (res.estimated) {
      state.projectResolve = res.estimations
    } else {
      if (!res.attributes) {
        res.attributes = {}
      }
      state.projectResolve = res
    }
    dismissModal()
  })
}

export const fetchClasspath = function () {
  return dispatch => api.fetchClasspath().then((res) => {
    const libs = []
    const sources = []
    res.map((item) => {
      item.collapsed = true
      if (item.entryKind === CPE_CONTAINER || item.entryKind === CPE_LIBRARY) {
        libs.push(item)
      } else if (item.entryKind === CPE_SOURCE) {
        sources.push(item)
      }
    })
    state.classpath = res
    state.libs = libs
    state.sources = sources
  })
}

export const postClasspath = function (classpath) {
  return dispatch => api.postClasspath(classpath).then((res) => {
    dismissModal()
    // TODO 文件树获取 libs 目录
    // FileTreeActions.getProjectResolve()
    // LibTreeActions.getLibs()
  })
}
