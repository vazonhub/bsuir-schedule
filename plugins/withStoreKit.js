const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const STOREKIT_FILENAME = 'StoreKit.storekit';

const STOREKIT_CONTENT = JSON.stringify(
  {
    identifier: 'BsuirTime StoreKit',
    type: 'local',
    version: 3,
    products: [
      {
        displayPrice: '0.99',
        familyShareable: false,
        internalID: 'tip_small_001',
        localizations: [
          {
            description: 'Buy a cup of coffee for the developer',
            displayName: 'Small Tip',
            locale: 'en_US',
          },
        ],
        productID: 'by.vazon.bsuirtime.tip.small',
        referenceName: 'Small Tip',
        type: 'Consumable',
      },
      {
        displayPrice: '2.99',
        familyShareable: false,
        internalID: 'tip_medium_001',
        localizations: [
          {
            description: 'Support the development',
            displayName: 'Medium Tip',
            locale: 'en_US',
          },
        ],
        productID: 'by.vazon.bsuirtime.tip.medium',
        referenceName: 'Medium Tip',
        type: 'Consumable',
      },
      {
        displayPrice: '4.99',
        familyShareable: false,
        internalID: 'tip_large_001',
        localizations: [
          {
            description: 'Fuel a full night of coding',
            displayName: 'Large Tip',
            locale: 'en_US',
          },
        ],
        productID: 'by.vazon.bsuirtime.tip.large',
        referenceName: 'Large Tip',
        type: 'Consumable',
      },
    ],
    settings: {
      _applicationInternalID: 'BsuirTime',
      _developerTeamID: '',
    },
  },
  null,
  2,
);

function withStoreKit(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const iosDir = path.join(mod.modRequest.projectRoot, 'ios');

      // 1. Create .storekit file (survives prebuild --clean)
      const storekitPath = path.join(iosDir, 'BsuirTime', STOREKIT_FILENAME);
      fs.mkdirSync(path.dirname(storekitPath), { recursive: true });
      fs.writeFileSync(storekitPath, STOREKIT_CONTENT, 'utf8');

      // 2. Patch scheme to reference StoreKit config
      const schemePath = path.join(
        iosDir,
        'BsuirTime.xcodeproj',
        'xcshareddata',
        'xcschemes',
        'BsuirTime.xcscheme',
      );

      if (!fs.existsSync(schemePath)) return mod;

      let scheme = fs.readFileSync(schemePath, 'utf8');

      if (scheme.includes('StoreKitConfigurationFileReference')) return mod;

      const marker = 'allowLocationSimulation = "YES">';
      const replacement = `allowLocationSimulation = "YES">
      <StoreKitConfigurationFileReference
         identifier = "../../BsuirTime/${STOREKIT_FILENAME}">
      </StoreKitConfigurationFileReference>`;

      scheme = scheme.replace(marker, replacement);
      fs.writeFileSync(schemePath, scheme, 'utf8');

      return mod;
    },
  ]);
}

module.exports = withStoreKit;
