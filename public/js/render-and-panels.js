/* NOWACTION — extracted from public/index.html (lines 2479-3047 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      // RENDER ALL SHAPES & CANVAS TRANSFORM
      function render() {
        // Update Zoom Display
        zoomDisplay.innerText = Math.round(scale * 100) + '%';

        // Apply global translation/zoom matrix on world div
        canvasWorld.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;

        // RENDER SHAPES ON THE CANVAS WORLD
        // Reuse or recreate shape DOMs cleanly to prevent scroll flickering
        let htmlStr = `
          <!-- Center origin crosshair -->
          <div class="absolute w-6 h-px bg-[#404040] left-[-12px] top-0 pointer-events-none"></div>
          <div class="absolute w-px h-6 bg-[#404040] left-0 top-[-12px] pointer-events-none"></div>
        `;

        shapes.forEach((shape, index) => {
          const isSelected = selectedShapeIds.has(shape.id);
          const isPrimary = selectedShapeId === shape.id;
          const outlineColor = isPrimary ? '#3b82f6' : '#60a5fa';
          const outlineStyle = isSelected 
            ? (shape.locked ? 'outline: 2px dashed #ef4444; outline-offset: 2px;' : `outline: 2px solid ${outlineColor}; outline-offset: 2px;`) 
            : '';
            
          const borderRadiusVal = shape.type === 'circle' ? '50%' : `${shape.borderRadius}px`;
          const borderStyle = shape.strokeWidth > 0 ? `${shape.strokeWidth}px solid ${shape.strokeColor}` : 'none';
          const filterStyle = shape.blur > 0 ? `blur(${shape.blur}px)` : 'none';
          const opacityVal = shape.opacity / 100;

          // Touchscreen optimized high-precision resize handle
          const resizeHandleHtml = isPrimary && !shape.locked ? `
            <div class="resize-handle absolute w-6 h-6 bg-accent border-2 border-white right-[-10px] bottom-[-10px] cursor-se-resize z-40 rounded-full pointer-events-auto flex items-center justify-center shadow-lg" data-id="${shape.id}">
              <i class="codicon codicon-split-horizontal text-white text-[10px] pointer-events-none rotate-45"></i>
            </div>
          ` : '';

          if (shape.type === 'text') {
            const fontStyle = shape.fontFamily ? `font-family: ${shape.fontFamily};` : '';
            htmlStr += `
              <div class="shape absolute flex items-center justify-center text-center box-border pointer-events-auto break-all" 
                   data-id="${shape.id}"
                   style="
                     left: ${shape.x}px; 
                     top: ${shape.y}px; 
                     width: ${shape.w}px; 
                     height: ${shape.h}px; 
                     background: ${shape.fill}; 
                     border: ${borderStyle}; 
                     border-radius: ${borderRadiusVal}; 
                     filter: ${filterStyle}; 
                     transform: rotate(${shape.rotation || 0}deg); 
                     opacity: ${opacityVal}; 
                     color: ${shape.textColor}; 
                     font-size: ${shape.fontSize}px;
                     ${fontStyle}
                     ${outlineStyle}
                     user-select: none;
                     white-space: pre-wrap;
                     padding: 6px;
                     z-index: ${index};
                   ">
                <div class="text-content w-full h-full flex items-center justify-center outline-none select-text cursor-text overflow-hidden" style="pointer-events: auto;">${shape.text}</div>
                ${resizeHandleHtml}
                ${shape.locked ? `
                  <!-- Mini lock overlay icon -->
                  <div class="absolute top-1 right-1 bg-red-500/20 text-red-400 px-1 py-0.5 rounded text-[8px] pointer-events-none flex items-center justify-center">
                    <i class="codicon codicon-lock text-[10px]"></i>
                  </div>` : ''}
                ${shape.groupId ? `
                  <!-- Mini group badge -->
                  <div class="absolute bottom-1 left-1 bg-accent/30 text-white px-1 py-0.2 rounded text-[7px] pointer-events-none flex items-center justify-center font-mono">
                    GRP
                  </div>` : ''}
              </div>
            `;
          } else if (shape.type === 'image') {
            htmlStr += `
              <div class="shape absolute box-border pointer-events-auto overflow-hidden" 
                   data-id="${shape.id}"
                   style="
                     left: ${shape.x}px; 
                     top: ${shape.y}px; 
                     width: ${shape.w}px; 
                     height: ${shape.h}px; 
                     border: ${borderStyle}; 
                     border-radius: ${borderRadiusVal}; 
                     filter: ${filterStyle}; 
                     transform: rotate(${shape.rotation || 0}deg); 
                     opacity: ${opacityVal}; 
                     ${outlineStyle}
                     user-select: none;
                     z-index: ${index};
                   ">
                <img src="${shape.src || ''}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" />
                ${resizeHandleHtml}
                ${shape.locked ? `
                  <!-- Mini lock overlay icon -->
                  <div class="absolute top-1 right-1 bg-red-500/20 text-red-400 px-1 py-0.5 rounded text-[8px] pointer-events-none flex items-center justify-center">
                    <i class="codicon codicon-lock text-[10px]"></i>
                  </div>` : ''}
                ${shape.groupId ? `
                  <!-- Mini group badge -->
                  <div class="absolute bottom-1 left-1 bg-accent/30 text-white px-1 py-0.2 rounded text-[7px] pointer-events-none flex items-center justify-center font-mono">
                    GRP
                  </div>` : ''}
              </div>
            `;
          } else {
            htmlStr += `
              <div class="shape absolute box-border pointer-events-auto" 
                   data-id="${shape.id}"
                   style="
                     left: ${shape.x}px; 
                     top: ${shape.y}px; 
                     width: ${shape.w}px; 
                     height: ${shape.h}px; 
                     background: ${shape.fill}; 
                     border: ${borderStyle}; 
                     border-radius: ${borderRadiusVal}; 
                     filter: ${filterStyle}; 
                     transform: rotate(${shape.rotation || 0}deg); 
                     opacity: ${opacityVal}; 
                     ${outlineStyle}
                     user-select: none;
                     z-index: ${index};
                   ">
                ${resizeHandleHtml}
                ${shape.locked ? `
                  <!-- Mini lock overlay icon -->
                  <div class="absolute top-1 right-1 bg-red-500/20 text-red-400 px-1 py-0.5 rounded text-[8px] pointer-events-none flex items-center justify-center">
                    <i class="codicon codicon-lock text-[10px]"></i>
                  </div>` : ''}
                ${shape.groupId ? `
                  <!-- Mini group badge -->
                  <div class="absolute bottom-1 left-1 bg-accent/30 text-white px-1 py-0.2 rounded text-[7px] pointer-events-none flex items-center justify-center font-mono">
                    GRP
                  </div>` : ''}
              </div>
            `;
          }
        });

        canvasWorld.innerHTML = htmlStr;

        // Render Layer lists
        renderLayersList();
      }

      // SVG icon based on shape type, used by the layer-tree rows
      function getShapeTypeIcon(shape) {
        if (shape.type === 'rectangle') {
          return `
            <svg class="w-3.5 h-3.5 text-textSec shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>`;
        } else if (shape.type === 'circle') {
          return `
            <svg class="w-3.5 h-3.5 text-textSec shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
            </svg>`;
        } else if (shape.type === 'text') {
          return `
            <svg class="w-3.5 h-3.5 text-textSec shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 7V4h16v3M12 4v16" />
            </svg>`;
        } else if (shape.type === 'image') {
          return `
            <svg class="w-3.5 h-3.5 text-textSec shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>`;
        }
        return '';
      }

      // Render a single shape row. `indented` = true for shapes nested under a group header.
      function renderLayerShapeRow(shape, indented) {
        const isSelected = selectedShapeIds.has(shape.id);
        const activeBgClass = isSelected ? 'bg-accent/15 border-accent text-accent' : 'bg-transparent border-transparent text-text hover:bg-border/30';
        const indentClass = indented ? 'pl-6' : 'pl-2.5';

        return `
          <div class="group flex items-center justify-between border ${indentClass} pr-1.5 py-1.5 rounded transition-all ${activeBgClass}">
            <!-- Multi-select checkbox: adds/removes this shape from the selection -->
            <button onclick="event.stopPropagation(); selectShape('${shape.id}', true)" class="shrink-0 mr-2 w-4 h-4 rounded border ${isSelected ? 'bg-accent border-accent' : 'border-textSec/40 bg-transparent'} flex items-center justify-center" title="Add/remove from selection">
              ${isSelected ? `<i class="codicon codicon-check text-white" style="font-size: 10px;"></i>` : ''}
            </button>
            <!-- Tap to select name -->
            <button onclick="selectShape('${shape.id}')" class="flex-1 flex items-center space-x-2.5 text-left text-xs font-mono font-medium truncate focus:outline-none">
              ${getShapeTypeIcon(shape)}
              <span class="truncate">${shape.name}</span>
            </button>

            <!-- Quick controls -->
            <div class="flex items-center space-x-1.5">
              <button onclick="event.stopPropagation(); toggleLock('${shape.id}')" class="p-1 rounded text-textSec hover:text-text hover:bg-border/50 transition-colors" title="Lock Toggle">
                ${shape.locked ? `
                  <i class="codicon codicon-lock text-red-500" style="font-size: 13px;"></i>
                ` : `
                  <i class="codicon codicon-unlock text-textSec/50 group-hover:text-textSec" style="font-size: 13px;"></i>
                `}
              </button>
              <button onclick="event.stopPropagation(); deleteShape('${shape.id}')" class="p-1 rounded text-textSec hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete">
                <i class="codicon codicon-trash" style="font-size: 13px;"></i>
              </button>
            </div>
          </div>
        `;
      }

      // Render a group parent row: leading icon is the Ungroup action (replacing the
      // per-shape type icon), name is renameable, followed by its member rows indented below.
      function renderLayerGroupBlock(groupId, members) {
        const groupInfo = groups[groupId] || { name: 'Group' };
        const isGroupSelected = members.every(s => selectedShapeIds.has(s.id));

        let html = `
          <div class="flex items-center justify-between border pl-1.5 pr-1.5 py-1.5 rounded transition-all bg-border/20 border-border">
            <!-- Ungroup this group -->
            <button onclick="event.stopPropagation(); ungroupGroup('${groupId}')" class="shrink-0 mr-1.5 p-1 rounded text-textSec hover:text-accent hover:bg-border/50 transition-colors" title="Ungroup">
              <i class="codicon codicon-references" style="font-size: 14px;"></i>
            </button>
            <!-- Tap name to select whole group -->
            <button onclick="selectShape('${members[0].id}')" class="flex-1 flex items-center space-x-2 text-left text-xs font-mono font-semibold truncate focus:outline-none ${isGroupSelected ? 'text-accent' : 'text-text'}">
              <span class="truncate">${groupInfo.name}</span>
              <span class="px-1 bg-accent/20 text-accent text-[8px] font-mono rounded shrink-0">${members.length}</span>
            </button>
            <!-- Rename -->
            <button onclick="event.stopPropagation(); renameGroup('${groupId}')" class="p-1 rounded text-textSec hover:text-text hover:bg-border/50 transition-colors" title="Rename Group">
              <i class="codicon codicon-edit" style="font-size: 13px;"></i>
            </button>
          </div>
        `;
        members.forEach(shape => {
          html += renderLayerShapeRow(shape, true);
        });
        return html;
      }

      // RENDER LAYERS LIST IN BOTH DESKTOP & MOBILE PANELS (as a tree: groups nest their members)
      function renderLayersList() {
        // Count totals
        const count = shapes.length;
        document.getElementById('layers-count-desktop').innerText = count;
        document.getElementById('layers-count-mobile').innerText = count;

        let listHtml = '';
        if (count === 0) {
          listHtml = `<div class="text-xs text-textSec font-mono text-center py-8">No layers yet</div>`;
        } else {
          // Render reverse order (newest on top). Cluster grouped shapes together
          // regardless of their actual array position, so the tree stays correct
          // even for legacy/imported data where members might not be contiguous.
          const reversedShapes = [...shapes].reverse();
          const renderedGroupIds = new Set();

          reversedShapes.forEach(shape => {
            if (shape.groupId) {
              if (renderedGroupIds.has(shape.groupId)) return; // already rendered as part of its group block
              renderedGroupIds.add(shape.groupId);
              const members = reversedShapes.filter(s => s.groupId === shape.groupId);
              listHtml += renderLayerGroupBlock(shape.groupId, members);
            } else {
              listHtml += renderLayerShapeRow(shape, false);
            }
          });
        }

        document.getElementById('layer-list-desktop').innerHTML = listHtml;
        document.getElementById('layer-list-mobile').innerHTML = listHtml;
      }

      // Enable/disable floating edit-bar buttons based on current selection + clipboard state.
      // Mobile-first app (no keyboard), so these buttons ARE the shortcuts — they need to
      // visually reflect what's actually tappable instead of silently no-op-ing or alert()-ing.
      function updateFloatingEditBar() {
        const hasSelection = selectedShapeIds.size > 0;
        const hasMultiSelection = selectedShapeIds.size >= 2;
        const hasGroupedSelection = Array.from(selectedShapeIds).some(id => {
          const s = shapes.find(sh => sh.id === id);
          return s && s.groupId;
        });

        const setBtnState = (btnId, enabled) => {
          const btn = document.getElementById(btnId);
          if (!btn) return;
          btn.disabled = !enabled;
          btn.classList.toggle('opacity-30', !enabled);
          btn.classList.toggle('pointer-events-none', !enabled);
          btn.classList.toggle('cursor-not-allowed', !enabled);
        };

        setBtnState('btn-duplicate-shape', hasSelection);
        setBtnState('btn-group-shapes', hasMultiSelection);
        setBtnState('btn-ungroup-shapes', hasGroupedSelection);
        setBtnState('btn-delete-selected', hasSelection);
      }

      // RENDER / UPDATE PROPERTIES PANEL IN BOTH SCREEN SIZES
      function updatePropertiesPanel() {
        updateFloatingEditBar();
        const desktopPanel = document.getElementById('properties-panel-desktop');
        const mobilePanel = document.getElementById('properties-panel-properties'); // Tab Content in sheet
        
        if (!selectedShapeId) {
          const fallbackHtml = `
            <div class="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <svg class="w-8 h-8 text-textSec/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p class="text-xs text-textSec font-mono">No element selected</p>
            </div>
          `;
          desktopPanel.innerHTML = fallbackHtml;
          
          // Mobile counterpart fallback
          const mobilePanelContainer = document.getElementById('mobile-tab-properties');
          mobilePanelContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center space-y-1">
              <span class="text-xs font-mono font-bold text-textSec uppercase tracking-wider mb-2">Properties</span>
              <p class="text-[11px] text-textSec font-mono">Please select a layer or shape on the canvas</p>
            </div>
          `;
          return;
        }

        const shape = shapes.find(s => s.id === selectedShapeId);
        if (!shape) return;

        // Custom inputs HTML
        const isText = shape.type === 'text';
        
        const contentHtml = `
          <!-- Position & Dimension Box (Precise Typing) -->
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider">Geometry</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">X Pos</label>
                <input type="number" value="${shape.x}" oninput="updateShapeVal('x', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Y Pos</label>
                <input type="number" value="${shape.y}" oninput="updateShapeVal('y', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Width</label>
                <input type="number" value="${shape.w}" oninput="updateShapeVal('w', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Height</label>
                <input type="number" value="${shape.h}" oninput="updateShapeVal('h', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Rotation (deg)</label>
                <input type="number" value="${shape.rotation || 0}" oninput="updateShapeVal('rotation', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
            </div>
            <button onclick="openAnimationTimeline('${shape.id}')" class="w-full flex items-center justify-center space-x-1.5 px-2.5 py-1.5 bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent text-[10px] font-semibold rounded transition-colors">
              <i class="codicon codicon-play-circle text-xs"></i>
              <span>Animate on Scroll${shape.animation && shape.animation.enabled ? ' (Active)' : ''}</span>
            </button>
          </div>

          <!-- Color Styles -->
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider">Appearance</span>
            <div class="space-y-2">
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Fill Color (HEX / Color Picker)</label>
                <div class="flex items-center space-x-2">
                  <!-- Native Interactive Swatch Color Picker -->
                  <div class="relative w-8 h-8 rounded border border-border/80 shrink-0 overflow-hidden cursor-pointer shadow-inner" style="background-color: ${shape.fill === 'transparent' ? 'transparent' : shape.fill}; background-image: ${shape.fill === 'transparent' ? 'linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%), linear-gradient(45deg, #333 25%, #111 25%, #111 75%, #333 75%)' : 'none'}; background-size: ${shape.fill === 'transparent' ? '8px 8px' : 'auto'}; background-position: ${shape.fill === 'transparent' ? '0 0, 4px 4px' : 'auto'};" title="Tap to open color picker">
                    <input type="color" value="${shape.fill && shape.fill.startsWith('#') && (shape.fill.length === 4 || shape.fill.length === 7) ? shape.fill : '#3b82f6'}" oninput="updateShapeVal('fill', this.value); document.getElementById('fill-input').value = this.value; render();" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                  </div>
                  <input id="fill-input" type="text" value="${shape.fill}" oninput="updateShapeVal('fill', this.value); render();" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent flex-1" placeholder="#3b82f6" />
                  <button onclick="updateShapeVal('fill', 'transparent'); document.getElementById('fill-input').value = 'transparent'; render(); updatePropertiesPanel();" class="px-2 py-1.5 bg-[#0c0c0c] border border-border/40 hover:bg-[#161616] rounded text-[10px] font-mono text-textSec transition-colors" title="Make background transparent">
                    Clear
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Opacity (%)</label>
                  <input type="number" min="0" max="100" value="${shape.opacity}" oninput="updateShapeVal('opacity', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
                </div>
                <div>
                  <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Border Radius</label>
                  <input type="number" value="${shape.borderRadius}" ${shape.type === 'circle' ? 'disabled placeholder="Circle"' : ''} oninput="updateShapeVal('borderRadius', this.value)" class="bg-[#0a0a0a] disabled:opacity-40 border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
                </div>
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Blur Filter (px)</label>
                <input type="number" value="${shape.blur}" oninput="updateShapeVal('blur', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
            </div>
          </div>

          <!-- Borders Outline -->
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider">Border Outline</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Thickness</label>
                <input type="number" value="${shape.strokeWidth}" oninput="updateShapeVal('strokeWidth', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Stroke Color</label>
                <div class="flex items-center space-x-1.5">
                  <div class="relative w-6 h-6 rounded border border-border shrink-0 overflow-hidden cursor-pointer" style="background-color: ${shape.strokeColor === 'transparent' ? 'transparent' : shape.strokeColor}; background-image: ${shape.strokeColor === 'transparent' ? 'linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%), linear-gradient(45deg, #333 25%, #111 25%, #111 75%, #333 75%)' : 'none'}; background-size: ${shape.strokeColor === 'transparent' ? '6px 6px' : 'auto'};" title="Tap to open color picker">
                    <input type="color" value="${shape.strokeColor && shape.strokeColor.startsWith('#') && (shape.strokeColor.length === 4 || shape.strokeColor.length === 7) ? shape.strokeColor : '#000000'}" oninput="updateShapeVal('strokeColor', this.value); document.getElementById('stroke-input').value = this.value; render();" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                  </div>
                  <input id="stroke-input" type="text" value="${shape.strokeColor}" oninput="updateShapeVal('strokeColor', this.value); render();" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-1.5 py-1 focus:outline-none focus:border-accent flex-1" placeholder="#262626" />
                </div>
              </div>
            </div>
          </div>

          <!-- Specific Text Fields -->
          ${isText ? `
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider">Text Styling</span>
            <div class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Font Size</label>
                  <input type="number" value="${shape.fontSize}" oninput="updateShapeVal('fontSize', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full" />
                </div>
                <div>
                  <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Text Color</label>
                  <div class="flex items-center space-x-1.5">
                    <div class="relative w-6 h-6 rounded border border-border shrink-0 overflow-hidden cursor-pointer" style="background-color: ${shape.textColor}" title="Tap to open color picker">
                      <input type="color" value="${shape.textColor && shape.textColor.startsWith('#') && (shape.textColor.length === 4 || shape.textColor.length === 7) ? shape.textColor : '#ffffff'}" oninput="updateShapeVal('textColor', this.value); document.getElementById('text-color-input').value = this.value; render();" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                    </div>
                    <input id="text-color-input" type="text" value="${shape.textColor}" oninput="updateShapeVal('textColor', this.value); render();" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-1.5 py-1 focus:outline-none focus:border-accent flex-1" placeholder="#ffffff" />
                  </div>
                </div>
              </div>
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Text Content</label>
                <textarea rows="3" oninput="updateShapeVal('text', this.value)" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full resize-none">${shape.text}</textarea>
              </div>

              <!-- Font Family Display & Custom Fonts List -->
              <div class="space-y-1.5 pt-1">
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block">Font Family</label>
                <div class="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1">
                  <!-- Default system fallbacks -->
                  <button onclick="applyFontFamily('sans-serif')" class="px-2 py-1 text-[10px] font-mono rounded transition-all ${(!shape.fontFamily || shape.fontFamily === 'sans-serif') ? 'bg-accent text-white font-bold shadow' : 'bg-[#0c0c0c] text-textSec border border-border/40 hover:bg-[#161616]'}" style="font-family: sans-serif;">
                    Sans-Serif
                  </button>
                  <button onclick="applyFontFamily('serif')" class="px-2 py-1 text-[10px] font-mono rounded transition-all ${(shape.fontFamily === 'serif') ? 'bg-accent text-white font-bold shadow' : 'bg-[#0c0c0c] text-textSec border border-border/40 hover:bg-[#161616]'}" style="font-family: serif;">
                    Serif
                  </button>
                  <button onclick="applyFontFamily('monospace')" class="px-2 py-1 text-[10px] font-mono rounded transition-all ${(shape.fontFamily === 'monospace') ? 'bg-accent text-white font-bold shadow' : 'bg-[#0c0c0c] text-textSec border border-border/40 hover:bg-[#161616]'}" style="font-family: monospace;">
                    Monospace
                  </button>
                  
                  <!-- Dynamic loaded Google Fonts -->
                  ${customFonts.map(font => {
                    const cssFamily = font.cssFamilyName || font.name;
                    const isSelected = shape.fontFamily && (shape.fontFamily.startsWith(`'${cssFamily}'`) || shape.fontFamily.startsWith(cssFamily) || shape.fontFamily.includes(cssFamily));
                    return `
                      <div class="relative group inline-flex">
                        <button onclick="applyFontFamily('\\'${cssFamily}\\', sans-serif')" class="px-2 py-1 text-[10px] rounded transition-all ${isSelected ? 'bg-accent text-white font-bold shadow' : 'bg-[#0c0c0c] text-textSec border border-border/40 hover:bg-[#161616]'}" style="font-family: '${cssFamily}', sans-serif;">
                          ${font.name}
                        </button>
                        <button onclick="deleteCustomFont('${font.name}')" class="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 bg-red-500 hover:bg-red-600 rounded-full items-center justify-center text-white text-[9px] font-bold shadow transition-all" title="Delete Font">
                          &times;
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Add Google Font Section -->
              <div class="bg-[#070707] border border-border/30 rounded p-2.5 mt-2 space-y-2">
                <span class="text-[9px] font-mono font-bold text-accent uppercase tracking-wider block">Add Google Font</span>
                <div>
                  <label class="text-[8px] font-mono text-textSec uppercase tracking-wider block mb-0.5">Font Name / Family</label>
                  <input id="new-font-name" type="text" placeholder="e.g. Poppins" class="bg-[#0a0a0a] border border-border text-text font-mono text-[10px] rounded px-2 py-1 focus:outline-none focus:border-accent w-full" />
                </div>
                <div>
                  <label class="text-[8px] font-mono text-textSec uppercase tracking-wider block mb-0.5">Google Font CSS URL</label>
                  <input id="new-font-url" type="text" placeholder="https://fonts.googleapis.com/css2?..." class="bg-[#0a0a0a] border border-border text-text font-mono text-[10px] rounded px-2 py-1 focus:outline-none focus:border-accent w-full" />
                </div>
                <button onclick="addNewCustomFont()" class="w-full py-1 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent font-mono text-[10px] rounded transition-all font-semibold flex items-center justify-center space-x-1">
                  <i class="codicon codicon-cloud-download text-[11px] mr-1"></i>
                  <span>Import Google Font</span>
                </button>
              </div>

            </div>
          </div>
          ` : ''}

          <!-- Specific Image Fields -->
          ${shape.type === 'image' ? `
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider font-semibold">Image Source</span>
            <div class="space-y-2">
              <div>
                <label class="text-[9px] font-mono text-textSec uppercase tracking-wider block mb-1">Image URL / Data URL</label>
                <div class="flex flex-col space-y-2">
                  <textarea rows="4" oninput="updateShapeVal('src', this.value); render();" class="bg-[#0a0a0a] border border-border text-text font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent w-full resize-none break-all" placeholder="Paste an image URL (e.g., https://...) or data:image/...">${shape.src || ''}</textarea>
                  <button onclick="document.getElementById('properties-image-uploader').click()" class="w-full py-1.5 bg-[#0c0c0c] border border-border/40 hover:bg-[#161616] text-text font-mono text-[10px] rounded transition-all font-semibold flex items-center justify-center">
                    <i class="codicon codicon-device-camera text-[11px] mr-1"></i>
                    <span>Upload New Image</span>
                  </button>
                  <input id="properties-image-uploader" type="file" accept="image/*" class="hidden" onchange="const file = this.files[0]; if(file){ const r = new FileReader(); r.onload = (e) => { updateShapeVal('src', e.target.result); render(); updatePropertiesPanel(); }; r.readAsDataURL(file); }" />
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Layering controls (z-index) -->
          <div class="space-y-3 border-b border-border/50 pb-4">
            <span class="text-[10px] font-mono font-bold text-textSec uppercase tracking-wider">Layering</span>
            <div class="flex space-x-2">
              <button onclick="bringToFront('${shape.id}')" class="flex-1 py-1.5 bg-[#0a0a0a] hover:bg-border/30 border border-border text-text text-xs font-mono rounded transition-colors flex items-center justify-center space-x-1.5">
                <i class="codicon codicon-chevron-up text-[12px] mr-1.5"></i>
                <span>Bring to Front</span>
              </button>
              <button onclick="sendToBack('${shape.id}')" class="flex-1 py-1.5 bg-[#0a0a0a] hover:bg-border/30 border border-border text-text text-xs font-mono rounded transition-colors flex items-center justify-center space-x-1.5">
                <i class="codicon codicon-chevron-down text-[12px] mr-1.5"></i>
                <span>Send to Back</span>
              </button>
            </div>
          </div>

          <!-- Lock toggle & delete controls -->
          <div class="pt-2 flex items-center justify-between space-x-3">
            <button onclick="toggleLock('${shape.id}')" class="flex-1 py-2 border ${shape.locked ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/15' : 'bg-[#0a0a0a] hover:bg-border/30 border-border text-text'} text-xs font-mono rounded transition-colors flex items-center justify-center space-x-1.5">
              ${shape.locked ? `
                <i class="codicon codicon-lock text-[12px] mr-1.5"></i>
                <span>Locked</span>
              ` : `
                <i class="codicon codicon-unlock text-[12px] mr-1.5"></i>
                <span>Lock Shape</span>
              `}
            </button>
            <button onclick="deleteShape('${shape.id}')" class="py-2 px-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 text-xs rounded transition-colors flex items-center justify-center" title="Delete Element">
              <i class="codicon codicon-trash text-[13px]"></i>
            </button>
          </div>
        `;

        desktopPanel.innerHTML = contentHtml;

        // Mobile Tab counter-part - Render the exact same controls with specific mobile container overrides
        const mobileTabPanel = document.getElementById('mobile-tab-properties');
        mobileTabPanel.innerHTML = `
          <div class="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
            <span class="text-xs font-mono font-bold text-accent uppercase tracking-wider">${shape.name}</span>
            <span class="text-[10px] font-mono text-textSec uppercase">[${shape.type}]</span>
          </div>
          <div class="space-y-4">
            ${contentHtml}
          </div>
        `;
      }

      // ==========================================
      // AI COPILOT BRING-YOUR-OWN-KEY (BYOK) ENGINE
      // ==========================================
      

