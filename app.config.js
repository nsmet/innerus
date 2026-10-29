// Build identity switch (decision D27).
// app.json holds the development defaults (`local.innerus.development`, "InnerUs Development").
// APP_VARIANT=production applies the live store identity carried over from the v1 app (old_app/kletskoppel-main):
// same bundle ID / package, same EAS project (and therefore the same stored signing credentials), production iCloud container.
const IS_PRODUCTION = process.env.APP_VARIANT === 'production';
// One version source (D49): package.json. Settings shows the same number. Must stay above v1's last release (1.5.0).
const { version: APP_VERSION } = require('./package.json');

const EAS_PROJECT_ID = '4f179d7a-0b62-43f8-8c69-7ed19449554b'; // v1 EAS project (slug "innerus")
const LIVE_ID = 'com.nicksmet.innerus';
const PLATFORM_PLUGIN = './modules/innerus-platform/app.plugin.js';
// Production builds use the Production CloudKit environment. Set INNERUS_CLOUDKIT_ENV=Development once, on a
// local production-identity build, to create the record types in the live container before deploying the
// schema to Production (docs/RELEASE_RUNBOOK.md, step 3). Never ship a Development-environment build.
const CLOUDKIT_ENV = process.env.INNERUS_CLOUDKIT_ENV === 'Development' ? 'Development' : 'Production';

module.exports = ({ config }) => {
  // The EAS project is registered under slug "innerus"; every variant uses it so EAS commands match the project.
  const base = { ...config, slug: 'innerus', version: APP_VERSION, extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } } };
  if (!IS_PRODUCTION) return base;

  return {
    ...base,
    name: 'InnerUs',
    // version comes from package.json (base); build numbers come from EAS (remote, auto-increment)
    scheme: 'innerus',
    ios: { ...config.ios, bundleIdentifier: LIVE_ID },
    android: { ...config.android, package: LIVE_ID },
    plugins: config.plugins.map(plugin => plugin === PLATFORM_PLUGIN
      ? [PLATFORM_PLUGIN, { cloudKitContainer: `iCloud.${LIVE_ID}`, cloudKitEnvironment: CLOUDKIT_ENV }]
      : plugin),
  };
};
