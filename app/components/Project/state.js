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
  @computed get currentResolve () {
    if (this.estimated) {
      return _.find(this.projectResolve, { type: this.selectedResolve })
    }
    return this.projectResolve
  },
  @computed get isJava () {
    return this.selectedResolve === 'javac' || this.selectedResolve === 'maven'
  },
  classpath: [],
  libs: [],
  sources: [],
})

export default state
