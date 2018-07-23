export default {
  home: null,
  errors: {
    incompleteClasspath: {
      severity: 'ignore'
    }
  },
  configuration: {
    updateBuildConfiguration: 'automatic',
    maven: {
      userSettings: null
    }
  },
  trace: {
    server: 'verbose'
  },
  import: {
    gradle: {
      enabled: true
    },
    maven: {
      enabled: true
    },
    exclusions: [
      '**/node_modules/**',
      '**/.metadata/**',
      '**/archetype-resources/**',
      '**/META-INF/maven/**'
    ]
  },
  referencesCodeLens: {
    enabled: true
  },
  signatureHelp: {
    enabled: false
  },
  implementationsCodeLens: {
    enabled: false
  },
  format: {
    enabled: true,
    settings: {
      url: null,
      profile: null
    },
    comments: {
      enabled: true
    },
    onType: {
      enabled: true
    }
  },
  saveActions: {
    organizeImports: false
  },
  contentProvider: {
    preferred: null
  },
  autobuild: {
    enabled: true
  },
  completion: {
    overwrite: true,
    guessMethodArguments: false,
    favoriteStaticMembers: [
      'org.junit.Assert.*',
      'org.junit.Assume.*',
      'org.junit.jupiter.api.Assertions.*',
      'org.junit.jupiter.api.Assumptions.*',
      'org.junit.jupiter.api.DynamicContainer.*',
      'org.junit.jupiter.api.DynamicTest.*'
    ],
    importOrder: ['java', 'javax', 'com', 'org']
  },
  progressReports: {
    enabled: true
  }
}
