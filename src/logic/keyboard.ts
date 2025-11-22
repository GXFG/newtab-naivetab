import { isMacOS } from '@/env'
import { localConfig } from '@/logic/store'

const KEYBOARD_TYPE_CONFIG = {
  hhkb: {
    isMacOS: true,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backslash', 'Backquote'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backspace'],
      ['ControlLeft', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'Fn'],
      ['AltLeft', 'MetaLeft', 'Space', 'MetaRight', 'AltRight'],
    ],
    emphasisOneKeys: ['Escape', 'Backquote', 'Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'MetaLeft', 'AltLeft', 'AltRight', 'MetaRight', 'ControlRight', 'Fn'],
    emphasisTwoKeys: [],
    custom: {
      Backslash: { size: 1 },
      Backspace: { size: 1.5, label: isMacOS ? 'delete' : 'Delete', textAlign: 'left' },
      ControlLeft: { size: 1.75, label: isMacOS ? 'control' : 'Control' },
      Enter: { label: isMacOS ? 'return' : 'Return', textAlign: 'left' },
      ShiftRight: { size: 1.75, textAlign: 'left' },
      Fn: { size: 1 },
      AltLeft: { size: 1, marginLeft: 1.5 },
      MetaLeft: { size: 1.5 },
      Space: { size: 6 },
      AltRight: { size: 1, marginRight: 2.5 },
      MetaRight: { size: 1.5 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3 },
    },
    customSpace3: {
      Space: { size: 2 },
      SpaceSplit1: { size: 2 },
      SpaceSplit2: { size: 2 },
    },
  },
  key33: {
    isMacOS: false,
    list: [
      ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
      ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
    ],
    emphasisOneKeys: [],
    emphasisTwoKeys: [],
    custom: {
      KeyA: { marginLeft: 0.25 },
      KeyZ: { marginLeft: 0.75 },
      Quote: { marginRight: 0.75 },
      Slash: { marginRight: 1.25 },
    },
  },
  key45: {
    isMacOS: false,
    list: [
      ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
      ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
      ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
    ],
    emphasisOneKeys: [],
    emphasisTwoKeys: [],
    custom: {
      KeyQ: { marginLeft: 0.5 },
      KeyA: { marginLeft: 0.75 },
      KeyZ: { marginLeft: 1.25 },
      Equal: { marginRight: 0.5 },
      Quote: { marginRight: 0.75 },
      Slash: { marginRight: 1.25 },
    },
  },
  key47: {
    isMacOS: false,
    list: [
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'Fn', 'ControlRight'],
    ],
    emphasisOneKeys: ['Escape', 'Backquote', 'Backspace', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'MetaLeft', 'AltLeft', 'AltRight', 'MetaRight', 'ControlRight', 'Fn'],
    emphasisTwoKeys: ['Escape', 'Enter'],
    custom: {},
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key53: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
    ],
    emphasisOneKeys: ['Backquote', 'Backspace', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight'],
    emphasisTwoKeys: ['Escape', 'Enter'],
    custom: {},
  },
  key61: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'Fn', 'AltRight', 'MetaRight', 'ControlRight'],
    ],
    emphasisOneKeys: [
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {},
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key64: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'Delete'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      ShiftLeft: { size: 2 },
      ShiftRight: { size: 1, textAlign: 'center' },
      AltRight: { size: 1 },
      Fn: { size: 1 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key66: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Backquote'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      ShiftRight: { size: 1.75 },
      ArrowUp: { marginRight: 1 },
      ArrowLeft: { marginLeft: 0.5 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key67: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Backquote'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'Fn'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      ShiftRight: { size: 1.75 },
      ArrowLeft: { marginLeft: 0.5 },
      Fn: { size: 1, textAlign: 'center' },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key68: {
    isMacOS: false,
    list: [
      ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Backquote'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'Delete'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageUp'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'PageDown'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      ShiftRight: { size: 1.75 },
      AltRight: { size: 1 },
      Fn: { size: 1 },
      ControlRight: { size: 1 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key80: {
    isMacOS: false,
    list: [
      ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Delete'],
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Insert'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'F5',
      'F6',
      'F7',
      'F8',
      'F13',
      'F14',
      'F15',
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      F1: { marginLeft: 0.5 },
      F2: { marginBottom: 0.25 },
      F3: { marginBottom: 0.25 },
      F4: { marginBottom: 0.25 },
      F5: { marginLeft: 0.5 },
      F6: { marginBottom: 0.25 },
      F7: { marginBottom: 0.25 },
      F8: { marginBottom: 0.25 },
      F9: { marginLeft: 0.5 },
      F10: { marginBottom: 0.25 },
      F11: { marginBottom: 0.25 },
      F12: { marginBottom: 0.25 },
      Delete: { marginLeft: 0.5 },
      ShiftRight: { size: 1.75 },
      ArrowUp: { marginRight: 1 },
      ArrowLeft: { marginLeft: 0.5 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key81a: {
    isMacOS: false,
    list: [
      ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Delete'],
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Home'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'End'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'F5',
      'F6',
      'F7',
      'F8',
      'F13',
      'F14',
      'F15',
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      F1: { marginLeft: 0.5 },
      F2: { marginBottom: 0.25 },
      F3: { marginBottom: 0.25 },
      F4: { marginBottom: 0.25 },
      F5: { marginLeft: 0.5 },
      F6: { marginBottom: 0.25 },
      F7: { marginBottom: 0.25 },
      F8: { marginBottom: 0.25 },
      F9: { marginLeft: 0.5 },
      F10: { marginBottom: 0.25 },
      F11: { marginBottom: 0.25 },
      F12: { marginBottom: 0.25 },
      Delete: { marginLeft: 0.5 },
      ShiftRight: { size: 1.75 },
      ArrowLeft: { marginLeft: 0.5 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key81b: {
    isMacOS: false,
    list: [
      ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Delete'],
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Insert'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'F5',
      'F6',
      'F7',
      'F8',
      'F13',
      'F14',
      'F15',
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      F1: { marginLeft: 1 },
      F2: { marginBottom: 0.25 },
      F3: { marginBottom: 0.25 },
      F4: { marginBottom: 0.25 },
      F5: { marginLeft: 0.5, marginBottom: 0.25 },
      F6: { marginBottom: 0.25 },
      F7: { marginBottom: 0.25 },
      F8: { marginBottom: 0.25 },
      F9: { marginLeft: 0.5, marginBottom: 0.25 },
      F10: { marginBottom: 0.25 },
      F11: { marginBottom: 0.25 },
      F12: { marginBottom: 0.25 },
      ShiftRight: { size: 1.75 },
      AltRight: { size: 1 },
      Fn: { size: 1 },
      ControlRight: { size: 1 },
      Delete: { marginLeft: 0.25 },
      Insert: { marginLeft: 0.25 },
      PageUp: { marginLeft: 0.25 },
      PageDown: { marginLeft: 0.25 },
      ArrowUp: { marginRight: 1.25 },
      ArrowRight: { marginRight: 0.25 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key84: {
    isMacOS: false,
    list: [
      ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'Delete'],
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Home'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'PageUp'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'PageDown'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'End'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'F5',
      'F6',
      'F7',
      'F8',
      'F13',
      'F14',
      'F15',
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ],
    emphasisTwoKeys: ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    custom: {
      F1: { ShiftRight: 1.75 },
      ShiftRight: { size: 1.75 },
      AltRight: { size: 1 },
      Fn: { size: 1 },
      ControlRight: { size: 1 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
  key87: {
    isMacOS: false,
    list: [
      ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15'],
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Insert', 'Home', 'PageUp'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'Delete', 'End', 'PageDown'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp'],
      ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'Fn', 'MetaRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    emphasisOneKeys: [
      'F5',
      'F6',
      'F7',
      'F8',
      'F13',
      'F14',
      'F15',
      'Backquote',
      'Backspace',
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'MetaLeft',
      'AltLeft',
      'AltRight',
      'MetaRight',
      'ControlRight',
      'Fn',
      'Insert',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
    emphasisTwoKeys: ['Escape', 'Enter'],
    custom: {
      Escape: { marginBottom: 0.25 },
      F1: { marginLeft: 1 },
      F2: { marginBottom: 0.25 },
      F3: { marginBottom: 0.25 },
      F4: { marginBottom: 0.25 },
      F5: { marginLeft: 0.5, marginBottom: 0.25 },
      F6: { marginBottom: 0.25 },
      F7: { marginBottom: 0.25 },
      F8: { marginBottom: 0.25 },
      F9: { marginLeft: 0.5, marginBottom: 0.25 },
      F10: { marginBottom: 0.25 },
      F11: { marginBottom: 0.25 },
      F12: { marginBottom: 0.25 },
      F13: { marginLeft: 0.5, marginBottom: 0.25 },
      F14: { marginBottom: 0.25 },
      F15: { marginBottom: 0.25 },
      Insert: { marginLeft: 0.5 },
      Delete: { marginLeft: 0.5 },
      ArrowUp: { marginLeft: 1.5, marginRight: 1 },
      ArrowLeft: { marginLeft: 0.5 },
      Enter: { marginRight: 3.5 },
    },
    customSpace2: {
      Space: { size: 3 },
      SpaceSplit1: { size: 3.25 },
    },
    customSpace3: {
      Space: { size: 2.25 },
      SpaceSplit1: { size: 1.25 },
      SpaceSplit2: { size: 2.75 },
    },
  },
}

const SPLIT_SPACES_CONFIG_MAP = {
  space2: {
    fieldName: 'customSpace2',
    keyList: ['SpaceSplit1'],
  },
  space3: {
    fieldName: 'customSpace3',
    keyList: ['SpaceSplit1', 'SpaceSplit2'],
  },
}

export const currKeyboardConfig = computed(() => {
  let target: {
    isMacOS: boolean
    list: string[][]
    emphasisOneKeys: string[]
    emphasisTwoKeys: string[]
    custom: {
      [key: string]: KeyboardConfigItem
    }
    customSpace2?: {
      [key: string]: KeyboardConfigItem
    }
    customSpace3?: {
      [key: string]: KeyboardConfigItem
    }
  } = KEYBOARD_TYPE_CONFIG[localConfig.keyboard.keyboardType]
  // 使用key61兜底
  if (!target) {
    target = KEYBOARD_TYPE_CONFIG.key61
  }
  target = structuredClone(target)
  try {
    // if Mac, swap option & command
    if (!target.isMacOS && isMacOS) {
      target.isMacOS = true
      const lastRowIndex = target.list.length - 1
      let leftAltIndex = -1
      let leftMetaIndex = -1
      let rightAltIndex = -1
      let rightMetaIndex = -1
      for (let index = 0, len = target.list[lastRowIndex].length; index < len; index++) {
        const item = target.list[lastRowIndex][index]
        if (item === 'AltLeft') {
          leftAltIndex = index
        } else if (item === 'MetaLeft') {
          leftMetaIndex = index
        } else if (item === 'AltRight') {
          rightAltIndex = index
        } else if (item === 'MetaRight') {
          rightMetaIndex = index
        }
      }
      if (leftAltIndex !== -1 && leftMetaIndex !== -1) {
        ;[target.list[lastRowIndex][leftMetaIndex], target.list[lastRowIndex][leftAltIndex]] = [target.list[lastRowIndex][leftAltIndex], target.list[lastRowIndex][leftMetaIndex]]
      }
      if (rightAltIndex !== -1 && rightMetaIndex !== -1) {
        ;[target.list[lastRowIndex][rightMetaIndex], target.list[lastRowIndex][rightAltIndex]] = [target.list[lastRowIndex][rightAltIndex], target.list[lastRowIndex][rightMetaIndex]]
      }
    }
    // split space
    const lastRowKeyList = target.list[target.list.length - 1]
    const spaceIndex = lastRowKeyList.findIndex((text) => text === 'Space')
    const spaceConfig = SPLIT_SPACES_CONFIG_MAP[localConfig.keyboard.splitSpace]
    if (spaceConfig && localConfig.keyboard.splitSpace !== 'space1' && spaceIndex !== -1) {
      lastRowKeyList.splice(spaceIndex + 1, 0, ...spaceConfig.keyList)
      target.custom = {
        ...target.custom,
        ...target[spaceConfig.fieldName],
      }
    }
  } catch (e) {
    console.error(e)
  }
  return target
})

export const keyboardCurrentModelAllKeyList = computed(() => currKeyboardConfig.value.list.flat(Infinity))
