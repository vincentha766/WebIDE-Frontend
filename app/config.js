import { observable, autorun, reaction, when } from 'mobx'
import getCookie from './utils/getCookie'
const localStorage = window.localStorage
const serverConfig = __DEV__ ? { HDD_ADJUST_ENABLE: true, CODING_URL: 'https://coding.net' } : window.serverConfig
const config = observable({
  projectName: '',
  spaceKey: '',
  mainLanguage: 'Blank',
  switchOldEditor: Boolean(JSON.parse(localStorage.getItem('switchOldEditor'))),
  isFullScreen: false,
  globalKey: '',
  userProfile: {},
  requiredExtensions: [],
  _WORKSPACE_SUB_FOLDER_: '/',
  _ROOT_URI_: '',
  langServerURL: serverConfig.WS_URL || getCookie('WS_URL') || __WS_URL__ || __BACKEND_URL__ || window.location.origin,
  baseURL: serverConfig.BACKEND_URL || getCookie('BACKEND_URL') || __BACKEND_URL__ || window.location.origin,
  packageDev: serverConfig.PACKAGE_DEV || getCookie('PACKAGE_DEV') || __PACKAGE_DEV__,
  packageServer: serverConfig.HTML_BASE_URL || getCookie('PACKAGE_SERVER') || __PACKAGE_SERVER__ || window.location.origin,
  wsURL: serverConfig.WS_URL || getCookie('WS_URL') || __WS_URL__ || __BACKEND_URL__ || window.location.origin,
  staticServingURL: serverConfig.STATIC_SERVING_URL || getCookie('STATIC_SERVING_URL') || __STATIC_SERVING_URL__ || window.location.origin,
  hddAdjustEnable: serverConfig.HDD_ADJUST_ENABLE,
  codingURL: serverConfig.CODING_URL,
  runMode: __RUN_MODE__,
  __WORKSPACE_URI__: '',
  // isPlatform: Boolean(__RUN_MODE__),
  fsSocketConnected: false,
  ttySocketConnected: false,
  fileExcludePatterns: ['/.git', '/.coding-ide'],
  supportLangServer: [
    { lang: 'java', files: ['pom.xml', 'settings.gradle'], file: 'pom.xml' },
    { lang: 'javascript', files: ['package.json'], file: 'package.json' },
    { lang: 'typescript', files: ['package.json'], file: 'package.json' },
  ],
  preventAccidentalClose: false,
  hasRehydrated: getCookie('skipRehydrate') || false,
  estimatedMap: observable.map({}),
  nodeEnv: __NODE_ENV__ || null,
  isDefault: false,
  willExpire: false,
  rehydrated: false,
  get previewURL () {
    if (config.staticServingToken && config.spaceKey && config.staticServingURL) {
      return config.staticServingURL.replace(
        '{space-key}', config.spaceKey
      ).replace(
        '{access-token}', config.staticServingToken
      )
    }
    return ''
  },
  get isLib () {
    return config.runMode === 'lib'
  },
  get isPlatform () {
    return Boolean(__RUN_MODE__) || config.runMode === 'lib'
  }
})

autorun(() => {
  if (config.projectName && !config.isLib) {
    window.document.title = `${(config.workspaceName && config.workspaceName !== 'default') ? config.workspaceName : config.projectName} | WebIDE`
  }
})

autorun(() => {
  if (config.spaceKey !== '' && config.spaceKey !== 'default') {
    config.__WORKSPACE_URI__ = `/data/coding-ide-home/workspace/${config.spaceKey}/working-dir`
    config._ROOT_URI_ = `/data/coding-ide-home/workspace/${config.spaceKey}/working-dir`
  }
})

window.config = config
export default config
