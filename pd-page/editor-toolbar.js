(function () {
    'use strict';

    const TOOLBAR_ID = 'pdEditorToolbar';
    const TOOLBAR_VISIBLE_KEY = 'pd_editor_toolbar_visible';

    function createToolbar() {
        let toolbar = document.getElementById(TOOLBAR_ID);
        if (toolbar) return toolbar;

        toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        toolbar.setAttribute('data-admin-control', '1');
        toolbar.setAttribute('contenteditable', 'false');
        toolbar.style.cssText = `
            display: none;
            position: fixed;
            top: 60px;
            left: 20px;
            right: 20px;
            background: #1f1f1f;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            z-index: 99998;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            flex-wrap: wrap;
            gap: 8px;
            font-size: 0;
        `;

        const groups = [
            {
                name: 'text-style',
                buttons: [
                    { cmd: 'bold', label: 'B', title: 'Bold (Ctrl+B)', style: 'font-weight: bold' },
                    { cmd: 'italic', label: 'I', title: 'Italic (Ctrl+I)', style: 'font-style: italic' },
                    { cmd: 'underline', label: 'U', title: 'Underline (Ctrl+U)', style: 'text-decoration: underline' },
                    { cmd: 'strikeThrough', label: 'S', title: 'Strikethrough' }
                ]
            },
            {
                name: 'lists',
                buttons: [
                    { cmd: 'insertUnorderedList', label: '• List', title: 'Bullet list' },
                    { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' }
                ]
            },
            {
                name: 'align',
                buttons: [
                    { cmd: 'justifyLeft', label: '⬅', title: 'Align left' },
                    { cmd: 'justifyCenter', label: '⬇', title: 'Align center' },
                    { cmd: 'justifyRight', label: '➡', title: 'Align right' },
                    { cmd: 'justifyFull', label: '⬌', title: 'Justify' }
                ]
            },
            {
                name: 'font-size',
                buttons: [
                    {
                        type: 'select',
                        id: 'fontSizeSelect',
                        title: 'Font size',
                        options: [
                            { value: '1', label: 'Small (10px)' },
                            { value: '3', label: 'Normal (16px)' },
                            { value: '5', label: 'Large (24px)' },
                            { value: '6', label: 'XLarge (32px)' }
                        ]
                    }
                ]
            },
            {
                name: 'color',
                buttons: [
                    {
                        type: 'color',
                        id: 'textColorPicker',
                        title: 'Text color',
                        icon: 'A'
                    },
                    {
                        type: 'color',
                        id: 'bgColorPicker',
                        title: 'Highlight color',
                        icon: '🎨'
                    }
                ]
            },
            {
                name: 'other',
                buttons: [
                    { cmd: 'removeFormat', label: 'Clear', title: 'Clear formatting' },
                    { cmd: 'undo', label: '↶', title: 'Undo' },
                    { cmd: 'redo', label: '↷', title: 'Redo' }
                ]
            }
        ];

        groups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.style.cssText = 'display: flex; gap: 4px; border-right: 1px solid #444; padding-right: 8px;';
            if (group === groups[groups.length - 1]) groupDiv.style.borderRight = 'none';

            group.buttons.forEach(btn => {
                if (btn.type === 'select') {
                    const select = document.createElement('select');
                    select.id = btn.id;
                    select.title = btn.title;
                    select.style.cssText = `
                        padding: 6px 8px;
                        background: #2b2b2b;
                        color: #fff;
                        border: 1px solid #444;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    `;
                    btn.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', function () {
                        document.execCommand('fontSize', false, this.value);
                        this.value = '3';
                    });
                    groupDiv.appendChild(select);
                } else if (btn.type === 'color') {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.id = btn.id;
                    input.title = btn.title;
                    input.value = '#ffffff';
                    input.style.cssText = 'width: 32px; height: 32px; cursor: pointer; border: 1px solid #444; border-radius: 4px;';
                    input.addEventListener('change', function () {
                        if (btn.id === 'textColorPicker') {
                            document.execCommand('foreColor', false, this.value);
                        } else {
                            document.execCommand('backColor', false, this.value);
                        }
                    });
                    groupDiv.appendChild(input);
                } else {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = btn.label;
                    button.title = btn.title;
                    button.dataset.adminControl = '1';
                    button.style.cssText = `
                        padding: 6px 10px;
                        background: #2b2b2b;
                        color: #fff;
                        border: 1px solid #444;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        min-width: 32px;
                        ${btn.style || ''}
                    `;
                    button.addEventListener('mouseover', () => {
                        button.style.background = '#3a3a3a';
                    });
                    button.addEventListener('mouseout', () => {
                        button.style.background = '#2b2b2b';
                    });
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.execCommand(btn.cmd, false, null);
                        document.body.focus();
                    });
                    groupDiv.appendChild(button);
                }
            });

            toolbar.appendChild(groupDiv);
        });

        document.body.appendChild(toolbar);
        return toolbar;
    }

    function showToolbar() {
        const toolbar = createToolbar();
        toolbar.style.display = 'flex';
        enhanceImageEditing(); // Re-enhance images when entering edit mode
        try {
            localStorage.setItem(TOOLBAR_VISIBLE_KEY, '1');
        } catch { }
    }

    function hideToolbar() {
        const toolbar = document.getElementById(TOOLBAR_ID);
        if (toolbar) {
            toolbar.style.display = 'none';
            try {
                localStorage.setItem(TOOLBAR_VISIBLE_KEY, '0');
            } catch { }
        }
    }

    function isToolbarVisible() {
        return document.getElementById(TOOLBAR_ID)?.style.display !== 'none';
    }

    // Make images draggable and resizable in edit mode
    function enhanceImageEditing() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.dataset.adminControl === '1') return;

            img.style.maxWidth = '100%';
            img.style.cursor = 'grab';

            // Make image selectable
            img.addEventListener('click', (e) => {
                if (document.body.contentEditable !== 'true') return;
                e.preventDefault();
                e.stopPropagation();

                // Select the image
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(img);
                selection.removeAllRanges();
                selection.addRange(range);

                // Add visual indicator
                img.style.outline = '2px solid #e53935';
                img.style.outlineOffset = '2px';
            });

            // Make draggable
            img.draggable = true;
            img.addEventListener('dragstart', (e) => {
                if (document.body.contentEditable !== 'true') return;
                e.dataTransfer.effectAllowed = 'move';
                img.style.opacity = '0.5';
            });

            img.addEventListener('dragend', (e) => {
                img.style.opacity = '1';
            });
        });

        // Allow drop on the page
        document.addEventListener('dragover', (e) => {
            if (document.body.contentEditable !== 'true') return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        // Make body properly editable - handle clicks in empty areas
        const body = document.body;
        body.addEventListener('click', (e) => {
            if (document.body.contentEditable !== 'true') return;

            // Click on image - already handled by img click handler
            if (e.target.tagName === 'IMG') return;

            // Click on edit controls - don't interfere
            if (e.target.getAttribute('data-admin-control') === '1') return;

            // Remove image outlines when clicking elsewhere
            document.querySelectorAll('img').forEach(img => {
                if (img !== e.target) img.style.outline = 'none';
            });

            // If we're in edit mode, ensure focus and position cursor
            body.focus();
            if (window.getSelection().rangeCount === 0) {
                const range = document.createRange();
                range.setStart(body, body.childNodes.length);
                range.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });

        // Allow deletion of selected images with Delete or Backspace
        document.addEventListener('keydown', (e) => {
            if (document.body.contentEditable !== 'true') return;
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;

            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const img = container.nodeType === 3 ? container.parentElement : container;

            if (img.tagName === 'IMG') {
                e.preventDefault();
                img.remove();
            }
        });
    }

    // Expose functions globally
    window.pdEditorToolbar = {
        show: showToolbar,
        hide: hideToolbar,
        isVisible: isToolbarVisible
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceImageEditing);
    } else {
        enhanceImageEditing();
    }
})();
