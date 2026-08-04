/**
 * MedScan
 * Entry point
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

const normalizedAppName = appName?.toLowerCase?.() ?? appName;

AppRegistry.registerComponent(normalizedAppName, () => App);
