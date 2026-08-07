/**
 * MedScan entry
 */
import { I18nManager } from 'react-native';

// Default English LTR. Urdu select hone pe LanguageContext RTL karega.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

const normalizedAppName = appName?.toLowerCase?.() ?? appName;
AppRegistry.registerComponent(normalizedAppName, () => App);