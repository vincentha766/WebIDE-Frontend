import git from './git'
import file from './file'
import misc from './misc'
import editor from './editor'
import tab from './tab'
import project from './project'

export default {
  ...git,
  ...file,
  ...misc,
  ...editor,
  ...tab,
  ...project,
}
