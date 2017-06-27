import * as actions from './actions'
import state from './state'

class ProjectStore {
  constructor () {
    Object.assign(this, actions)
  }

  getState () { return state }
  
}

const store = new ProjectStore()
export default store
