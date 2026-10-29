// The package's Jest mock is an ES module whose API lives on `default`.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
