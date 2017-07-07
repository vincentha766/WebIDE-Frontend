import React, { Component, PropTypes } from 'react'
import { observable, computed } from 'mobx'
import { observer } from 'mobx-react'
import { bindActionCreators } from 'redux'
import cx from 'classnames'
import { connect } from 'react-redux'
import { dispatchCommand } from '../../../commands'
import * as ProjectActions from '../actions'
import ProjectState from '../state'
import * as Modal from '../../Modal/actions'
import trim from 'lodash/trim'

const typeOptions = [
  {
    name: 'Blank',
    value: 'blank',
  },
  {
    name: 'Java',
    value: 'javac',
  }
]

@observer
class ProjectConfig extends Component {
  static propTypes = {
    putProjectType: PropTypes.func.isRequired,
  }

  constructor (props) {
    super(props)
    const { currentResolve, selectedResolve } = ProjectState
    const sourceFolder = currentResolve.attributes['java.source.folder']
    const libraryFolder = currentResolve.attributes['java.library.folder']

    this.state = observable({
      sourceFolder: (
        sourceFolder ? sourceFolder.join(',') : ''
      ),
      libraryFolder: (
         libraryFolder ? libraryFolder.join(',') : ''
      ),
      type: selectedResolve,
      resolve: currentResolve,
      loading: false,
    })
    this.handleOptionChange = this.handleOptionChange.bind(this)
    this.handleSourceChange = this.handleSourceChange.bind(this)
    this.handleLibraryChange = this.handleLibraryChange.bind(this)
    this.handleConfirm = this.handleConfirm.bind(this)
    this.handleSelectSource = this.handleSelectSource.bind(this)
    this.handleSelectLib = this.handleSelectLib.bind(this)
  }

  handleOptionChange (e) {
    this.state.type = e.target.value
  }

  handleSourceChange (e) {
    this.state.sourceFolder = e.target.value
  }

  handleLibraryChange (e) {
    this.state.libraryFolder = e.target.value
  }

  handleConfirm (e) {
    this.state.loading = true
    const projectConfigDto = {
      type: this.state.type
    }
    if (this.state.type === 'blank') {
      projectConfigDto.attributes = {
        'java.source.folder': [],
        'java.library.folder': [],
      }
    } else {
      projectConfigDto.attributes = {
        'java.source.folder': this.state.sourceFolder.split(','),
        'java.library.folder': this.state.libraryFolder.split(','),
      }
    }

    this.props.putProjectType(projectConfigDto)
  }

  handleSelectSource (e) {
    this.props.addModal('FileSelectorView', {
      title: 'Select a folder',
      onlyDir: true,
    }).then((node) => {
      if (!node) return
      const path = trim(node.path, '/')
      this.state.sourceFolder = path
      dispatchCommand('modal:dismiss')
    })
  }

  handleSelectLib (e) {
    this.props.addModal('FileSelectorView', {
      title: 'Select a folder',
      onlyDir: true,
    }).then((node) => {
      if (!node) return
      const path = trim(node.path, '/')
      this.state.libraryFolder = path
      dispatchCommand('modal:dismiss')
    })
  }

  render () {
    return (
      <div className='project-config-container'>
        <h2>
          Project Configurations
        </h2>
        <div className='form-group'>
          <label>Project Type</label>
          <select className='form-control'
            onChange={this.handleOptionChange}
            value={this.state.type}
          >
            {typeOptions.map(option =>
              <option key={option.value} value={option.value}>{option.name}</option>
            )}
          </select>
        </div>
        {
          this.state.type !== 'blank' && (
            <div>
              <div className='form-group'>
                <label>Source Folder</label>
                <div className='form-line'>
                  <input className='form-control'
                    type='text'
                    onChange={this.handleSourceChange}
                    placeholder='e.g. src/main/java'
                    value={this.state.sourceFolder}
                  />
                  <i className='fa fa-folder-o' onClick={this.handleSelectSource} />
                </div>
              </div>
              <div className='form-group'>
                <label>Library Folder</label>
                <div className='form-line'>
                  <input className='form-control'
                    type='text'
                    onChange={this.handleLibraryChange}
                    value={this.state.libraryFolder}
                  />
                  <i className='fa fa-folder-o' onClick={this.handleSelectLib} />
                </div>
              </div>
            </div>
          )
        }
        <div className="modal-ops settings-content-controls">
          <button className="btn btn-default" onClick={e => dispatchCommand('modal:dismiss')} >Cancel</button>
          <button className="btn btn-primary"
            onClick={this.handleConfirm}
            disabled={this.state.loading}
          >Commit</button>
        </div>
      </div>
    )
  }
}

export default ProjectConfig = connect(
  state => state,
  dispatch => ({ ...bindActionCreators(ProjectActions, dispatch), ...Modal })
)(ProjectConfig)
