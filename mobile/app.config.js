const appJson = require('./app.json');

/**
 * يحقن EAS projectId من البيئة أو app.json.
 * Project: @rawan.alshatri/awqaf-dar
 */
module.exports = () => {
  const fromEnv =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
    process.env.EAS_PROJECT_ID?.trim();
  const fromAppJson = appJson.expo?.extra?.eas?.projectId?.trim();
  const projectId = fromEnv || fromAppJson || undefined;

  return {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      eas: {
        ...(appJson.expo.extra?.eas ?? {}),
        ...(projectId ? { projectId } : {}),
      },
    },
  };
};
