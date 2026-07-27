/* NOWACTION — extracted from public/index.html (lines 1133-1508 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      // Event listener registration
      function setupEventListeners() {
        // Pointer Events for pan & zoom & drag & resize
        canvasViewport.addEventListener('pointerdown', handlePointerDown);
        canvasViewport.addEventListener('pointermove', handlePointerMove);
        canvasViewport.addEventListener('pointerup', handlePointerUp);
        canvasViewport.addEventListener('pointercancel', handlePointerUp);

        // Prevent default touch actions (pinch zoom scrolling)
        canvasViewport.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvasViewport.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Toolbar buttons
        const tools = ['select', 'rectangle', 'circle', 'text', 'image'];
        tools.forEach(tool => {
          document.getElementById(`tool-${tool}`).addEventListener('click', () => {
            selectTool(tool);
          });
        });

        // Key bindings for keyboard (good fallback for hybrid devices)
        window.addEventListener('keydown', (e) => {
          if (isEditingText) return; // ignore when typing
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

          if (e.key === 's' || e.key === 'S') selectTool('select');
          if (e.key === 'r' || e.key === 'R') selectTool('rectangle');
          if (e.key === 'c' || e.key === 'C') selectTool('circle');
          if (e.key === 't' || e.key === 'T') selectTool('text');
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShapeId) deleteShape(selectedShapeId);
          }
        });

        // Top actions
        btnResetView.addEventListener('click', resetViewToCenter);
        btnExportTop.addEventListener('click', openExportModal);
        btnPreviewTop.addEventListener('click', openLivePreview);
        btnCloseModal.addEventListener('click', closeExportModal);

        // Projects modal (Phase 2)
        btnCurrentProject.addEventListener('click', openProjectsModal);
        btnCloseProjectsModal.addEventListener('click', closeProjectsModal);
        btnNewProject.addEventListener('click', createNewProject);
        projectsSearchInput.addEventListener('input', (e) => renderProjectsList(e.target.value));

        // Select All button actions
        document.getElementById('btn-select-all-desktop').addEventListener('click', () => {
          const textarea = document.getElementById('export-code-desktop');
          textarea.select();
        });
        document.getElementById('btn-select-all-mobile').addEventListener('click', () => {
          const textarea = document.getElementById('export-code-mobile');
          textarea.select();
        });

        // Copy button actions
        document.getElementById('btn-copy-desktop').addEventListener('click', (e) => {
          const text = document.getElementById('export-code-desktop').value;
          copyTextToClipboard(text, e.currentTarget);
        });
        document.getElementById('btn-copy-mobile').addEventListener('click', (e) => {
          const text = document.getElementById('export-code-mobile').value;
          copyTextToClipboard(text, e.currentTarget);
        });

        // Download actions (desktop)
        document.getElementById('btn-download-html-desktop').addEventListener('click', downloadCombinedHTML);
        document.getElementById('btn-download-zip-desktop').addEventListener('click', downloadSeparateZIP);
        document.getElementById('btn-export-project').addEventListener('click', downloadBackupProjectFile);

        // Download actions (mobile)
        document.getElementById('btn-download-html-mobile').addEventListener('click', downloadCombinedHTML);
        document.getElementById('btn-download-zip-mobile').addEventListener('click', downloadSeparateZIP);
      }

      // MOBILE TAB NAVIGATION SYSTEM
      function setupMobileTabs() {
        const tabs = ['layers', 'properties', 'export', 'ai'];
        tabs.forEach(tab => {
          document.getElementById(`btn-tab-${tab}`).addEventListener('click', () => {
            switchMobileTab(tab);
          });
        });
      }

      async function switchMobileTab(targetTab) {
        const tabs = ['layers', 'properties', 'export', 'ai'];
        tabs.forEach(tab => {
          const btn = document.getElementById(`btn-tab-${tab}`);
          const panel = document.getElementById(`mobile-tab-${tab}`);
          
          if (tab === targetTab) {
            btn.classList.add('text-accent');
            btn.classList.remove('text-textSec');
            panel.classList.remove('hidden');
          } else {
            btn.classList.remove('text-accent');
            btn.classList.add('text-textSec');
            panel.classList.add('hidden');
          }
        });
        
        // Populate export code inside mobile sheet on tap
        if (targetTab === 'export') {
          const textarea = document.getElementById('export-code-mobile');
          textarea.value = 'Generating…';
          textarea.value = await generateExportCode();
        }
      }

      // Tool selection
      function selectTool(tool) {
        activeTool = tool;
        
        // Highlight active button in toolbar
        const tools = ['select', 'rectangle', 'circle', 'text', 'image'];
        tools.forEach(t => {
          const btn = document.getElementById(`tool-${t}`);
          if (t === tool) {
            btn.classList.add('text-accent', 'bg-accent/10');
            btn.classList.remove('text-textSec');
          } else {
            btn.classList.remove('text-accent', 'bg-accent/10');
            btn.classList.add('text-textSec');
          }
        });

        if (tool !== 'select') {
          // Deselect when changing to drawing tool
          selectShape(null);
        }
      }

      function getGoogleFontsExportLinks() {
        // Collect custom fonts that are actually used by text shapes
        const usedFontNames = new Set();
        shapes.forEach(shape => {
          if (shape.type === 'text' && shape.fontFamily) {
            const cleanName = shape.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            usedFontNames.add(cleanName);
          }
        });

        let linksHtml = '';
        customFonts.forEach(font => {
          if (usedFontNames.has(font.cssFamilyName || font.name)) {
            linksHtml += `<link rel="stylesheet" href="${font.url}">\n`;
          }
        });
        return linksHtml;
      }

      // Generate HTML/CSS inline spec
      // Cache the runtime source so we don't re-fetch it on every export.
      let _scrollAnimRuntimeSrcCache = null;
      async function getScrollAnimRuntimeSource() {
        if (_scrollAnimRuntimeSrcCache) return _scrollAnimRuntimeSrcCache;
        try {
          const res = await fetch('/js/scroll-anim-runtime.js');
          _scrollAnimRuntimeSrcCache = await res.text();
        } catch (e) {
          console.error('Failed to fetch scroll-anim-runtime.js for export', e);
          _scrollAnimRuntimeSrcCache = '/* ScrollAnim runtime failed to load — animations will not run. */';
        }
        return _scrollAnimRuntimeSrcCache;
      }

      async function generateExportCode() {
        if (shapes.length === 0) return '<!-- No elements in canvas -->';

        // Compute the real bounding box of all shapes. The canvas is
        // infinite (shapes can have negative x/y from panning), so we can't
        // assume anything starts at (0,0) — normalize everything relative
        // to the top-left of this bounding box instead.
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        shapes.forEach((s) => {
          const x = s.x || 0;
          const y = s.y || 0;
          const w = s.w || 100;
          const h = s.h || 100;
          if (x < minX) minX = x;
          if (x + w > maxX) maxX = x + w;
          if (y < minY) minY = y;
          if (y + h > maxY) maxY = y + h;
        });

        // Use Artboard dimensions when a frame is active
        const cfg = window.canvasConfig;
        let contentWidth, contentHeight;
        if (cfg && cfg.preset !== 'infinite') {
          // Artboard mode: canvas origin is (0,0), offset shapes relative to frame
          minX = Math.min(minX, 0);
          minY = Math.min(minY, 0);
          contentWidth  = cfg.width;
          contentHeight = cfg.height;
        } else {
          contentWidth  = Math.max(1, Math.round(maxX - minX));
          contentHeight = Math.max(1, Math.round(maxY - minY));
        }

        const artboardActive = cfg && cfg.preset !== 'infinite';
        let html = `<!-- Spec template exported from NOWACTION${artboardActive ? ` — Artboard ${contentWidth}×${contentHeight}px` : ''} -->\n`;
        html += getGoogleFontsExportLinks();
        html += `<div style="position:relative; width:${contentWidth}px; height:${contentHeight}px; background:#0a0a0a; overflow:hidden;">\n`;

        const animManifest = [];

        shapes.forEach(shape => {
          const displayX = Math.round((shape.x || 0) - minX);
          const displayY = Math.round((shape.y || 0) - minY);
          const opacityVal = (shape.opacity / 100).toFixed(2);
          const borderStyle = shape.strokeWidth > 0 ? `${shape.strokeWidth}px solid ${shape.strokeColor}` : 'none';
          const blurStyle = shape.blur > 0 ? `blur(${shape.blur}px)` : 'none';
          const borderRadiusStyle = shape.type === 'circle' ? '50%' : `${shape.borderRadius}px`;
          const rotateStyle = `rotate(${shape.rotation || 0}deg)`;

          const hasAnim = shape.animation && shape.animation.enabled &&
            ((shape.animation.keyframes && shape.animation.keyframes.length > 0) ||
             Object.values(shape.animation.tracks || {}).some(t => t && t.length > 0));
          const animAttr = hasAnim ? ` data-anim-id="${shape.id}"` : '';
          if (hasAnim) {
            // Always export as unified keyframes; migrate old tracks on the fly if needed
            animManifest.push({
              id: shape.id,
              mode: shape.animation.mode,
              trigger: shape.animation.trigger,
              keyframes: shape.animation.keyframes
                || window.ScrollAnim.migrateTracksToKeyframes(shape.animation.tracks || {})
            });
          }
          
          if (shape.type === 'text') {
            const fontStyle = shape.fontFamily ? `font-family:${shape.fontFamily};` : 'font-family:sans-serif;';
            html += `  <div${animAttr} style="position:absolute; left:${displayX}px; top:${displayY}px; width:${shape.w}px; height:${shape.h}px; background:${shape.fill}; border:${borderStyle}; border-radius:${borderRadiusStyle}; filter:${blurStyle}; opacity:${opacityVal}; transform:${rotateStyle}; color:${shape.textColor}; font-size:${shape.fontSize}px; ${fontStyle} display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; overflow:hidden; white-space:pre-wrap; word-break:break-word; padding:8px;">${shape.text}</div>\n`;
          } else {
            html += `  <div${animAttr} style="position:absolute; left:${displayX}px; top:${displayY}px; width:${shape.w}px; height:${shape.h}px; background:${shape.fill}; border:${borderStyle}; border-radius:${borderRadiusStyle}; filter:${blurStyle}; opacity:${opacityVal}; transform:${rotateStyle}; box-sizing:border-box;"></div>\n`;
          }
        });
        
        html += '</div>\n';

        if (animManifest.length > 0) {
          const runtimeSrc = await getScrollAnimRuntimeSource();
          html += `<script>\n${runtimeSrc}\n<\/script>\n`;
          html += `<script>\n  ScrollAnim.init(${JSON.stringify(animManifest, null, 2)});\n<\/script>\n`;
        }

        return html;
      }

      // Opens a real, scrollable standalone page in a new tab so the person
      // can actually scroll and see the scroll-driven keyframe animations
      // play for real — not a faked scrub inside the editor.
      let _lastPreviewUrl = null;
      async function openLivePreview() {
        if (shapes.length === 0) { alert('No elements in canvas to preview!'); return; }
        if (_lastPreviewUrl) { URL.revokeObjectURL(_lastPreviewUrl); _lastPreviewUrl = null; }
        const fragment = await generateExportCode();
        const fullDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Preview — NOWACTION</title>
<style>html,body{margin:0;padding:0;background:#0a0a0a;}</style>
</head>
<body>
${fragment}
</body>
</html>`;
        const blob = new Blob([fullDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        _lastPreviewUrl = url;
        window.open(url, '_blank');
      }

      async function openExportModal() {
        const textarea = document.getElementById('export-code-desktop');
        textarea.value = 'Generating…';
        exportModal.classList.remove('hidden');
        textarea.value = await generateExportCode();
      }

      function closeExportModal() {
        exportModal.classList.add('hidden');
      }

      async function downloadCombinedHTML() {
        const code = await generateExportCode();
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graps_export_combined.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      async function downloadSeparateZIP() {
        if (typeof JSZip === 'undefined') {
          alert('JSZip library is still loading or failed to load. Please try again in a moment.');
          return;
        }
        
        if (shapes.length === 0) {
          alert('No elements in canvas to export!');
          return;
        }
        
        const zip = new JSZip();
        
        // Include combined index.html at root
        const combinedCode = await generateExportCode();
        zip.file('index.html', combinedCode);

        // Only fetch the runtime once, and only if at least one shape needs it.
        const anyAnimated = shapes.some(s => s.animation && s.animation.enabled &&
          ((s.animation.keyframes && s.animation.keyframes.length > 0) ||
           Object.values(s.animation.tracks || {}).some(t => t && t.length > 0)));
        const runtimeSrc = anyAnimated ? await getScrollAnimRuntimeSource() : null;
        if (runtimeSrc) {
          zip.file('js/scroll-anim-runtime.js', runtimeSrc);
        }
        
        shapes.forEach((shape, index) => {
          const opacityVal = (shape.opacity / 100).toFixed(2);
          const borderStyle = shape.strokeWidth > 0 ? `${shape.strokeWidth}px solid ${shape.strokeColor}` : 'none';
          const blurStyle = shape.blur > 0 ? `blur(${shape.blur}px)` : 'none';
          const borderRadiusStyle = shape.type === 'circle' ? '50%' : `${shape.borderRadius}px`;
          const rotateStyle = `rotate(${shape.rotation || 0}deg)`;

          const hasAnim = shape.animation && shape.animation.enabled &&
            ((shape.animation.keyframes && shape.animation.keyframes.length > 0) ||
             Object.values(shape.animation.tracks || {}).some(t => t && t.length > 0));
          const animAttr = hasAnim ? ` data-anim-id="${shape.id}"` : '';
          
          let compHtml = '';
          
          // Add Google Font import links if this text shape uses any
          if (shape.type === 'text' && shape.fontFamily) {
            const cleanName = shape.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            const foundFont = customFonts.find(f => (f.cssFamilyName || f.name).toLowerCase() === cleanName.toLowerCase());
            if (foundFont) {
              compHtml += `<!-- Google Font: ${foundFont.name} -->\n<link rel="stylesheet" href="${foundFont.url}">\n\n`;
            }
          }
          
          compHtml += `<!-- Component: ${shape.name} -->\n`;
          if (shape.type === 'text') {
            const fontStyle = shape.fontFamily ? `font-family:${shape.fontFamily};` : 'font-family:sans-serif;';
            compHtml += `<div${animAttr} style="position:relative; width:${shape.w}px; height:${shape.h}px; background:${shape.fill}; border:${borderStyle}; border-radius:${borderRadiusStyle}; filter:${blurStyle}; opacity:${opacityVal}; transform:${rotateStyle}; color:${shape.textColor}; font-size:${shape.fontSize}px; ${fontStyle} display:flex; align-items:center; justify-content:center; text-align:center; box-sizing:border-box; overflow:hidden; white-space:pre-wrap; word-break:break-word; padding:8px;">${shape.text}</div>\n`;
          } else {
            compHtml += `<div${animAttr} style="position:relative; width:${shape.w}px; height:${shape.h}px; background:${shape.fill}; border:${borderStyle}; border-radius:${borderRadiusStyle}; filter:${blurStyle}; opacity:${opacityVal}; transform:${rotateStyle}; box-sizing:border-box;"></div>\n`;
          }

          if (hasAnim) {
            const manifest = [{
              id: shape.id,
              mode: shape.animation.mode,
              trigger: shape.animation.trigger,
              keyframes: shape.animation.keyframes
                || window.ScrollAnim.migrateTracksToKeyframes(shape.animation.tracks || {})
            }];
            compHtml += `\n<!-- Requires js/scroll-anim-runtime.js (included in this zip) -->\n`;
            compHtml += `<script src="../js/scroll-anim-runtime.js"><\/script>\n`;
            compHtml += `<script>\n  ScrollAnim.init(${JSON.stringify(manifest, null, 2)});\n<\/script>\n`;
          }
          
          // Clean safe filename
          const cleanName = shape.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const filename = `${String(index + 1).padStart(2, '0')}_${cleanName}.html`;
          zip.file(`components/${filename}`, compHtml);
        });
        
        zip.generateAsync({ type: 'blob' }).then(function (content) {
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'graps_components_export.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }).catch(err => {
          console.error(err);
          alert('Failed to generate ZIP file.');
        });
      }




