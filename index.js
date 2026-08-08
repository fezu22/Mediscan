/**
 * MedScan entry
 */
import { AppRegistry, I18nManager, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Warnings ignore
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
]);

// Always LTR — language change only swaps text
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

AppRegistry.registerComponent(appName, () => App);