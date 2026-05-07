/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation/RootNavigator', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');

  return {
    RootNavigator: () => ReactLib.createElement(Text, null, 'RootNavigatorMock'),
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
