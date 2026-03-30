export function generateInspectorScript(): string {
  return `
(function() {
  let overlay = null;
  let selectedNode = null;

  function isOverlayEl(el) {
    if (!overlay) return false;
    return el === overlay || overlay.contains(el);
  }

  function createOverlay() {
    const el = document.createElement('div');
    el.id = '__redesign_overlay__';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;display:none;';

    const layers = ['margin','border','padding','content'];
    const colors = {
      margin:  'rgba(246,178,107,0.66)',
      border:  'rgba(255,229,153,0.66)',
      padding: 'rgba(147,196,125,0.55)',
      content: 'rgba(111,168,220,0.66)'
    };
    for (const name of layers) {
      const d = document.createElement('div');
      d.className = '__rl_' + name;
      d.style.cssText = 'position:absolute;background:' + colors[name] + ';';
      el.appendChild(d);
    }

    const tip = document.createElement('div');
    tip.className = '__rl_tooltip';
    tip.style.cssText = 'position:absolute;background:rgba(50,50,50,0.92);color:#fff;font:11px/1.4 SFMono-Regular,Menlo,monospace;padding:3px 6px;border-radius:3px;white-space:nowrap;pointer-events:none;';
    el.appendChild(tip);

    document.body.appendChild(el);
    return el;
  }

  function showOverlay(node) {
    if (!overlay) overlay = createOverlay();
    const cs = getComputedStyle(node);
    const rect = node.getBoundingClientRect();

    const mt = parseFloat(cs.marginTop) || 0;
    const mr = parseFloat(cs.marginRight) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    const ml = parseFloat(cs.marginLeft) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0;
    const br = parseFloat(cs.borderRightWidth) || 0;
    const bb = parseFloat(cs.borderBottomWidth) || 0;
    const blw = parseFloat(cs.borderLeftWidth) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;

    const mw = ml + rect.width + mr;
    const mh = mt + rect.height + mb;

    overlay.style.display = 'block';
    overlay.style.left = (rect.x - ml) + 'px';
    overlay.style.top = (rect.y - mt) + 'px';
    overlay.style.width = mw + 'px';
    overlay.style.height = mh + 'px';

    // Coordinates relative to overlay container (margin box origin)
    // Border box
    const bx0 = ml, by0 = mt;
    const bx1 = ml + rect.width, by1 = mt + rect.height;
    // Padding box
    const px0 = ml + blw, py0 = mt + bt;
    const px1 = ml + rect.width - br, py1 = mt + rect.height - bb;
    // Content box
    const cx0 = ml + blw + pl, cy0 = mt + bt + pt;
    const cx1 = ml + rect.width - br - pr, cy1 = mt + rect.height - bb - pb;

    function ring(ox0, oy0, ox1, oy1, ix0, iy0, ix1, iy1) {
      // Outer clockwise, inner counter-clockwise (starting at BL)
      // so connecting edges stay on the left side and don't cross
      return 'polygon(evenodd, ' +
        ox0+'px '+oy0+'px,'+ox1+'px '+oy0+'px,'+ox1+'px '+oy1+'px,'+ox0+'px '+oy1+'px,' +
        ix0+'px '+iy1+'px,'+ix1+'px '+iy1+'px,'+ix1+'px '+iy0+'px,'+ix0+'px '+iy0+'px)';
    }

    // Each ring layer fills the container; clip-path cuts it to only show its ring
    const marginEl = overlay.querySelector('.__rl_margin');
    marginEl.style.left = '0px';
    marginEl.style.top = '0px';
    marginEl.style.width = mw + 'px';
    marginEl.style.height = mh + 'px';
    marginEl.style.clipPath = ring(0, 0, mw, mh, bx0, by0, bx1, by1);

    const borderEl = overlay.querySelector('.__rl_border');
    borderEl.style.left = '0px';
    borderEl.style.top = '0px';
    borderEl.style.width = mw + 'px';
    borderEl.style.height = mh + 'px';
    borderEl.style.clipPath = ring(bx0, by0, bx1, by1, px0, py0, px1, py1);

    const paddingEl = overlay.querySelector('.__rl_padding');
    paddingEl.style.left = '0px';
    paddingEl.style.top = '0px';
    paddingEl.style.width = mw + 'px';
    paddingEl.style.height = mh + 'px';
    paddingEl.style.clipPath = ring(px0, py0, px1, py1, cx0, cy0, cx1, cy1);

    const contentEl = overlay.querySelector('.__rl_content');
    contentEl.style.left = cx0 + 'px';
    contentEl.style.top = cy0 + 'px';
    contentEl.style.width = Math.max(0, cx1 - cx0) + 'px';
    contentEl.style.height = Math.max(0, cy1 - cy0) + 'px';

    const tip = overlay.querySelector('.__rl_tooltip');
    const tag = node.tagName.toLowerCase();
    const cls = node.getAttribute('class');
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    let label = tag;
    if (cls) label += '.' + cls.trim().split(/\\s+/).join('.');
    label += ' \\u2002 ' + w + ' \\u00d7 ' + h;
    tip.textContent = label;

    let tipTop = -mt - tip.offsetHeight - 4;
    if (rect.y - mt + tipTop < 0) {
      tipTop = mh + 4;
    }
    let tipLeft = ml;
    tip.style.left = tipLeft + 'px';
    tip.style.top = tipTop + 'px';

    const tipRect = tip.getBoundingClientRect();
    if (tipRect.right > window.innerWidth) {
      tip.style.left = (ml - (tipRect.right - window.innerWidth) - 4) + 'px';
    }
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
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

  function resolveNodeByPath(path) {
    const parts = path.split('/').slice(1);
    let current = document.body;
    for (const part of parts) {
      const match = part.match(/^(.+)\\[(\\d+)\\]$/);
      if (!match) break;
      const children = Array.from(current.children);
      current = children[parseInt(match[2])];
      if (!current) break;
    }
    return (current && current !== document.body) ? current : null;
  }

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const node = e.target;
    if (isOverlayEl(node)) return;
    selectedNode = node;
    showOverlay(node);
    const info = getNodeInfo(node);
    window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
  }, true);

  document.addEventListener('mouseover', function(e) {
    const node = e.target;
    if (isOverlayEl(node)) return;
    showOverlay(node);
    const info = getNodeInfo(node);
    window.parent.postMessage({ type: 'NODE_HOVERED', node: info }, '*');
  }, true);

  document.addEventListener('mouseout', function(e) {
    const related = e.relatedTarget;
    if (related && isOverlayEl(related)) return;
    if (selectedNode) {
      showOverlay(selectedNode);
    } else {
      hideOverlay();
    }
  }, true);

  window.addEventListener('message', function(e) {
    const msg = e.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'GET_DOM_TREE') {
      const tree = buildDomTree(document.body);
      window.parent.postMessage({ type: 'DOM_TREE', tree: tree ? [tree] : [] }, '*');
    } else if (msg.type === 'HIGHLIGHT_NODE') {
      const node = resolveNodeByPath(msg.path);
      if (node) {
        selectedNode = node;
        showOverlay(node);
        const info = getNodeInfo(node);
        window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
      }
    } else if (msg.type === 'CLEAR_HIGHLIGHT') {
      selectedNode = null;
      hideOverlay();
    } else if (msg.type === 'SET_TOUCH_CURSOR') {
      let touchStyle = document.getElementById('__redesign_touch_cursor__');
      if (msg.enabled) {
        if (!touchStyle) {
          touchStyle = document.createElement('style');
          touchStyle.id = '__redesign_touch_cursor__';
          touchStyle.textContent = '* { cursor: none !important; }';
          document.head.appendChild(touchStyle);
        }
      } else {
        if (touchStyle) touchStyle.remove();
      }
    }
  });
})();
`;
}
