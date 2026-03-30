export function generateInspectorScript(): string {
  return `
(function() {
  let highlightOverlay = null;

  function createOverlay() {
    const el = document.createElement('div');
    el.id = '__redesign_overlay__';
    el.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,0.08);z-index:999999;display:none;transition:all 0.1s ease;';
    document.body.appendChild(el);
    return el;
  }

  function getNodePath(node) {
    const parts = [];
    let current = node;
    while (current && current !== document.body) {
      const parent = current.parentNode;
      if (!parent) break;
      const children = Array.from(parent.children);
      const index = children.indexOf(current);
      parts.unshift(current.tagName.toLowerCase() + '[' + index + ']');
      current = parent;
    }
    parts.unshift('body');
    return parts.join('/');
  }

  function getNodeInfo(node) {
    const computed = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const attrs = {};
    for (const attr of node.attributes) {
      attrs[attr.name] = attr.value;
    }
    const styles = {};
    const styleProps = [
      'width','height','padding','margin','display','position',
      'background','backgroundColor','color','border','borderRadius','opacity',
      'fontFamily','fontSize','fontWeight','lineHeight',
      'paddingTop','paddingRight','paddingBottom','paddingLeft',
      'marginTop','marginRight','marginBottom','marginLeft',
      'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'
    ];
    for (const prop of styleProps) {
      styles[prop] = computed[prop];
    }
    return {
      tagName: node.tagName.toLowerCase(),
      path: getNodePath(node),
      attributes: attrs,
      computedStyles: styles,
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  }

  function showOverlay(rect) {
    if (!highlightOverlay) highlightOverlay = createOverlay();
    highlightOverlay.style.display = 'block';
    highlightOverlay.style.left = rect.x + 'px';
    highlightOverlay.style.top = rect.y + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';
  }

  function hideOverlay() {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
  }

  function buildDomTree(node) {
    if (node.nodeType !== 1) return null;
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || node.id === '__redesign_overlay__') return null;
    const children = [];
    for (const child of node.children) {
      const subtree = buildDomTree(child);
      if (subtree) children.push(subtree);
    }
    const classAttr = node.getAttribute('class');
    return {
      tagName,
      path: getNodePath(node),
      className: classAttr || '',
      children
    };
  }

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const node = e.target;
    if (node.id === '__redesign_overlay__') return;
    const info = getNodeInfo(node);
    showOverlay(info.boundingRect);
    window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
  }, true);

  document.addEventListener('mouseover', function(e) {
    const node = e.target;
    if (node.id === '__redesign_overlay__') return;
    const rect = node.getBoundingClientRect();
    showOverlay(rect);
    const info = getNodeInfo(node);
    window.parent.postMessage({ type: 'NODE_HOVERED', node: info }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    const msg = e.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'GET_DOM_TREE') {
      const tree = buildDomTree(document.body);
      window.parent.postMessage({ type: 'DOM_TREE', tree: tree ? [tree] : [] }, '*');
    } else if (msg.type === 'HIGHLIGHT_NODE') {
      const parts = msg.path.split('/').slice(1);
      let current = document.body;
      for (const part of parts) {
        const match = part.match(/^(.+)\\[(\\d+)\\]$/);
        if (!match) break;
        const children = Array.from(current.children);
        current = children[parseInt(match[2])];
        if (!current) break;
      }
      if (current && current !== document.body) {
        const rect = current.getBoundingClientRect();
        showOverlay(rect);
        const info = getNodeInfo(current);
        window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
      }
    } else if (msg.type === 'CLEAR_HIGHLIGHT') {
      hideOverlay();
    }
  });
})();
`;
}
