const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// حل مسار @/ ليتوافق مع tsconfig (Metro لا يقرأ paths تلقائياً في بعض الإصدارات)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const newPath = path.join(
      __dirname,
      moduleName.replace(/^@\//, "./")
    );
    return context.resolveRequest(context, newPath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
