const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

let config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

const rnFeatureFlags = path.resolve(
  __dirname,
  "node_modules/react-native/src/private/featureflags/ReactNativeFeatureFlags.js"
);

const topicSubscriptionStub = path.resolve(
  __dirname,
  "services/notifications/TopicSubscriptionModule.stub.ts"
);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName ===
      "react-native/src/private/featureflags/ReactNativeFeatureFlags" ||
    (typeof moduleName === "string" &&
      moduleName.endsWith(
        "/src/private/featureflags/ReactNativeFeatureFlags"
      ))
  ) {
    return { filePath: rnFeatureFlags, type: "sourceFile" };
  }

  if (
    typeof moduleName === "string" &&
    moduleName.includes("TopicSubscriptionModule") &&
    !moduleName.includes("TopicSubscriptionModule.types") &&
    !moduleName.includes("stub")
  ) {
    return { filePath: topicSubscriptionStub, type: "sourceFile" };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config = withNativeWind(config, { input: "./global.css" });

const previousGetTransformOptions = config.transformer?.getTransformOptions;
config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, transformOptions, getDependenciesOf) => {
    const previous = previousGetTransformOptions
      ? await previousGetTransformOptions(
          entryPoints,
          transformOptions,
          getDependenciesOf
        )
      : {};
    return {
      ...previous,
      transform: {
        ...(previous.transform || {}),
        inlineRequires: true,
      },
    };
  },
};

module.exports = config;
