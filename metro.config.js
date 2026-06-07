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
    'react-native-webview': path.resolve(__dirname, 'node_modules', 'react-native-webview'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // react-native-screens@4.16.0 src entry imports ./_components/* which is not shipped;
    // force Metro to use the compiled lib build instead.
    if (moduleName === 'react-native-screens') {
      const screensEntry = path.resolve(
        __dirname,
        'node_modules',
        'react-native-screens',
        'lib',
        'commonjs',
        'index.js',
      );
      if (require('fs').existsSync(screensEntry)) {
        return {
          filePath: screensEntry,
          type: 'sourceFile',
        };
      }
    }

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
    // Fall back to Metro's default resolver (avoid recursive custom handler)
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      moduleName,
      platform
    );
  },
};

module.exports = config;

