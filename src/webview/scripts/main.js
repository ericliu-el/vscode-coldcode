const vscode = acquireVsCodeApi();

/**
 * helper functions
 */
const $ = (q, node = document) => node.querySelector(q);
const $$ = (q, node = document) => Array.from(node.querySelectorAll(q));
const setVar = (key, value, node = document.body) => node.style.setProperty('--' + key, value);
const addClass = (name, node) => node.classList.add(name);
const delClass = (name, node) => node.classList.remove(name);

const post = (action, payload = '') => vscode.postMessage({ action, payload });
const postInfo = (text) => post('info', `ColdCode: ${text}`);
const postCfg = (cfg) => post('setCfg', { ...coldcodeCfg, ...cfg });

// store the configuration from extension
let coldcodeCfg = {};
let editorInfo = {};

const containerNode = $('.code-container');
const windowNode = $('.mac-window');

/**
 * paste code and setup the code into the container
 */

// to calculate the width of line numbers
const calcTextWidth = (text) => {
  const div = document.body.appendChild(document.createElement('div'));
  div.classList.add('size-test');
  div.textContent = text;
  const width = div.clientWidth;
  div.remove();
  return width + 1 + 'px';
};

const getDataFromClipboard = (clip, textOnly = false) => {
  if (!textOnly) {
    const html = clip.getData('text/html');
    if (html) return html;
  }

  const cnt = clip
    .getData('text/plain')
    .split('\n')
    .map((line) => `<p>${line}</p>`)
    .join('');

  return `<div>${cnt}</div>`;
};

const stripInitialIndent = (node) => {
  const regIndent = /^\s+/u;
  const initialSpans = $$(':scope > div > span:first-child', node);
  if (initialSpans.some((span) => !regIndent.test(span.textContent))) return;
  const minIndent = Math.min(...initialSpans.map((span) => span.textContent.match(regIndent)[0].length));
  initialSpans.forEach((span) => (span.textContent = span.textContent.slice(minIndent)));
};

const setupLines = (node) => {
  $$(':scope > br', node).forEach((row) => (row.outerHTML = '<div>&nbsp;</div>'));
  const rows = $$(':scope > div', node);

  setVar('line-number-1-width', calcTextWidth(rows.length));
  setVar('line-number-2-width', calcTextWidth(rows.length + editorInfo['startLine']));

  rows.forEach((row, idx) => {
    const newRow = document.createElement('div');
    newRow.classList.add('line');
    row.replaceWith(newRow);

    let num1, num2;
    num1 = idx + 1;
    num2 = idx + 1 + (editorInfo['startLine'] || 0);

    const num1Node = document.createElement('div');
    num1Node.classList.add('line-number-1');
    num1Node.textContent = num1;
    newRow.appendChild(num1Node);

    const num2Node = document.createElement('div');
    num2Node.classList.add('line-number-2');
    num2Node.textContent = num2;
    newRow.appendChild(num2Node);

    row.classList.add('line-code');
    const span = document.createElement('span');
    span.textContent = ' ';
    row.appendChild(span);
    newRow.appendChild(row);
  });
};

const pasteCode = (e) => {
  const codeNode = $('.code');
  codeNode.innerHTML = getDataFromClipboard(e.clipboardData);
  const meta = $('meta', codeNode);
  meta && codeNode.removeChild(meta);
  if ($('div', codeNode) === null || codeNode.childElementCount !== 1) {
    codeNode.innerHTML = getDataFromClipboard(e.clipboardData, true);
  }
  const codeSnippet = $('div', codeNode);
  codeSnippet.classList.add('code-snippet');
  stripInitialIndent(codeSnippet);
  setupLines(codeSnippet);
};

/**
 * UI update functions
 */
const setLineNumber = () => {
  const { lineNumber: v = '0' } = coldcodeCfg;
  if (v === '0') {
    $$('.line-number-1').forEach((node) => node.classList.add('hide'));
    $$('.line-number-2').forEach((node) => node.classList.add('hide'));
  }
  if (v === '1') {
    $$('.line-number-1').forEach((node) => node.classList.remove('hide'));
    $$('.line-number-2').forEach((node) => node.classList.add('hide'));
  }
  if (v === '2') {
    $$('.line-number-1').forEach((node) => node.classList.add('hide'));
    $$('.line-number-2').forEach((node) => node.classList.remove('hide'));
  }
};

const updateTitle = () => {
  const { windowTitle } = editorInfo;
  const titleNode = $('.code-container .navbar-title');
  const customTitle = $('#customTitle').value || '';
  titleNode.textContent = customTitle.trim() || windowTitle || 'coldcode';
};

const setBoxShadow = () => {
  let boxShadow = '';

  const { boxShadowColor, boxShadowAlpha, boxShadowX, boxShadowY, boxShadowZ } = coldcodeCfg;

  const r = parseInt(boxShadowColor.slice(1, 3), 16);
  const g = parseInt(boxShadowColor.slice(3, 5), 16);
  const b = parseInt(boxShadowColor.slice(5, 7), 16);

  boxShadow = `rgba(${r}, ${g}, ${b}, ${boxShadowAlpha}) ${boxShadowX}px ${boxShadowY}px ${boxShadowZ}px`;
  setVar('cfg-boxShadow', boxShadow);
};

const onCfgChange = () => {
  const cfgContainerSection = $('.cfg-section-container');
  const navNode = $('.code-container .navbar');
  const controlsNode = $('.code-container .navbar-controls');
  const titleNode = $('.code-container .navbar-title');
  const footerBtnSpans = $$('footer button span');
  const { target, bgTransparent, showControls, showTitle } = coldcodeCfg;

  $$('input[name^="cfg-"]').map((node) => {
    const v = coldcodeCfg[node.name.split('-')[1]];
    $('form[name="cfg-form"]')[node.name].value = v;
    setVar(node.name, v);
  });

  footerBtnSpans.map((span) => {
    span.textContent = `.${coldcodeCfg['fileType'] || 'png'}`;
  });

  showControls === '1' ? delClass('hide', controlsNode) : addClass('hide', controlsNode);
  showTitle === '1' ? delClass('hide', titleNode) : addClass('hide', titleNode);
  showTitle === '1' ? delClass('hide', $('#customTitle')) : addClass('hide', $('#customTitle'));
  showTitle === '0' && showControls === '0' ? addClass('hide', navNode) : delClass('hide', navNode);

  if (bgTransparent === '1' || target === 'window') {
    setVar('cfg-bgColor', 'transparent');
  }

  if (target === 'window') {
    addClass('hide', cfgContainerSection);
  } else {
    delClass('hide', cfgContainerSection);
  }

  setLineNumber();
  setBoxShadow();
};

const onSelectionChange = () => {
  setLineNumber();
  updateTitle();
};

/**
 * listeners
 */

window.addEventListener('message', (event) => {
  const { action, payload } = event.data;
  switch (action) {
    case 'copy':
      editorInfo = payload;
      document.execCommand('paste');
      break;
    case 'getCfg':
      coldcodeCfg = payload;
      onCfgChange();
      break;
  }
});

document.addEventListener('paste', (e) => {
  pasteCode(e);
  onSelectionChange();
});

// for form elements
$('form[name="cfg-form"]').addEventListener('submit', (e) => {
  e.preventDefault();
  return false;
});

$$('input[name^="cfg-"]').map((node) => {
  node.addEventListener('change', (e) => {
    postCfg({ [node.name.split('-')[1]]: e.target.value });
  });
  node.addEventListener('paste', (e) => {
    e.preventDefault();
  });
});

$('.reset-config').addEventListener('click', () => post('resetCfg'));

$('.toggle-config').addEventListener('click', () => {
  const cfgContainer = $('.cfg-section-container');
  const cfgWindow = $('.cfg-section-window');
  cfgContainer.classList.toggle('show');
  cfgWindow.classList.toggle('show');
  $('.reset-config').classList.toggle('hide');
});

$('#customTitle').addEventListener('input', updateTitle);
$('#customTitle').addEventListener('paste', (e) => {
  e.preventDefault();
});

/**
 * copy / download the screenshot
 */

const imgCfg = (scale = 2) => {
  const targetNode = coldcodeCfg['target'] === 'window' ? windowNode : containerNode;
  const fileType = coldcodeCfg['fileType'] === 'svg' ? 'svg' : 'png';
  windowNode.style.resize = 'none';
  flashAnimation();
  const cfg = {
    height: targetNode.clientHeight * scale,
    width: targetNode.clientWidth * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${targetNode.offsetWidth}px`,
      height: `${targetNode.offsetHeight}px`,
    },
  };
  return { targetNode, cfg, fileType };
};

$('.copy').addEventListener('click', async () => {
  const { targetNode, cfg, fileType } = imgCfg();

  if (fileType === 'svg') {
    const svgDocument = elementToSVG(targetNode);
    const svgString = new XMLSerializer().serializeToString(svgDocument);
    await navigator.clipboard.writeText(svgString);
  } else {
    const blob = await domtoimage.toBlob(targetNode, cfg);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }

  postInfo('Copied to clipboard!');
  windowNode.style.resize = '';
});

$('.download').addEventListener('click', async () => {
  const { targetNode, cfg, fileType } = imgCfg();
  let data = '';
  if (fileType === 'svg') {
    const svgDocument = elementToSVG(targetNode);
    data = new XMLSerializer().serializeToString(svgDocument);
  } else {
    data = await domtoimage.toPng(targetNode, cfg);
    data = data.split(',')[1];
  }

  vscode.postMessage({
    action: 'saveImage',
    payload: {
      fileType,
      data,
    },
  });

  windowNode.style.resize = '';
});

const flashFx = $('#flash-fx');
flashFx.addEventListener('transitionend', () => {
  flashFx.style.display = 'none';
  flashFx.style.opacity = '1';
});

const flashAnimation = () => {
  flashFx.style.display = 'block';
  void flashFx.clientWidth;
  flashFx.style.opacity = '0';
};
