/**
 * default configuration of ColdCode
 *
 * `target` - the target element to capture screenshot
 *
 *            `container` - including the outer area
 *            `window` - only the code window area
 *
 * `bgColor` - background color of outer container
 */
export type Config = {
  target: 'container' | 'window';
  bgColor: string;
  bgTransparent: '0' | '1';
  padding: string;
  lineNumber: '0' | '1' | '2';
  borderRadius: string;
  showControls: '0' | '1';
  showTitle: '0' | '1';
  boxShadowColor: string;
  boxShadowAlpha: string;
  boxShadowX: string;
  boxShadowY: string;
  boxShadowZ: string;
  fileType: 'svg' | 'png';
};

export type EditorInfo = {
  windowTitle: string;
  startLine: number;
};

const defaultConfig: Config = {
  target: 'container',
  bgColor: '#abb8c3',
  bgTransparent: '0',
  padding: '3',
  lineNumber: '0',
  borderRadius: '4',
  showControls: '1',
  showTitle: '0',
  boxShadowColor: '#000000',
  boxShadowAlpha: '0.55',
  boxShadowX: '0',
  boxShadowY: '20',
  boxShadowZ: '60',
  fileType: 'png',
};

export default defaultConfig;
