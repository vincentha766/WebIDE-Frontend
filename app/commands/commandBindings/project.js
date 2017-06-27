import store, { dispatch as $d } from '../../store'
import api from '../../backendAPI'
import * as Project from '../../components/Project/actions'
import * as Modal from '../../components/Modal/actions'

export default {
  'project:config': (c) => {
    Modal.showModal('ProjectConfig')
  },
  'project:config_classpath': (c) => {
    $d(Project.fetchClasspath()).then(() =>
      Modal.showModal('ClasspathConfig')
    )
  }
}
