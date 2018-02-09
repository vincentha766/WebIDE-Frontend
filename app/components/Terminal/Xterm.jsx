import React, { Component } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/dist/xterm.css'
Terminal.applyAddon(fit)

import _ from 'lodash'
import { emitter, E, isAppleDevice, calcHeight } from 'utils'

import TerminalManager from './terminal-client'
import * as TabActions from 'components/Tab/actions'
import SettingState from 'components/Setting/state'
import TerminalState from './state'
import keycodes from '../../commands/lib/keycodes'

const DARK_THEME = {
  foreground: '#FFF',
  background: '#000',
  cursor: '#FFF',
  cursorAccent: '#000',
  selection: 'rgba(255, 255, 255, 0.3)',
}

const BRIGHT_THEME = {
  foreground: '#000',
  background: '#FFF',
  cursor: '#000',
  cursorAccent: '#FFF',
  selection: 'rgba(0, 0, 0, 0.3)',
}

class Term extends Component {
  constructor (props) {
    super(props)
    this.handleKey = this.handleKey.bind(this)
    this.handleKeyboard = this.handleKeyboard.bind(this)
    this.handleKeyCode = this.handleKeyCode.bind(this)
    this.handleFocusout = this.handleFocusout.bind(this)
    this.handleFocusin = this.handleFocusin.bind(this)

    this.state = {
      ctrlKey: false,
      altKey: false,
      innerHeight: 0,
      showKeyboard: false,
      containerHeight: '100%',
    }
  }

  componentDidMount () {
    const _this = this
    _this.props.tab.title = 'Shell'
    const terminalManager = new TerminalManager()
    TerminalState.terminalManager = terminalManager
    const uiTheme = SettingState.settings.appearance.ui_theme.value
    let theme = BRIGHT_THEME
    if (uiTheme === 'dark') {
      theme = DARK_THEME
    }

    const terminal = this.terminal = new Terminal({
      fontSize: 12,
      // theme: themeName,
      cols: 80,
      rows: 24,
      // fontFamily: 'Menlo, Monaco, "DejaVu Sans Mono", Consolas, "Andale Mono", monospace;',
    })

    terminal.attachCustomKeyEventHandler((e) => {
      // console.log('e', e)
      if (229 === e.keyCode && (this.state.ctrlKey || this.state.altKey)) {
        return false
      }
      if (e.keyCode === 66 && e.altKey) {
        terminalManager.getSocket().emit('term.input', { id: terminal.id, input: '\u001bb' }) // x1bb
        return false
      } else if (e.keyCode === 70 && e.altKey) {
        terminalManager.getSocket().emit('term.input', { id: terminal.id, input: '\u001bf' }) // x1bf
        return false
      } else if (e.keyCode === 68 && e.altKey) {
        terminalManager.getSocket().emit('term.input', { id: terminal.id, input: '\u001bd' })
        return false
      } else if (e.keyCode === 8 && e.altKey) {
        terminalManager.getSocket().emit('term.input', { id: terminal.id, input: '\x1b' + '\x7f' })
        return false
      }
      if (e.keyCode === 8747 || e.keyCode === 402 || e.keyCode === 8706) {
        return false
      }
      // return true
      if (e.fake) {
        return true
      } else {
        this.handleKeyboard(e)
        return false
      }
    })

    terminal.setOption('theme', theme)

    terminalManager.setActions(TabActions)
    terminal.tabId = this.props.tab.id
    this.props.tab.terminal = terminal
    terminal.open(this.termDOM)
    terminal.fit()
    terminal.id = this.sessionId = _.uniqueId('term_')
    terminalManager.add(terminal)
    terminal.on('resize', ({ cols, rows }) => {
      terminalManager.resize(terminal, cols, rows)
    })
    emitter.on(E.PANEL_RESIZED, this.onResize.bind(this))
    emitter.on(E.THEME_CHANGED, this.onTheme.bind(this))

    terminal.on('data', (data) => {
      terminalManager.getSocket().emit('term.input', { id: terminal.id, input: data })
    })
    terminal.on('title', _.debounce((title) => {
      _this.props.tab.title = title
    }, 300))
    this.props.tab.onActive = this.onActive


    this.termDOM.getElementsByClassName('xterm-helper-textarea')[0].addEventListener('textInput', (e) => {
      // console.log('e', e)
      // console.log('keyCode', keyCode)
      this.handleKeyCode(e.data)
      return false
    }, false)
    this.state.innerHeight = window.innerHeight
    console.log('isAppleDevice', isAppleDevice)

    if (isAppleDevice) {
      // document.addEventListener('focusout', this.handleFocusout)
      // document.addEventListener('focusin', this.handleFocusin)
      document.addEventListener('keyboardshow', this.handleKeyboard)
    }
  }

  componentWillUnmount () {
    emitter.removeListener(E.PANEL_RESIZED, this.onResize)
    emitter.removeListener(E.THEME_CHANGED, this.onTheme)
    TerminalState.terminalManager.remove(this.terminal)
    // document.removeEventListener('focusout', this.handleFocusout)
    // document.removeEventListener('focusin', this.handleFocusin)
    document.removeEventListener('keyboardshow', this.handleKeyboard)
  }

  render () {
    const { tab } = this.props
    return (
      <div className='ide-terminal'>
        <div className={cx('terminal-container', {
          showKeyboard: this.state.showKeyboard
        })} style={{
          height: this.state.containerHeight
        }}
        >
          <div className='terminal-body' data-droppable='TERMINAL' ref={r => this.termDOM = r}></div>
          <div className='keyboards'>
            <button className='' onClick={() => this.handleKey('Escape')}>esc</button>
            <button className={cx({
              active: this.state.ctrlKey
            })} onClick={() => this.handleKey('Control')}
            >
            ctrl</button>
            <button className={cx({
              active: this.state.altKey
            })} onClick={() => this.handleKey('Alt')}
            >
            alt</button>
            <button className='' onClick={() => this.handleKey('ArrowUp')}>▲</button>
            <button className='' onClick={() => this.handleKey('ArrowDown')}>▼</button>
            <button className='' onClick={() => this.handleKey('ArrowLeft')}>◀</button>
            <button className='' onClick={() => this.handleKey('ArrowRight')}>▶</button>
          </div>
        </div>
      </div>
    )
  }

  onResize () {
    // console.log('onResize')
    const bottom = this.termDOM.getBoundingClientRect().bottom
    // console.log('window.innerHeight2', window.innerHeight)
    // console.log('bottom', bottom)

    if (!isAppleDevice) {
      // android
      if (window.innerHeight < this.state.innerHeight) {
        this.setState({
          showKeyboard: true
        })
      } else {
        this.setState({
          showKeyboard: false
        })
      }
      if (this.termDOM && this.termDOM.clientHeight > 0 && this.termDOM.clientWidth > 0) {
        this.terminal.fit()
      }
    }
  }

  onActive () {
    setTimeout(() => {
      this.terminal.fit()
    })
  }

  onTheme (nextThemeId) {
    let theme = BRIGHT_THEME
    if (nextThemeId === 'dark') {
      theme = DARK_THEME
    }
    this.terminal.setOption('theme', theme)
  }

  handleKeyCode (key) {
    const keyCode = keycodes.keyToKeyCode[key]
    const e = new Event('keydown')
    e.keyCode = keyCode
    e.key = key
    e.code = 'KeyQ'
    e.charCode = 0
    e.which = keyCode
    e.altKey = false
    e.ctrlKey = false
    e.shiftKey = false
    e.metaKey = false
    e.location = 0
    // e.altKey = this.state.altKey // || keyboradEvent.altKey
    // e.ctrlKey = this.state.ctrlKey // || keyboradEvent.ctrlKey
    // e.shiftKey = keyboradEvent.shiftKey
    // e.metaKey = keyboradEvent.metaKey
    // e.location = keyboradEvent.location
    // e.fake = true
    // this.termDOM.getElementsByClassName('xterm-helper-textarea')[0].dispatchEvent(e)
    // this.terminal.focus()
    this.handleKeyboard(e)
  }

  handleKey (key) {
    // console.log('handleKey')
    const e = new Event('keydown')
    switch (key) {
      case 'Escape':
        e.key = 'Escape'
        e.code = e.key
        e.charCode = 0
        e.keyCode = 27
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        break
      case 'Control':
        e.key = 'ControlLeft'
        e.code = 'Control'
        e.charCode = 0
        e.keyCode = 17
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = true
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        this.setState({
          ctrlKey: !this.state.ctrlKey,
        })
        break
      case 'Alt':
        e.key = 'ControlLeft'
        e.code = 'Control'
        e.charCode = 0
        e.keyCode = 17
        e.which = e.keyCode
        e.altKey = true
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        this.setState({
          altKey: !this.state.altKey,
        })
        break
      case 'ArrowLeft':
        e.key = 'ArrowLeft'
        e.code = e.key
        e.charCode = 0
        e.keyCode = 37
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        break
      case 'ArrowRight':
        e.key = 'ArrowRight'
        e.code = e.key
        e.charCode = 0
        e.keyCode = 39
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        break
      case 'ArrowUp':
        e.key = 'ArrowUp'
        e.code = e.key
        e.charCode = 0
        e.keyCode = 38
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        break
      case 'ArrowDown':
        e.key = 'ArrowDown'
        e.code = e.key
        e.charCode = 0
        e.keyCode = 40
        e.which = e.keyCode
        e.altKey = false
        e.ctrlKey = false
        e.shiftKey = false
        e.metaKey = false
        e.location = 0
        break
      default:
        break
    }
    
    // e.bubbles = true
    this.termDOM.getElementsByClassName('xterm-helper-textarea')[0].dispatchEvent(e)
    this.terminal.focus()
  }

  handleKeyboard (keyboradEvent) {
    if (keyboradEvent.type === 'keypress') {
      if (keyboradEvent.keyCode === 13) {
        return
      }
      if (this.state.ctrlKey || this.state.altKey) {
        this.setState({
          ctrlKey: false,
          altKey: false,
        })
        return
      }
    }
    const e = new Event(keyboradEvent.type)
    e.key = keyboradEvent.key
    e.code = keyboradEvent.code
    e.charCode = keyboradEvent.charCode
    e.keyCode = keyboradEvent.keyCode
    e.which = keyboradEvent.which
    e.altKey = this.state.altKey || keyboradEvent.altKey
    e.ctrlKey = this.state.ctrlKey || keyboradEvent.ctrlKey
    e.shiftKey = keyboradEvent.shiftKey
    e.metaKey = keyboradEvent.metaKey
    e.location = keyboradEvent.location
    e.fake = true
    this.termDOM.getElementsByClassName('xterm-helper-textarea')[0].dispatchEvent(e)
    this.terminal.focus()
  }

  handleFocusin () {
    this.setState({
      showKeyboard: true,
      containerHeight: `${calcHeight()}px`
    })
    setTimeout(() => {
      this.terminal.fit()
    }, 0)
  }

  handleFocusout () {
    // this.setState({
    //   showKeyboard: false,
    //   containerHeight: '100%'
    // })
    // setTimeout(() => {
    //   this.terminal.fit()
    // }, 0)
  }
}

export default Term
