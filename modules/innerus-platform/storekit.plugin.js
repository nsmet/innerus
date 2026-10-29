// Local StoreKit testing configuration (development only). Owned by the purchases builder.
//
// During `expo prebuild` for iOS this plugin:
//   1. copies modules/innerus-platform/storekit/InnerUs.storekit to ios/InnerUs.storekit (beside the .xcodeproj), and
//   2. points the shared Run scheme at it (LaunchAction > StoreKitConfigurationFileReference),
// so a Debug run from Xcode uses Xcode's local StoreKit environment: the development product
// `local.innerus.development.collection` at EUR 19.99 in the Belgian storefront, no App Store Connect involved.
//
// Nothing here touches App Store Connect, live products or a release build's behaviour: the scheme option only
// applies when the app is launched from Xcode. Skip it with INNERUS_STOREKIT=0 (e.g. for a TestFlight/sandbox run).
//
// The scheme reference is resolved by Xcode relative to the .xcodeproj, so a file beside it is "../InnerUs.storekit".
// If Xcode ever reports "StoreKit Configuration file can't be found", pick ios/InnerUs.storekit once in
// Product > Scheme > Edit Scheme > Run > Options > StoreKit Configuration; the plugin keeps whatever path is present.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const FILE_NAME = 'InnerUs.storekit';
const SOURCE = path.join(__dirname, 'storekit', FILE_NAME);
const REFERENCE = `../${FILE_NAME}`;

function storeKitReference(indent) {
  return `${indent}<StoreKitConfigurationFileReference\n${indent}   identifier = "${REFERENCE}">\n${indent}</StoreKitConfigurationFileReference>\n`;
}

/** Adds (or keeps) the StoreKit configuration reference inside the scheme's LaunchAction. Pure, for easy checking. */
function addStoreKitToScheme(xml) {
  const launch = /<LaunchAction\b[\s\S]*?(<\/LaunchAction>|\/>)/.exec(xml);
  if (!launch) return xml;
  const block = launch[0];
  if (block.includes('<StoreKitConfigurationFileReference')) return xml; // already configured (by us or by hand)

  let updated;
  if (launch[1] === '/>') {
    // Self-closing <LaunchAction ... /> : open it up.
    const opening = block.slice(0, -2).trimEnd();
    updated = `${opening}>\n${storeKitReference('      ')}   </LaunchAction>`;
  } else {
    const closeAt = block.lastIndexOf('</LaunchAction>');
    const lineStart = block.lastIndexOf('\n', closeAt) + 1;
    const closingIndent = block.slice(lineStart, closeAt);
    updated = `${block.slice(0, lineStart)}${storeKitReference(`${closingIndent}   `)}${block.slice(lineStart)}`;
  }
  return xml.slice(0, launch.index) + updated + xml.slice(launch.index + block.length);
}

const withInnerUsStoreKit = config => {
  if (process.env.INNERUS_STOREKIT === '0') return config;
  return withDangerousMod(config, ['ios', async modConfig => {
    const iosRoot = modConfig.modRequest.platformProjectRoot;
    const projectName = modConfig.modRequest.projectName;
    if (!fs.existsSync(SOURCE) || !projectName) return modConfig;

    fs.copyFileSync(SOURCE, path.join(iosRoot, FILE_NAME));

    const scheme = path.join(iosRoot, `${projectName}.xcodeproj`, 'xcshareddata', 'xcschemes', `${projectName}.xcscheme`);
    if (fs.existsSync(scheme)) {
      const xml = fs.readFileSync(scheme, 'utf8');
      const next = addStoreKitToScheme(xml);
      if (next !== xml) fs.writeFileSync(scheme, next);
    }
    return modConfig;
  }]);
};

module.exports = withInnerUsStoreKit;
module.exports.addStoreKitToScheme = addStoreKitToScheme;
