import { observable, computed } from 'mobx'
import _ from 'lodash'

const state = observable({
  projectResolve: [
    {
      type: 'blank',
      attributes: {},
      matched: true
    }
  ],
  estimated: true,
  selectedResolve: 'blank',
  get currentResolve () {
    if (this.estimated) {
      return _.find(this.projectResolve, { type: this.selectedResolve })
    }
    return this.projectResolve
  },
  get isJava () {
    return this.selectedResolve === 'javac' || this.selectedResolve === 'maven'
  },
  get mavenResolve () {
    if (this.estimated) {
      return _.find(this.projectResolve, { type: 'maven' })
    }
    return this.projectResolve
  },
  classpath: [],
  libs: [],
  sources: [],
})

export default state
