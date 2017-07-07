import _ from 'lodash'
import React, { Component } from 'react'
import CodeMirror from 'codemirror'
import cx from 'classnames'
import moment from 'moment'
import { autorun } from 'mobx'
import { inject, observer } from 'mobx-react'
import endsWith from 'lodash/endsWith'
import { defaultProps } from 'utils/decorators'
import mtln from 'utils/multiline'
import useragent from 'utils/useragent'
import dispatchCommand from 'commands/dispatchCommand'
import TabStore from 'components/Tab/store'
import FileStore from 'commons/File/store'
import './addons'
import ProjectStore from '../../../Project/store'
import * as EditorActions from '../../actions'
import TabstopManager from './tabstop'
import config from '../../../../config'

function initializeEditor (cmContainer, theme) {
  // @todo: add other setting item from config
  const cmDOM = document.createElement('div')
  Object.assign(cmDOM.style, { width: '100%', height: '100%' })
  cmContainer.appendChild(cmDOM)
  const cm = CodeMirror(cmDOM, {
    gutters: ['CodeMirror-linenumbers'],
    theme,
    autofocus: true,
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
  })

  // 1. resize
  cm.setSize('100%', '100%')

  // 2. prevent default codemirror dragover handler, so the drag-to-split feature can work
  //    but the default handler that open a file on drop is actually pretty neat,
  //    should make our drag feature compatible with it later
  cm.on('dragover', (a, e) => e.preventDefault())

  cm.isFocused = cm.hasFocus // little hack to make codemirror work with legacy interface
  return cm
}

// Ref: codemirror/mode/meta.js
function getMode (file) {
  return CodeMirror.findModeByFileName(file.path.split('/').pop()) || CodeMirror.findModeByMIME(file.contentType)
}

const debounced = _.debounce(func => func(), 1000)

@defaultProps(({ tab }) => ({
  editor: tab.editor || null,
  file: tab.editor ? tab.editor.file : null,
}))
@inject(state => ({
  themeName: state.SettingState.settings.theme.syntax_theme.value,
}))
@observer
class CodeMirrorEditor extends Component {
  static defaultProps = {
    theme: 'default',
    height: '100%',
    width: '100%',
  };

  componentDidMount () {
    const { themeName, editor, file } = this.props

    let isCmFreshlyInit = false
    // todo add other setting item from config
    if (editor.cm) {
      this.cm = editor.cm
      this.cmContainer.appendChild(this.cm.getWrapperElement())
    } else {
      this.cm = editor.cm = initializeEditor(this.cmContainer, themeName)
      isCmFreshlyInit = true
    }

    const cm = this.cm
    if (isCmFreshlyInit) {
      cm.setValue(editor.content)
      let modeInfo
      if (file) modeInfo = getMode(file)
      if (modeInfo) {
        if (modeInfo.mode === 'null') {
          cm.setOption('mode', modeInfo.mode)
        } else {
          require([`codemirror/mode/${modeInfo.mode}/${modeInfo.mode}.js`], () => cm.setOption('mode', modeInfo.mime))
        }
      }
    }

    cm.focus()
    cm.on('change', this.onChange)
    cm.on('focus', this.onFocus)

    const isJava = (ProjectStore.getState().isJava && endsWith(file.path.toLowerCase(), '.java'))
    if (isJava) {
      this.isJava = isJava
      this.initAutoComplete(cm)
    }
    if (editor.spotlight) {
      this.spotlight(editor.spotlight.offset, editor.spotlight.length, true)
    }

    this.dispose = this.renderGitBlameGutter()
  }

  initAutoComplete = (cm) => {
    const { file } = this.props
    const sourcePath = `/${ProjectStore.getState().mavenResolve.attributes['java.source.folder']}/`
    if (!_.startsWith(file.path, sourcePath)) return
    if (!_.endsWith(file.path.toLowerCase(), '.java')) return

    this.fqn = file.path.substring(sourcePath.length, file.path.length - 5).replace(/\//g, '.')
    cm.setOption('extraKeys', { 'Alt-/': 'autocomplete' })
    cm.setOption('hintOptions', { hint: this.synonyms })
    cm.setOption('gutters', ['CodeMirror-lint-markers'])
    cm.setOption('lint', { getAnnotations: this.schemaLint, async: false })
    CodeMirror.on(this.cm.display.lineDiv, 'mousemove', this.mousemove)
    cm.on('mousedown', this.onClick)
  }

  getMouseToken = (e) => {
    const excludeType = ['comment', 'string', 'keyword']
    const shift = e.shiftKey
    const ctrl = e.ctrlKey
    const meta = e.metaKey
    const mod = useragent.isMac ? meta : ctrl
    if (mod && shift) {
      const pos = this.cm.coordsChar({ left: e.pageX, top: e.pageY })
      const token = this.cm.getTokenAt(pos)
      if ((_.trim(token.string)) && token.type && _.indexOf(excludeType, token.type) < 0) {
        return { pos, token }
      }
    }
    return false
  }

  mousemove = (e) => {
    if (this.markerWordId) this.markerWordId.clear()
    const mouseToken = this.getMouseToken(e)
    if (mouseToken) {
      const { pos, token } = mouseToken
      const markText = this.cm.markText(
        { line: pos.line, ch: token.start },
        { line: pos.line, ch: token.end },
        {
          className: 'CodeMirror-word-variable',
          startStyle: 'CodeMirror-word-variable-start',
          endStyle: 'CodeMirror-word-variable-end',
          inclusiveLeft: true,
          inclusiveRight: true,
          clearWhenEmpty: false,  // Works in CodeMirror 4.6
        })
      this.markerWordId = markText
    }
  }

  spotlight = (offset, length) => {
    const markText = this.cm.markText(
      this.cm.posFromIndex(offset),
      this.cm.posFromIndex(offset + length),
      {
        className: 'CodeMirror-spotlight-variable',
        startStyle: 'CodeMirror-spotlight-variable-start',
        endStyle: 'CodeMirror-spotlight-variable-end',
        inclusiveLeft: true,
        inclusiveRight: true,
        clearWhenEmpty: false,  // Works in CodeMirror 4.6
      }
    )
    setTimeout(() => {
      markText.clear()
    }, 1000)
  }

  onClick = (cm, e) => {
    const mouseToken = this.getMouseToken(e)
    if (mouseToken) {
      e.preventDefault()
      const { file } = this.props
      const { pos, token } = mouseToken
      EditorActions.findDeclaration({
        fqn: this.fqn,
        offset: this.cm.indexFromPos(pos)
      }).then((res) => {
        if (res) {
          if (res.libId === 0) {
            const filePath = res.path.split(config.spaceKey)[1]
            if (filePath === file.path) {
              this.spotlight(res.offset, res.length, true)
            } else {
              EditorActions.openFile({
                path: filePath,
                spotlight: {
                  offset: res.offset,
                  length: res.length,
                }
              })
            }
          } else {
            EditorActions.openLibFile({
              path: res.path,
              root: res.libId,
              spotlight: {
                offset: res.offset,
                length: res.length,
              }
            })
          }
        }
      })
    }
  }

  fileSavedPromise = Promise.resolve()

  schemaLint = (value) => {
    let resolve
    let reject
    this.fileSavedPromise.then(() => {
      resolve()
    })
    return new Promise((rsv, rjt) => {
      resolve = rsv
      reject = rjt
    }).then(() => {
      return EditorActions.getReconcile({
        fqn: this.fqn
      }).then((res) => {
        const annotations = []
        res.problems.forEach((problem) => {
          const { error, warning, message, sourceLineNumber, sourceStart, sourceEnd } = problem
          let severity = ''
          if (error) {
            severity = 'error'
          }
          if (warning) {
            severity = 'warning'
          }
          const annotation = {
            message,
            severity,
            from: this.cm.posFromIndex(sourceStart),
            to: this.cm.posFromIndex(sourceEnd + 1),
          }
          annotations.push(annotation)
        })
        return annotations
      })
    })
  }

  pick = (cm, data, completion, insert) => {
    EditorActions.applyCompletion({
      sessionId: this.sessionId,
      index: completion.index,
      insert,
    }).then((res) => {
      cm.operation(() => {
        res.changes.forEach((change) => {
          cm.replaceRange(change.text, cm.posFromIndex(change.offset), cm.posFromIndex(change.offset + change.length), 'complete')
        })
        if (res.linkedModeModel) {
          const tabstops = []
          const firstSt = []
          const escPos = {
            anchor: cm.posFromIndex(res.linkedModeModel.escapePosition),
            head: cm.posFromIndex(res.linkedModeModel.escapePosition),
          }
          firstSt.push(escPos)
          tabstops.push(firstSt)
          res.linkedModeModel.groups.forEach((group, i) => {
            const tabstop = []
            tabstop.index = i
            tabstop.value = ''
            group.positions.forEach((position, j) => {
              const p = {
                anchor: cm.posFromIndex(position.offset),
                head: cm.posFromIndex(position.offset + position.length),
              }
              tabstop.push(p)
            })
            tabstops.push(tabstop)
          })
          const startRange = cm.posFromIndex(0)
          this.tabstopManager = new TabstopManager(cm)
          this.tabstopManager.addTabstops(tabstops, startRange, escPos)
          this.tabstopManager.tabNext()
        } else if (res.selection) {
          cm.setCursor(cm.posFromIndex(res.selection.offset + res.selection.length), cm.posFromIndex(res.selection.offset))
        }
      })
    })
  }

  renderProposal = (elt, data, cur) => {
    const iconDom = document.createElement('i')
    iconDom.innerHTML = ''
    iconDom.className = 'hints-icon'
    const lockIconDom = document.createElement('i')
    lockIconDom.innerHTML = ''
    lockIconDom.className = 'hints-lock-icon'
    if (cur.proposal.image) {
      if (cur.proposal.image === 'class') {
        iconDom.innerHTML = 'C'
        iconDom.className = 'hints-icon hints-icon-class'
      } else if (cur.proposal.image === 'interface') {
        iconDom.innerHTML = 'I'
        iconDom.className = 'hints-icon hints-icon-interface'
      } else if (cur.proposal.image === 'enum') {
        iconDom.innerHTML = 'E'
        iconDom.className = 'hints-icon hints-icon-class'
      } else if (cur.proposal.image === 'template') {
        iconDom.innerHTML = 'T'
        iconDom.className = 'hints-icon hints-icon-class'
      } else if (cur.proposal.image === 'annotation') {
        iconDom.innerHTML = '@'
        iconDom.className = 'hints-icon hints-icon-interface'
      } else if (cur.proposal.image.indexOf('Variable') >= 0) {
        iconDom.innerHTML = 'V'
        iconDom.className = 'hints-icon hints-icon-variable'
      } else if (cur.proposal.image.indexOf('Method') >= 0) {
        iconDom.innerHTML = 'M'
        iconDom.className = 'hints-icon hints-icon-method'
      } else if (cur.proposal.image.indexOf('Field') >= 0) {
        iconDom.innerHTML = 'F'
        iconDom.className = 'hints-icon hints-icon-variable'
      } else if (cur.proposal.image === 'package') {
        iconDom.innerHTML = 'P'
        iconDom.className = 'hints-icon hints-icon-interface'
      }

      if (cur.proposal.image.indexOf('private') >= 0) {
        lockIconDom.className = 'hints-lock-icon private fa fa-lock'
      } else if (cur.proposal.image.indexOf('public') >= 0) {
        lockIconDom.className = 'hints-lock-icon public fa fa-unlock-alt'
      } else if (cur.proposal.image.indexOf('protected') >= 0) {
        lockIconDom.className = 'hints-lock-icon protected fa fa-key'
      }
    }
    const infoDom = document.createElement('span')
    infoDom.innerHTML = cur.proposal.displayString.replace(/#FQN#/g, 'FQN')
    elt.appendChild(iconDom)
    elt.appendChild(lockIconDom)
    elt.appendChild(infoDom)
    return elt
  }

  synonyms = (cm, option) => {
    const cursor = cm.getCursor()
    const offset = cm.indexFromPos(cursor)
    const content = cm.getValue()
    return EditorActions.getCodeAssist({
      fqn: this.fqn,
      offset,
      content,
    }).then((res) => {
      if (res.proposals.length > 0) {
        this.sessionId = res.sessionId
        const list = res.proposals.map((proposal, index) => {
          return {
            render: this.renderProposal,
            hint: this.pick,
            proposal,
            index,
          }
        })
        return {
          list,
          from: 0,
          to: 0,
        }
      }
    })
  }

  renderGitBlameGutter () {
    return autorun('renderGitBlameGutter', () => {
      // set gutter first
      const gutterId = 'git-blame-gutter'
      const gutters = this.cm.options.gutters
      const editor = this.props.editor

      if (!editor.gitBlame.show) {
        this.cm.clearGutter(gutterId)
        this.cm.setOption('gutters', gutters.filter(id => id !== gutterId))
        this.cm.refresh()
        return null
      }

      const gitBlameData = editor.gitBlame.data || []

      if (gutters.indexOf(gutterId) === -1) {
        this.cm.setOption('gutters', [...gutters, gutterId])
      }

      gitBlameData.forEach(({ author, shortName: commitHash }, ln) => {
        if (!commitHash) return
        const fullMessage = mtln`
          commit: ${commitHash}
          time: ${moment(author.when).format('YYYY-MM-DD hh:mm:ss')}
          author: ${author.name}<${author.emailAddress}>`
        const blameText = document.createElement('div')
        blameText.innerHTML = `<div title='${fullMessage}'>${commitHash} ${moment(author.when).format('YYYY-MM-DD')} ${author.name}</div>`
        this.cm.setGutterMarker(ln, 'git-blame-gutter', blameText)
      })

      this.cm.refresh()
    })
  }

  onChange = (cm, e) => {
    let resolve
    this.fileSavedPromise = new Promise((rsv) => { resolve = rsv })
    if (!this.isChanging) this.isChanging = true
    const { tab, file } = this.props
    TabStore.updateTab({
      id: tab.id,
      flags: { modified: true },
    })
    const cursor = cm.getCursor()
    const token = this.cm.getTokenAt(cursor)
    if (token.string === '.') {
      cm.execCommand('autocomplete')
    }
    if (file) debounced(() => {
      FileStore.updateFile({
        id: file.id,
        content: this.cm.getValue(),
      })
      EditorActions.saveCurrentFile().then(() => resolve())
      this.isChanging = false
    })
  }

  onFocus = () => {
    TabStore.activateTab(this.props.tab.id)
  }

  componentWillReceiveProps ({ tab, themeName }) {
    if (tab.flags.modified || !this.cm || !tab.content) return
    if (tab.content !== this.cm.getValue()) {
      this.cm.setValue(tab.content)
    }

    const nextTheme = themeName
    const theme = this.props.themeName
    if (theme !== nextTheme) this.cm.setOption('theme', nextTheme)
  }

  componentWillUnmount () {
    this.cm.off('change', this.onChange)
    this.cm.off('focus', this.onFocus)
    this.dispose()
    CodeMirror.off(this.cm.display.lineDiv, 'mousemove', this.mousemove)
    this.cm.off('mousedown', this.onClick)
  }

  render () {
    const { width, height } = this.props
    const divStyle = { width, height }
    return (
      <div ref={c => this.cmContainer = c} style={divStyle}
        className={cx({ 'git-blame-show': this.props.editor.gitBlame.show })}
      />
    )
  }
}


@inject(state => ({
  themeName: state.SettingState.settings.theme.syntax_theme.value,
}))
@observer
class TablessCodeMirrorEditor extends Component {
  constructor (props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    const { themeName, width, height } = this.props

    this.cm = initializeEditor(this.cmContainer, themeName)
    this.cm.focus()
    this.cm.on('change', this.onChange)
  }

  componentWillUnmount () {
    this.cm.off('change', this.onChange)
  }

  onChange = (e) => {
    TabStore.createTab({
      flags: { modified: true },
      tabGroup: {
        id: this.props.tabGroupId,
      },
      editor: {
        content: this.cm.getValue(),
        cm: this.cm,
      },
    })
  }

  componentWillReceiveProps ({ themeName }) {
    const nextTheme = themeName
    const theme = this.props.themeName
    if (theme !== nextTheme) this.cm.setOption('theme', nextTheme)
  }

  render () {
    return (
      <div ref={c => this.cmContainer = c} style={{ height: '100%', width: '100%' }} />
    )
  }
}

export default CodeMirrorEditor
export { TablessCodeMirrorEditor }
