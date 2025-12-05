const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for React Native InitializeCore resolution
// Add extra node modules to help Metro resolve React Native internal paths
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    'react-native': path.resolve(__dirname, 'node_modules', 'react-native'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // Handle react-native internal imports
    if (moduleName === 'react-native/Libraries/Core/InitializeCore') {
      const rnPath = path.resolve(__dirname, 'node_modules', 'react-native', 'Libraries', 'Core', 'InitializeCore.js');
      if (require('fs').existsSync(rnPath)) {
        return {
          filePath: rnPath,
          type: 'sourceFile',
        };
      }
    }
    // Use default resolution for other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

