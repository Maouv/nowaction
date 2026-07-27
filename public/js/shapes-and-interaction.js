/* NOWACTION — extracted from public/index.html (lines 1509-2478 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      // Math Expression Evaluator
      function evaluatePxExpression(inputStr, currentVal = 0) {
        if (typeof inputStr !== 'string') return Math.round(Number(inputStr) || 0);
        let str = inputStr.trim().replace(/px$/i, '').trim();
        if (!str) return currentVal;
        
        // Handle relative ops like "+20", "-15", "*2", "/4"
        if (/^[\+\-\*\/]/.test(str)) {
          str = `${currentVal} ${str}`;
        }
        
        // Clean sanitization: allow only numbers, spaces, dot, +, -, *, /, (, )
        if (!/^[0-9\.\s\+\-\*\/\(\)]+$/.test(str)) {
          const fallback = parseFloat(str);
          return isNaN(fallback) ? currentVal : Math.round(fallback);
        }
        
        try {
          // Safe evaluation using Function context
          const result = new Function(`'use strict'; return (${str})`)();
          if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return Math.round(result);
          }
        } catch (e) {
          // Fallback
        }
        
        const parsed = parseFloat(str);
        return isNaN(parsed) ? currentVal : Math.round(parsed);
      }

      function snapPx(val, gridSize) {
        if (!gridSize || gridSize <= 1) return Math.round(val);
        return Math.round(val / gridSize) * gridSize;
      }

      // Main drawing / adding shape function
      function addShapeAt(worldX, worldY) {
        const type = activeTool;
        shapeCounter[type]++;
        const num = shapeCounter[type];
        
        let newShape = {
          id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: type,
          name: type.charAt(0).toUpperCase() + type.slice(1) + ' ' + num,
          fill: type === 'text' ? 'transparent' : '#3b82f6',
          strokeWidth: 0,
          strokeColor: '#262626',
          borderRadius: type === 'text' ? 4 : 0,
          blur: 0,
          opacity: 100,
          rotation: 0,
          locked: false
        };

        if (type === 'rectangle') {
          newShape.w = 120;
          newShape.h = 80;
          newShape.x = Math.round(worldX - 60);
          newShape.y = Math.round(worldY - 40);
        } else if (type === 'circle') {
          newShape.w = 120;
          newShape.h = 120;
          newShape.x = Math.round(worldX - 60);
          newShape.y = Math.round(worldY - 60);
        } else if (type === 'text') {
          newShape.w = 160;
          newShape.h = 50;
          newShape.x = Math.round(worldX - 80);
          newShape.y = Math.round(worldY - 25);
          newShape.fontSize = 14;
          newShape.textColor = '#e5e5e5';
          newShape.fontFamily = 'Inter, sans-serif';
          newShape.text = 'Text';
        }

        shapes.push(newShape);
        selectShape(newShape.id);
        
        // Revert back to Select tool automatically per instruction
        selectTool('select');
        saveToLocalStorage();
        render();
        
        // Focus Properties panel on mobile automatically so inputs are visible
        switchMobileTab('properties');
      }

      // Selection tracking
      function selectShape(id, extendSelection = false) {
        if (!id) {
          selectedShapeId = null;
          selectedShapeIds.clear();
          render();
          updatePropertiesPanel();
          return;
        }

        const targetShape = shapes.find(s => s.id === id);
        if (!targetShape) return;

        // If part of a group, select the whole group together
        const groupMembers = targetShape.groupId 
          ? shapes.filter(s => s.groupId === targetShape.groupId).map(s => s.id)
          : [id];

        if (extendSelection) {
          const allSelected = groupMembers.every(sid => selectedShapeIds.has(sid));
          if (allSelected) {
            groupMembers.forEach(sid => selectedShapeIds.delete(sid));
          } else {
            groupMembers.forEach(sid => selectedShapeIds.add(sid));
          }
        } else {
          selectedShapeIds.clear();
          groupMembers.forEach(sid => selectedShapeIds.add(sid));
        }

        if (selectedShapeIds.size > 0) {
          if (!selectedShapeIds.has(selectedShapeId)) {
            selectedShapeId = Array.from(selectedShapeIds)[0];
          }
        } else {
          selectedShapeId = null;
        }

        render();
        updatePropertiesPanel();
      }

      // Delete Shape
      function deleteShape(id) {
        const target = shapes.find(s => s.id === id);
        const gId = target && target.groupId;
        shapes = shapes.filter(s => s.id !== id);
        selectedShapeIds.delete(id);
        if (selectedShapeId === id) {
          selectedShapeId = selectedShapeIds.size > 0 ? Array.from(selectedShapeIds)[0] : null;
        }
        if (gId && !shapes.some(s => s.groupId === gId)) delete groups[gId];
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      }

      // Delete Selected Shapes (Bulk delete)
      window.deleteSelected = function() {
        if (selectedShapeIds.size === 0) return;
        const affectedGroupIds = new Set(
          Array.from(selectedShapeIds)
            .map(id => shapes.find(s => s.id === id))
            .filter(s => s && s.groupId)
            .map(s => s.groupId)
        );
        shapes = shapes.filter(s => !selectedShapeIds.has(s.id));
        affectedGroupIds.forEach(gId => {
          if (!shapes.some(s => s.groupId === gId)) delete groups[gId];
        });
        selectedShapeIds.clear();
        selectedShapeId = null;
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      };

      // Copy Selected shapes to clipboard
      window.copySelected = function() {
        if (selectedShapeIds.size === 0) return;
        clipboardShapes = [];
        selectedShapeIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s) {
            // deep clone
            clipboardShapes.push(JSON.parse(JSON.stringify(s)));
          }
        });
        console.log(`Copied ${clipboardShapes.length} shapes to clipboard`);
      };

      // Paste shapes from clipboard
      window.pasteSelected = function() {
        if (clipboardShapes.length === 0) return;
        
        // Generate new unique IDs and offset paste position slightly
        const offset = 20;
        const newIds = [];
        
        // If paste contains groups, we should map them to new group IDs
        const groupMapping = {};

        clipboardShapes.forEach((s) => {
          const originalId = s.id;
          const newId = 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          const cloned = JSON.parse(JSON.stringify(s));
          cloned.id = newId;
          cloned.x += offset;
          cloned.y += offset;
          
          if (cloned.groupId) {
            if (!groupMapping[cloned.groupId]) {
              groupMapping[cloned.groupId] = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            }
            cloned.groupId = groupMapping[cloned.groupId];
          }

          shapes.push(cloned);
          newIds.push(newId);
        });

        // Select the newly pasted elements
        selectedShapeIds.clear();
        newIds.forEach(id => selectedShapeIds.add(id));
        selectedShapeId = newIds[0];

        // Save, render, update
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      };

      // Duplicate Selected shapes immediately
      window.duplicateSelected = function() {
        if (selectedShapeIds.size === 0) return;
        
        const offset = 25;
        const newIds = [];
        const groupMapping = {};

        selectedShapeIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s) {
            const cloned = JSON.parse(JSON.stringify(s));
            const newId = 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            cloned.id = newId;
            cloned.x += offset;
            cloned.y += offset;

            if (cloned.groupId) {
              const originalGroupId = s.groupId;
              if (!groupMapping[cloned.groupId]) {
                groupMapping[cloned.groupId] = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
              }
              cloned.groupId = groupMapping[cloned.groupId];
              if (!groups[cloned.groupId]) {
                const baseName = (groups[originalGroupId] && groups[originalGroupId].name) || 'Group';
                groups[cloned.groupId] = { name: baseName + ' Copy' };
              }
            }

            shapes.push(cloned);
            newIds.push(newId);
          }
        });

        // Select newly duplicated elements
        selectedShapeIds.clear();
        newIds.forEach(id => selectedShapeIds.add(id));
        selectedShapeId = newIds[0];

        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      };

      // Group selected shapes together
      window.groupSelectedShapes = function() {
        if (selectedShapeIds.size < 2) {
          alert("Silakan pilih minimal 2 elemen untuk digabungkan!");
          return;
        }

        const newGroupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        selectedShapeIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s) {
            s.groupId = newGroupId;
          }
        });

        // Keep group members contiguous in the z-order array so layer-tree
        // rendering and bring-to-front/send-to-back stay consistent, even if
        // the selected shapes were scattered across the z-order before grouping.
        const frontMostIndex = Math.max(...Array.from(selectedShapeIds).map(id => shapes.findIndex(s => s.id === id)));
        const members = shapes.filter(s => s.groupId === newGroupId);
        // Position within the array AFTER group members are removed, not the original index.
        const insertAt = shapes.slice(0, frontMostIndex).filter(s => s.groupId !== newGroupId).length;
        shapes = shapes.filter(s => s.groupId !== newGroupId);
        shapes.splice(insertAt, 0, ...members);

        groups[newGroupId] = { name: 'Group ' + (Object.keys(groups).length + 1) };

        saveToLocalStorage();
        render();
        updatePropertiesPanel();
        alert("Elemen berhasil digabungkan dalam grup!");
      };

      // Ungroup selected shapes
      window.ungroupSelectedShapes = function() {
        let ungroupCount = 0;
        selectedShapeIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s && s.groupId) {
            // Find all shapes with the same groupId and clear them
            const gId = s.groupId;
            shapes.forEach(sh => {
              if (sh.groupId === gId) {
                delete sh.groupId;
                ungroupCount++;
              }
            });
            delete groups[gId];
          }
        });

        if (ungroupCount > 0) {
          saveToLocalStorage();
          render();
          updatePropertiesPanel();
          alert("Grup berhasil dipisahkan!");
        } else {
          alert("Elemen yang dipilih tidak berada dalam grup.");
        }
      };

      // Ungroup a specific group by id directly (used by the layer-tree group header button,
      // so the user doesn't need to select the group first).
      window.ungroupGroup = function(groupId) {
        if (!groupId) return;
        shapes.forEach(sh => {
          if (sh.groupId === groupId) delete sh.groupId;
        });
        delete groups[groupId];
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      };

      // Rename a group from the layer-tree header
      window.renameGroup = function(groupId) {
        if (!groupId || !groups[groupId]) return;
        const current = groups[groupId].name || 'Group';
        const next = prompt('Nama grup baru:', current);
        if (next === null) return; // cancelled
        const trimmed = next.trim();
        if (!trimmed) return;
        groups[groupId].name = trimmed;
        saveToLocalStorage();
        renderLayersList();
      };

      // Canvas image uploader callback
      window.handleCanvasImageUpload = function(event) {
        const file = event.target.files[0];
        event.target.value = ''; // allow re-selecting the same file later
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
          const imageDataUrl = e.target.result;
          
          shapeCounter['image'] = (shapeCounter['image'] || 0) + 1;
          const num = shapeCounter['image'];
          
          let newShape = {
            id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: 'image',
            name: 'Image ' + num,
            src: imageDataUrl,
            w: 150,
            h: 150,
            x: Math.round(pendingImageX - 75),
            y: Math.round(pendingImageY - 75),
            fill: 'transparent',
            strokeWidth: 0,
            strokeColor: '#262626',
            borderRadius: 4,
            blur: 0,
            opacity: 100,
            rotation: 0,
            locked: false
          };

          shapes.push(newShape);
          
          // Select the new image
          selectedShapeIds.clear();
          selectedShapeIds.add(newShape.id);
          selectedShapeId = newShape.id;
          
          selectTool('select');
          saveToLocalStorage();
          render();
          switchMobileTab('properties');
        };
        reader.readAsDataURL(file);
      };

      // AI Image Attachment Logic (Desktop)
      window.handleAiImageAttachment = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          attachedImageBase64 = e.target.result;
          const previewDiv = document.getElementById('ai-chat-image-preview');
          const previewImg = document.getElementById('ai-chat-image-preview-img');
          if (previewDiv && previewImg) {
            previewImg.src = e.target.result;
            previewDiv.classList.remove('hidden');
          }
        };
        reader.readAsDataURL(file);
      };

      window.clearAttachedImage = function() {
        attachedImageBase64 = null;
        const previewDiv = document.getElementById('ai-chat-image-preview');
        if (previewDiv) {
          previewDiv.classList.add('hidden');
        }
        const fileInput = document.getElementById('ai-image-uploader');
        if (fileInput) fileInput.value = '';
      };

      // AI Image Attachment Logic (Mobile)
      window.handleAiImageAttachmentMobile = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          attachedImageBase64 = e.target.result;
          const previewDiv = document.getElementById('ai-chat-image-preview-mobile');
          const previewImg = document.getElementById('ai-chat-image-preview-img-mobile');
          if (previewDiv && previewImg) {
            previewImg.src = e.target.result;
            previewDiv.classList.remove('hidden');
          }
        };
        reader.readAsDataURL(file);
      };

      window.clearAttachedImageMobile = function() {
        attachedImageBase64 = null;
        const previewDiv = document.getElementById('ai-chat-image-preview-mobile');
        if (previewDiv) {
          previewDiv.classList.add('hidden');
        }
        const fileInput = document.getElementById('ai-image-uploader-mobile');
        if (fileInput) fileInput.value = '';
      };

      // Toggle Lock Status
      function toggleLock(id) {
        const shape = shapes.find(s => s.id === id);
        if (shape) {
          shape.locked = !shape.locked;
          saveToLocalStorage();
          render();
          updatePropertiesPanel();
        }
      }

      // Bring selected shape (or its whole group) to top layer (end of array)
      window.bringToFront = function(id) {
        const target = shapes.find(s => s.id === id);
        if (!target) return;
        if (target.groupId) {
          const members = shapes.filter(s => s.groupId === target.groupId);
          shapes = shapes.filter(s => s.groupId !== target.groupId);
          shapes.push(...members);
        } else {
          const index = shapes.findIndex(s => s.id === id);
          const [shape] = shapes.splice(index, 1);
          shapes.push(shape);
        }
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      }

      // Send selected shape (or its whole group) to bottom layer (start of array)
      window.sendToBack = function(id) {
        const target = shapes.find(s => s.id === id);
        if (!target) return;
        if (target.groupId) {
          const members = shapes.filter(s => s.groupId === target.groupId);
          shapes = shapes.filter(s => s.groupId !== target.groupId);
          shapes.unshift(...members);
        } else {
          const index = shapes.findIndex(s => s.id === id);
          const [shape] = shapes.splice(index, 1);
          shapes.unshift(shape);
        }
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      }

      window.applyFontFamily = function(fontNameWithFallback) {
        if (!selectedShapeId) return;
        const shape = shapes.find(s => s.id === selectedShapeId);
        if (shape && shape.type === 'text') {
          shape.fontFamily = fontNameWithFallback;
          saveToLocalStorage();
          render();
          updatePropertiesPanel();
        }
      }

      window.addNewCustomFont = function() {
        // NOTE: updatePropertiesPanel() renders the same contentHtml into
        // BOTH the desktop panel and the mobile tab panel, so there are
        // two DOM elements sharing id="new-font-name" / id="new-font-url"
        // at the same time. document.getElementById() would silently grab
        // whichever one appears first (often the hidden desktop copy on
        // mobile), leaving the visible field's value ignored. Query all
        // matches and use the one that's actually visible on screen.
        const pickVisible = (id) => {
          const matches = Array.from(document.querySelectorAll(`#${id}`));
          return matches.find(el => el.offsetParent !== null) || matches[0];
        };

        const nameInput = pickVisible('new-font-name');
        const urlInput = pickVisible('new-font-url');
        if (!nameInput || !urlInput) return;

        const name = nameInput.value.trim();
        let url = urlInput.value.trim();

        if (!name || !url) {
          alert('Please enter both Font Name and Google Font CSS URL.');
          return;
        }

        // Quick input sanitize/auto-correct:
        // If a user just pastes the standard <link href="url" rel="stylesheet"> or some embed, extract the href
        const hrefMatch = url.match(/href="([^"]+)"/);
        if (hrefMatch && hrefMatch[1]) {
          url = hrefMatch[1];
        }

        // The CSS `font-family` value that actually works MUST match the name
        // Google Fonts declares inside the stylesheet — which comes from the
        // `family=` query param, not whatever label the user types (e.g.
        // typing "rubik" for a "Rubik Mono One" URL would silently fail to
        // render, falling back to sans-serif, since 'rubik' matches nothing).
        // Auto-extract the real family name from the URL and use that for
        // the actual CSS value, while keeping the user's typed text as the
        // display label in the font library list.
        let cssFamilyName = name;
        try {
          const familyParam = new URL(url).searchParams.get('family');
          if (familyParam) {
            // family can be like "Rubik+Mono+One:wght@400;700" — strip variants
            cssFamilyName = familyParam.split(':')[0].replace(/\+/g, ' ').trim() || name;
          }
        } catch (e) {
          // Not a parseable URL (e.g. relative path) — fall back to typed name
        }

        // Add to list if not already existing
        const exists = customFonts.some(f => f.name.toLowerCase() === name.toLowerCase());
        if (exists) {
          alert('Font with this name already exists in your library!');
          return;
        }

        customFonts.push({ name, url, cssFamilyName });
        localStorage.setItem('graps_custom_fonts', JSON.stringify(customFonts));
        
        // Dynamically append stylesheet to head immediately
        loadAllCustomFonts();

        // Apply it directly to the active text shape if one is selected!
        if (selectedShapeId) {
          const shape = shapes.find(s => s.id === selectedShapeId);
          if (shape && shape.type === 'text') {
            shape.fontFamily = `'${cssFamilyName}', sans-serif`;
            saveToLocalStorage();
          }
        }

        render();
        updatePropertiesPanel();

        if (cssFamilyName.toLowerCase() !== name.toLowerCase()) {
          console.log(`Font "${name}" registered using actual CSS family name "${cssFamilyName}" (auto-detected from URL).`);
        }
      }

      window.deleteCustomFont = function(name) {
        const removedFont = customFonts.find(f => f.name === name);
        const cssFamily = removedFont ? (removedFont.cssFamilyName || removedFont.name) : name;

        customFonts = customFonts.filter(f => f.name !== name);
        localStorage.setItem('graps_custom_fonts', JSON.stringify(customFonts));
        loadAllCustomFonts();
        
        // Reset shapes that were using this font family back to sans-serif
        shapes.forEach(shape => {
          if (shape.type === 'text' && shape.fontFamily && shape.fontFamily.includes(cssFamily)) {
            shape.fontFamily = 'sans-serif';
          }
        });
        
        saveToLocalStorage();
        render();
        updatePropertiesPanel();
      }

      // Robust clipboard copying function with reliable HTTPS & HTTP fallback
      async function copyTextToClipboard(text, buttonEl) {
        let success = false;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            success = true;
          }
        } catch (err) {
          // Silent fallback
        }

        if (!success) {
          try {
            const isMobile = buttonEl.id.includes('mobile');
            const textarea = document.getElementById(isMobile ? 'export-code-mobile' : 'export-code-desktop');
            textarea.select();
            const successful = document.execCommand('copy');
            if (successful) success = true;
          } catch (err) {
            // Error handling
          }
        }

        if (success) {
          const originalText = buttonEl.innerHTML;
          buttonEl.innerHTML = `
            <svg class="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-green-400 font-bold font-mono">Copied!</span>
          `;
          buttonEl.classList.add('border-green-500/30', 'bg-green-500/10');
          setTimeout(() => {
            buttonEl.innerHTML = originalText;
            buttonEl.classList.remove('border-green-500/30', 'bg-green-500/10');
          }, 1500);
        } else {
          const originalText = buttonEl.innerHTML;
          buttonEl.innerHTML = `<span class="text-red-400">Error</span>`;
          setTimeout(() => {
            buttonEl.innerHTML = originalText;
          }, 1500);
        }
      }

      // Pointer event math utils
      function getDistance(p1, p2) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      }

      function getMidpoint(p1, p2) {
        return {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2
        };
      }

      // Pointer Event handlers for viewport
      function handlePointerDown(e) {
        if (isEditingText) return; // completely lock interaction during typing
        
        const rect = canvasViewport.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        activePointers.set(e.pointerId, { x: clientX, y: clientY, startX: clientX, startY: clientY });
        canvasViewport.setPointerCapture(e.pointerId);

        hasMoved = false;

        // TWO FINGERS PINCH ZOOM DETECTED
        if (activePointers.size === 2) {
          dragMode = 'zoom';
          const pointers = Array.from(activePointers.values());
          const p1 = pointers[0];
          const p2 = pointers[1];
          initialDistance = getDistance(p1, p2);
          initialMidpoint = getMidpoint(p1, p2);
          startScale = scale;
          startPanX = panX;
          startPanY = panY;
          midWorldX = (initialMidpoint.x - rect.left - panX) / scale;
          midWorldY = (initialMidpoint.y - rect.top - panY) / scale;
          return;
        }

        // SINGLE FINGER INTERACTION
        if (activePointers.size === 1) {
          startPointerX = clientX;
          startPointerY = clientY;

          // Bug 1 Fix: If active tool is not 'select', always create a shape immediately
          // at the clicked coordinates and return, ignoring any existing shapes underneath.
          if (activeTool === 'image') {
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;
            pendingImageX = (clickX - panX) / scale;
            pendingImageY = (clickY - panY) / scale;
            // Revert to the select tool immediately: some browsers never fire the
            // file input's 'change' event when the picker is cancelled, so we can't
            // rely on handleCanvasImageUpload to reset activeTool. If we waited,
            // the very next canvas click would silently reopen this dialog again.
            selectTool('select');
            document.getElementById('canvas-image-file-input').click();
            return;
          }
          if (activeTool !== 'select') {
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;
            const worldX = (clickX - panX) / scale;
            const worldY = (clickY - panY) / scale;
            addShapeAt(worldX, worldY);
            return;
          }

          // Detect resize handle
          const handleEl = e.target.closest('.resize-handle');
          if (handleEl) {
            e.stopPropagation();
            const shapeId = handleEl.dataset.id;
            const shape = shapes.find(s => s.id === shapeId);
            if (shape && !shape.locked) {
              dragMode = 'resize';
              dragShapeId = shapeId;
              startShapeW = shape.w;
              startShapeH = shape.h;
              startShapeX = shape.x;
              startShapeY = shape.y;
            }
            return;
          }

          // Detect double-tap text for inline content editing
          const shapeEl = e.target.closest('.shape');
          if (shapeEl) {
            const shapeId = shapeEl.dataset.id;
            const shape = shapes.find(s => s.id === shapeId);
            
            // Check double tap timing
            const now = Date.now();
            if (shape && shape.type === 'text' && now - (shapeEl.dataset.lastTap || 0) < 300) {
              e.stopPropagation();
              enterInlineTextEdit(shapeEl, shape);
              return;
            }
            shapeEl.dataset.lastTap = now;

            if (shape) {
              selectShape(shapeId);
              if (!shape.locked && activeTool === 'select') {
                dragMode = 'drag';
                dragShapeId = shapeId;
                startShapeX = shape.x;
                startShapeY = shape.y;

                // Snapshot starting position of EVERY selected shape (group-aware drag).
                // selectedShapeIds was just synced to the full group by selectShape() above.
                dragGroupStartPositions.clear();
                selectedShapeIds.forEach(sid => {
                  const s = shapes.find(sh => sh.id === sid);
                  if (s) dragGroupStartPositions.set(sid, { x: s.x, y: s.y });
                });
              }
              return;
            }
          }

          // Empty background tapped
          if (activeTool !== 'select') {
            const clickX = clientX - rect.left;
            const clickY = clientY - rect.top;
            const worldX = (clickX - panX) / scale;
            const worldY = (clickY - panY) / scale;
            addShapeAt(worldX, worldY);
          } else {
            // Default select tool background drag = pan canvas
            dragMode = 'pan';
            startPanX = panX;
            startPanY = panY;
          }
        }
      }

      function handlePointerMove(e) {
        if (!activePointers.has(e.pointerId)) return;
        const rect = canvasViewport.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Update active tracking
        const pointer = activePointers.get(e.pointerId);
        pointer.x = clientX;
        pointer.y = clientY;

        // Check if pointer actually moved from origin
        const distMoved = Math.sqrt((clientX - pointer.startX) ** 2 + (clientY - pointer.startY) ** 2);
        if (distMoved > 4) {
          hasMoved = true;
        }

        // Two finger scaling
        if (dragMode === 'zoom' && activePointers.size === 2) {
          const pointers = Array.from(activePointers.values());
          const p1 = pointers[0];
          const p2 = pointers[1];
          const currentDistance = getDistance(p1, p2);
          const currentMidpoint = getMidpoint(p1, p2);

          if (initialDistance > 0) {
            let newScale = startScale * (currentDistance / initialDistance);
            // Lock scale boundary limit
            newScale = Math.min(8.0, Math.max(0.15, newScale));
            scale = newScale;
            
            // Pan world pivot adjustments so zoom stays relative to multi-touch center
            panX = currentMidpoint.x - rect.left - midWorldX * scale;
            panY = currentMidpoint.y - rect.top - midWorldY * scale;
            render();
          }
          return;
        }

        // Pan Canvas
        if (dragMode === 'pan' && activePointers.size === 1) {
          const dx = clientX - startPointerX;
          const dy = clientY - startPointerY;
          panX = startPanX + dx;
          panY = startPanY + dy;
          render();
          return;
        }

        // Drag Shape (and every other shape in the same selection/group)
        if (dragMode === 'drag' && dragShapeId && activePointers.size === 1) {
          const dx = clientX - startPointerX;
          const dy = clientY - startPointerY;
          const worldDx = dx / scale;
          const worldDy = dy / scale;

          const gridSnap = window.canvasConfig ? window.canvasConfig.gridSnap : 1;
          let moved = false;
          dragGroupStartPositions.forEach((startPos, sid) => {
            const s = shapes.find(sh => sh.id === sid);
            if (s && !s.locked) {
              s.x = snapPx(startPos.x + worldDx, gridSnap);
              s.y = snapPx(startPos.y + worldDy, gridSnap);
              moved = true;
            }
          });

          if (moved) {
            render();
            updatePropertiesPanel();
          }
          return;
        }

        // Resize Shape
        if (dragMode === 'resize' && dragShapeId && activePointers.size === 1) {
          const shape = shapes.find(s => s.id === dragShapeId);
          if (shape && !shape.locked) {
            const dx = clientX - startPointerX;
            const dy = clientY - startPointerY;
            const worldDx = dx / scale;
            const worldDy = dy / scale;

            const gridSnap = window.canvasConfig ? window.canvasConfig.gridSnap : 1;
            if (shape.type === 'circle') {
              // Circles are linked 1:1 on visual canvas drag resize
              const maxDelta = Math.max(worldDx, worldDy);
              const newSize = Math.max(10, snapPx(startShapeW + maxDelta, gridSnap));
              shape.w = newSize;
              shape.h = newSize;
            } else {
              shape.w = Math.max(10, snapPx(startShapeW + worldDx, gridSnap));
              shape.h = Math.max(10, snapPx(startShapeH + worldDy, gridSnap));
            }
            render();
            updatePropertiesPanel();
          }
          return;
        }
      }

      function handlePointerUp(e) {
        activePointers.delete(e.pointerId);
        try {
          canvasViewport.releasePointerCapture(e.pointerId);
        } catch(err) {}

        if (activePointers.size === 0) {
          // If tapped background empty space without panning, deselect current
          if (!hasMoved && dragMode === 'pan' && activeTool === 'select') {
            selectShape(null);
          }
          dragMode = null;
          dragShapeId = null;
          dragGroupStartPositions.clear();
          saveToLocalStorage();
        } else if (activePointers.size === 1 && dragMode === 'zoom') {
          // Seamless transition back to pan mode if one touch is released
          dragMode = 'pan';
          const remainingPointer = Array.from(activePointers.values())[0];
          startPointerX = remainingPointer.x;
          startPointerY = remainingPointer.y;
          startPanX = panX;
          startPanY = panY;
        }
      }

      // Enter inline text editing via contenteditable directly on the canvas element
      function enterInlineTextEdit(shapeEl, shape) {
        isEditingText = true;
        const textContainer = shapeEl.querySelector('.text-content');
        if (!textContainer) return;

        textContainer.contentEditable = 'true';
        textContainer.focus();
        
        // Select all text inside on focus
        document.execCommand('selectAll', false, null);

        // Lock document events
        textContainer.addEventListener('blur', onTextBlur);
        textContainer.addEventListener('keydown', onTextKeyDown);

        function onTextBlur() {
          cleanup();
        }

        function onTextKeyDown(ev) {
          // Finish editing on Enter without shift
          if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            textContainer.blur();
          }
          // Escape resets and finishes
          if (ev.key === 'Escape') {
            ev.preventDefault();
            textContainer.innerText = shape.text;
            textContainer.blur();
          }
        }

        function cleanup() {
          textContainer.contentEditable = 'false';
          textContainer.removeEventListener('blur', onTextBlur);
          textContainer.removeEventListener('keydown', onTextKeyDown);
          
          shape.text = textContainer.innerText;
          isEditingText = false;
          saveToLocalStorage();
          render();
          updatePropertiesPanel();
        }
      }

      // Realtime input propagation
      window.updateShapeVal = function(prop, value) {
        if (!selectedShapeId) return;
        const shape = shapes.find(s => s.id === selectedShapeId);
        if (!shape) return;

        // Parse types properly
        if (['x', 'y', 'w', 'h', 'strokeWidth', 'borderRadius', 'blur', 'opacity', 'fontSize', 'rotation'].includes(prop)) {
          value = evaluatePxExpression(value, shape[prop]);
        }

        if (prop === 'opacity') {
          value = Math.min(100, Math.max(0, value));
        }

        shape[prop] = value;
        
        // Link Circle inputs if desired, but user allows independent oval typing:
        // "untuk Circle, W dan H terhubung (lingkaran = rasio 1:1 secara default, tapi tetap bisa diketik beda kalau user mau oval)"
        
        render();
        saveToLocalStorage();
      }

      // Update color swatch preview block when writing hex values
      window.updateSwatch = function(swatchId, hexVal) {
        const swatch = document.getElementById(swatchId);
        if (swatch) {
          // Simple validation
          if (/^#[0-9A-F]{6}$/i.test(hexVal) || /^#[0-9A-F]{3}$/i.test(hexVal)) {
            swatch.style.backgroundColor = hexVal;
          }
        }
      }


