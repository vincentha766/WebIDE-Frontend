var serverConfig = {
  URI_PREFIX: "/cs",
  BACKEND_URL: 'http://dev.coding.ide/backend',
  WS_URL: 'http://ide-ws.dev.coding.ide',
  STATIC_SERVING_URL: 'http://{space-key}-static-{access-token}.dev.coding.ide',
  HTML_BASE_URL: 'http://dev.coding.ide/backend',
  PACKAGE_DEV: false,
  CODING_URL: 'https://coding.net',
  HDD_ADJUST_ENABLE: true,
  WS_REG: 'ws',
  STATIC_PATH: 'rs2',
  WS_PATTERN: /^\/cs\/ws\/([^/]+)\/?$/,
  FAVICON_URL: "",
  LOGO_URL: ""
}

if (typeof module !== 'undefined') {
  module.exports = serverConfig
} else {
  window.serverConfig = serverConfig;
}
