import React, { Component, PropTypes } from 'react'
import { observable, computed, action } from 'mobx'
import { observer } from 'mobx-react'
import { bindActionCreators } from 'redux'
import cx from 'classnames'
import { connect } from 'react-redux'
import endsWith from 'lodash/endsWith'
import trimEnd from 'lodash/trimEnd'
import { dispatchCommand } from '../../../commands'
import * as ProjectActions from '../actions'
import ProjectState from '../state'
// import { dismissModal } from '../../Modal/actions'
import { CLASSPATH_TYPE } from '../constant'
const { CPE_LIBRARY, CPE_PROJECT, CPE_SOURCE, CPE_VARIABLE, CPE_CONTAINER } = CLASSPATH_TYPE
import * as Modal from '../../Modal/actions'
import config from '../../../config'

const LibrariesSetting = observer(({ data, onLibClick, onRemoveJAR, onAddJAR }) => {
  return (
    <div className='domain'>
      <h2 className='settings-content-header'>Libraries Setting</h2>
      <div className='form-horizontal'>
        <div className='form-group'>
          <div className='col-left'>
            <div className='lib-list'>
              <ul className='lib-folder'>
                {
                  data.map((lib, i) => {
                    if (lib.entryKind === CPE_CONTAINER) {
                      return (
                        <li
                          key={i}
                          className='lib-folder-item'
                        > 
                          <div onClick={e => {
                            e.preventDefault()
                            onLibClick(i)
                          }}>
                            <div className={cx('tree-view-arrow', 'tree-view-arrow-collapsed': lib.collapsed)}>▾</div>
                            <i className='fa fa-book' />
                            { lib.path }
                          </div>
                          {!lib.collapsed && (
                            <div className='lib-file-list'>
                              {lib.expandedEntries.map((entry, entryIndex) => {
                                const lastIndex = entry.path.lastIndexOf('/')
                                const entryName = entry.path.substring(lastIndex + 1)
                                const entryPath = entry.path.substring(0, lastIndex)
                                return (
                                  <div key={entryIndex} className='lib-file-item'>
                                    <i className='fa fa-archive' />
                                    {entryName}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </li>
                      )
                    } else if (lib.entryKind === CPE_LIBRARY) {
                      const lastIndex = lib.path.lastIndexOf('/')
                      const entryName = lib.path.substring(lastIndex + 1)
                      const entryPath = lib.path.substring(0, lastIndex)
                      return (
                        <li
                          key={i}
                          className='lib-folder-item'
                        >
                          <div className='lib-file-item'>
                            <div className={cx('tree-view-arrow-placeholder')}></div>
                            <i className='fa fa-minus-square' onClick={e => {
                              e.preventDefault()
                              onRemoveJAR(i)
                            }} />
                            <i className='fa fa-archive' />
                            { entryName }
                            <span className='lib-file-path'>
                              {` - ${entryPath}`}
                            </span>
                          </div>
                        </li>
                      )
                    }
                  })
                }
              </ul>
            </div>
          </div>
          <div className='col-right'>
            <button className="btn btn-default" onClick={onAddJAR} >Add JAR</button>
          </div>
        </div>
      </div>
    </div>
  )
})

LibrariesSetting.propTypes = {
  data: PropTypes.object.isRequired,
  onLibClick: PropTypes.func.isRequired,
  onRemoveJAR: PropTypes.func.isRequired,
  onAddJAR: PropTypes.func.isRequired,
}

const SourceSetting = observer(({ data, onRemoveFolder, onAddFolder }) => {
  return (
    <div className='domain'>
      <h2 className='settings-content-header'>Source Setting</h2>
      <div className='form-horizontal'>
        <div className='form-group'>
          <div className='col-left'>
            <div className='lib-list'>
              <ul className='lib-folder'>
                {
                  data.map((source, i) => {
                    return (
                      <li key={i} className='lib-source-item'>
                        <div className='tree-view-arrow-placeholder'></div>
                        <i className='fa fa-minus-square' onClick={e => onRemoveFolder(i)} />
                        <i className='fa fa-folder' />
                        {source.path}
                      </li>
                    )
                  })
                }
              </ul>
            </div>
          </div>
          <div className='col-right'>
            <button className="btn btn-default" onClick={onAddFolder} >Add Folder</button>
          </div>
        </div>
      </div>
    </div>
  )
})

const DomainSetting = observer(({ data, domainKey, onLibClick, onRemoveJAR, onRemoveFolder, onAddJAR, onAddFolder }) => {
  switch (domainKey) {
    case 'LIBRARIES':
    default:
      return <LibrariesSetting data={data} onLibClick={onLibClick} onRemoveJAR={onRemoveJAR} onAddJAR={onAddJAR} />
    case 'SOURCE':
      return <SourceSetting data={data} onRemoveFolder={onRemoveFolder} onAddFolder={onAddFolder} />
  }
})

@observer
class ClasspathConfig extends Component {
  static propTypes = {
    postClasspath: PropTypes.func.isRequired,
  }

  constructor (props) {
    super(props)

    this.state = observable({
      loading: false,
      collapsed: false,
      classpath: ProjectState.classpath,
      libs: ProjectState.libs,
      sources: ProjectState.sources,
      activeTabId: 'LIBRARIES',
      tabIds: ['LIBRARIES', 'SOURCE'],
      activateTab: action((tabId) => {
        this.state.activeTabId = tabId
      }),
      get activeTab () {
        switch (this.activeTabId) {
          case 'LIBRARIES':
          default:
            return this.libs
          case 'SOURCE':
            return this.sources
        }
      }
    })

    this.onConfirm = this.onConfirm.bind(this)
    this.onLibClick = this.onLibClick.bind(this)
    this.onRemoveJAR = this.onRemoveJAR.bind(this)
    this.onRemoveFolder = this.onRemoveFolder.bind(this)
    this.onAddJAR = this.onAddJAR.bind(this)
    this.onAddFolder = this.onAddFolder.bind(this)
  }

  onConfirm () {
    this.state.loading = true
    const result = this.state.libs.concat(this.state.sources)
    this.props.postClasspath(result)
  }

  onLibClick (index) {
    this.state.libs[index].collapsed = !this.state.libs[index].collapsed
  }

  onRemoveJAR (index) {
    this.state.libs.splice(index, 1)
  }

  onRemoveFolder (index) {
    this.state.sources.splice(index, 1)
  }

  onAddJAR () {
    this.props.addModal('FileSelectorView', {
      title: 'Select a JAR file',
      onlyDir: false,
    }).then((node) => {
      if (!node) return
      const { path } = node
      if (!node.isDir && endsWith(path, '.jar')) {
        const entry = {
          entryKind: CPE_LIBRARY,
          expandedEntries: [],
          path: `/projects/${config.spaceKey}${path}`,
        }
        const existEntry = this.state.libs.filter(lib => lib.path === entry.path)
        if (existEntry.length === 0) {
          this.state.libs.push(entry)
        }
        dispatchCommand('modal:dismiss')
      }
    })
  }

  onAddFolder () {
    this.props.addModal('FileSelectorView', {
      title: 'Select a folder',
      onlyDir: true,
    }).then((node) => {
      if (!node) return
      const path = trimEnd(node.path, '/')
      if (node.isDir) {
        const entry = {
          entryKind: CPE_SOURCE,
          expandedEntries: [],
          path: `/${config.spaceKey}${path}`,
        }
        const existEntry = this.state.sources.filter(source => source.path === entry.path)
        if (existEntry.length === 0) {
          this.state.sources.push(entry)
        }
        dispatchCommand('modal:dismiss')
      }
    })
  }

  render () {
    const { tabIds, activateTab, activeTabId, activeTab } = this.state
    return (
      <div className='settings-view classpath-setting'>
        <div className="settings-container">
          <div className="settings-header">
            <div className="tab-bar-header">Configure Classpath</div>
            <ul className="tab-bar-tabs">
              {tabIds.map(tabId =>
                <li key={tabId}
                  className={cx('tab-bar-item', { active: tabId === activeTabId })}
                  onClick={e => activateTab(tabId)}
                >{tabId}</li>
              )}
            </ul>
          </div>
          <div className="settings-content" >
            <div className="settings-content-container">
              <DomainSetting data={activeTab} domainKey={activeTabId} onLibClick={this.onLibClick} onRemoveJAR={this.onRemoveJAR} onRemoveFolder={this.onRemoveFolder} onAddJAR={this.onAddJAR} onAddFolder={this.onAddFolder} />
            </div>
            <div className="modal-ops settings-content-controls">
              <button className="btn btn-default" onClick={e => dispatchCommand('modal:dismiss')} >Cancel</button>
              <button className="btn btn-primary"
                onClick={this.onConfirm}
                disabled={this.state.loading}
              >Commit</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ClasspathConfig = connect(
  state => state,
  dispatch => ({ ...bindActionCreators(ProjectActions, dispatch), ...Modal })
)(ClasspathConfig)
