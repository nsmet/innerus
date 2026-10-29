import React from 'react';
import { Animated } from 'react-native';
import { configure, render, screen } from '@testing-library/react-native';
import { getTopic } from '../../content/catalogue';
import { StoryArt } from '../StoryArt';

let mockReduceMotion = false;
jest.mock('../ThemeProvider', () => ({ useDesign: () => ({
  reduceMotion: mockReduceMotion, scheme: 'light', palette: require('../tokens').colors.light,
}) }));

configure({ defaultIncludeHiddenElements: true });
const topic = getTopic('A01')!;
afterEach(() => jest.restoreAllMocks());

test('rapid chapter replacement stops the old animation and shows only the requested frame', async () => {
  const animations: { start: jest.Mock; stop: jest.Mock; reset: jest.Mock }[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation(() => {
    const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    animations.push(animation);
    return animation;
  });
  mockReduceMotion = false;
  const view = await render(<StoryArt topic={topic} position={0} />);
  await view.rerender(<StoryArt topic={topic} position={4} />);
  await view.rerender(<StoryArt topic={topic} position={1} />);
  expect(screen.getByTestId('story-art-cafe-A01-2-v2')).toBeTruthy();
  expect(screen.queryByTestId('story-art-cafe-A01-1-v2')).toBeNull();
  expect(screen.queryByTestId('story-art-cafe-A01-5-v2')).toBeNull();
  expect(animations[0].stop).toHaveBeenCalledTimes(1);
  expect(animations[1].stop).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(animations[2].stop).toHaveBeenCalledTimes(1);
});

test('Reduced Motion and its live setting change resolve to a fully visible static scene', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  mockReduceMotion = true;
  const view = await render(<StoryArt topic={topic} position={2} />);
  expect(timing).not.toHaveBeenCalled();
  expect(screen.getByTestId('story-art-cafe-A01-3-v2').props.style.opacity).toBe(1);
  mockReduceMotion = false;
  await view.rerender(<StoryArt topic={topic} position={3} />);
  expect(timing).toHaveBeenCalledTimes(1);
  mockReduceMotion = true;
  await view.rerender(<StoryArt topic={topic} position={3} />);
  expect(screen.getByTestId('story-art-cafe-A01-4-v2').props.style.transform).toEqual([]);
  expect(screen.getByTestId('story-art-cafe-A01-4-v2').props.style.opacity).toBe(1);
});
