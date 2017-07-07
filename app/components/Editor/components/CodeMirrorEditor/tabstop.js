class TemplateState {
  constructor () {
    this.marked = []
    this.selectableMarkers = []
    this.varIndex = -1
  }
}

class TabstopManager {
  constructor (cm, options) {
    this.options = options
    this.ourMap = {
      Tab: this.tabNext,
      'Shift-Tab': this.tabPrev,
      Enter: this.tabNext,
      Esc: this.detach,
    }

    this.attach(cm)
  }

  attach = (cm) => {
    this.index = 0
    this.ranges = []
    this.tabstops = []
    this.openTabstops = null
    this.selectedTabstop = null
    this.cm = cm
    cm.on('change', this.onChange)
    cm.on('cursorActivity', this.onCursorActivity)
    cm.addKeyMap(this.ourMap)
  }

  detach = () => {
    this.cm.off('change', this.onChange)
    this.cm.off('cursorActivity', this.onCursorActivity)
    this.cm.removeKeyMap(this.ourMap)
    this.removeTabstopMarkers()
    delete this.cm._templateState
    this.cm.execCommand('singleSelection')
  }

  tabNext = (cm, dir) => {
    const max = this.tabstops.length
    let index = this.index + (dir || 1)
    index = Math.min(Math.max(index, 1), max)
    if (index === max) index = 0
    this.selectTabstop(index)
    if (index === 0) this.detach()
  }

  tabPrev = (cm, dir = 1) => {
    this.tabNext(cm, 0 - dir)
  }

  selectTabstop = (index) => {
    this.openTabstops = null
    let ts = this.tabstops[this.index]
    if (ts) this.addTabstopMarkers(ts)
    this.index = index
    ts = this.tabstops[this.index]
    if (!ts || !ts.length) return
    this.selectedTabstop = ts
    for (let i = ts.length; i--;) {
      if (ts.hasLinkedRanges && ts[i].linked) {
        continue
      }
      if (i === (ts.length - 1)) {
        this.cm.setSelection(ts[i].anchor, ts[i].head)
      } else {
        this.cm.addSelection(ts[i].anchor, ts[i].head)
      }
    }
  }

  comparePoints = (p1, p2) => (
    p1.line - p2.line || p1.ch - p2.ch
  )

  removeRange = (range) => {
    let i = range.tabstop.indexOf(range)
    range.tabstop.splice(i, 1)
    i = this.ranges.splice(i, 1)
    this.ranges.splice(i, 1)
    range.markerId.clear()
    if (!range.tabstop.length) {
      i = this.tabstops.indexOf(range.tabstop)
      if (i !== -1) {
        this.tabstops.splice(i, 1)
      }
      if (!this.tabstops.length) {
        this.detach()
      }
    }
  }

  onChange = (cm, textChanged) => {
    const { from, to, text, removed } = textChanged
    const lineDiff = to.line - from.line
    let chDiff = 0

    if (textChanged.origin === '+input' || textChanged.origin === '+delete') {
      chDiff = text[0].length - removed[0].length
    }
    // if (textChanged.origin === '+delete') {
    //   console.log('to', to, typeof to)
    //   if (!this.rangeContains(this.ranges, [{
    //     anchor: to,
    //     head: to
    //   }])) {
    //     this.detach()
    //   }
    // }

    const ranges = this.ranges
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i]
      if (r.head.line < from.line) {
        continue
      }
      if (textChanged.origin === '+delete' && this.comparePoints(from, r.anchor) < 0 && this.comparePoints(to, r.head) > 0) {
        this.removeRange(r)
        i--
        continue
      }

      if (r.anchor.line === from.line && r.anchor.ch > from.ch) {
        r.anchor.ch += chDiff
      }
      if (r.head.line === from.line && r.head.ch >= from.ch) {
        r.head.ch += chDiff
      }
      if (r.anchor.line >= from.line) {
        r.anchor.line += lineDiff
      }
      if (r.head.line >= from.line) {
        r.head.line += lineDiff
      }

      if (this.comparePoints(r.anchor, r.head) > 0) {
        this.removeRange(r)
      }
    }
    if (!ranges.length) {
      this.detach()
    }
  }

  onCursorActivity = (cm) => {
    const cursor = cm.getCursor()
    // const offset = cm.indexFromPos(cursor)
    const selections = cm.listSelections()
    // for (let i = this.ranges.length; i--;) {
    //   if (this.ranges[i].linked) {
    //     continue
    //   }
    //   console.log('this.ranges[i]', this.ranges[i])
    // }
    const rangeContains = this.rangeContains(this.ranges, selections)
    if (!rangeContains) this.detach()
  }

  rangeContains = (ranges, selections) => {
    let contains = false
    selections.forEach((selection) => {
      ranges.forEach((range) => {
        if (!range.linked && (range.anchor.line <= selection.anchor.line && range.anchor.ch <= selection.anchor.ch && range.head.line >= selection.head.line && range.head.ch >= selection.head.ch)) {
          contains = true
        }
      })
    })
    return contains
  }

  addTabstops = (tabstops, start, end) => {
    // if (this.cm._templateState) {
      // this.detach(this.cm)
    // }
    const state = new TemplateState()
    this.cm._templateState = state

    if (!this.openTabstops) {
      this.openTabstops = []
    }

    if (!tabstops[0]) {
      const p = end
      this.moveRelative(p.anchor, start)
      this.moveRelative(p.head, start)
      tabstops[0] = [p]
      tabstops[0].index = 0
    }

    const i = this.index
    const arg = [i + 1, 0]
    const ranges = this.ranges
    tabstops.forEach((ts, index) => {
      const dest = this.openTabstops[index] || ts
      for (let j = ts.length; j--;) {
        const p = ts[j]
        const range = {
          anchor: p.anchor,
          head: p.head,
        }
        this.movePoint(range.anchor, start)
        this.movePoint(range.head, start)

        range.original = p
        range.tabstop = dest
        ranges.push(range)
        if (dest !== ts) {
          dest.unshift(range)
        } else {
          dest[j] = range
        }
        if (p.fmtString) {
          range.linked = true
          dest.hasLinkedRanges = true
        } else if (!dest.firstNonLinked) {
          dest.firstNonLinked = range
        }
      }
      if (!dest.firstNonLinked) {
        dest.hasLinkedRanges = false
      }
      if (dest === ts) {
        arg.push(dest)
        this.openTabstops[index] = dest
      }
      this.addTabstopMarkers(dest)
    }, this)

    if (arg.length > 2) {
      if (this.tabstops.length) {
        arg.push(arg.splice(2, 1)[0])
      }
      // this.tabstops.splice.apply(this.tabstops, arg)
      this.tabstops.splice(...arg)
    }
  }

  movePoint = (point, diff) => {
    if (point.line === 0) {
      point.ch += diff.ch
    }
    point.line += diff.line
  }

  moveRelative = (point, start) => {
    if (point.line === start.line) {
      point.ch -= start.ch
    }
    point.line -= start.line
  }

  addTabstopMarkers = (ts) => {
    ts.forEach((range) => {
      const markText = this.cm.markText(range.anchor, range.head, {
        className: 'CodeMirror-templates-variable',
        startStyle: 'CodeMirror-templates-variable-start',
        endStyle: 'CodeMirror-templates-variable-end',
        inclusiveLeft: true,
        inclusiveRight: true,
        clearWhenEmpty: false,  // Works in CodeMirror 4.6
        // _templateVar: marker.variable
      })
      range.markerId = markText
      this.cm._templateState.marked.push(markText)
    }, this)
  }

  removeTabstopMarkers = () => {
    for (let i = 0; i < this.cm._templateState.marked.length; i++) {
      this.cm._templateState.marked[i].clear()
    }
  }
}

export default TabstopManager
