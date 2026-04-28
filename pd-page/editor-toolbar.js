(function () {
    'use strict';

    const TOOLBAR_ID = 'pdEditorToolbar';

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

        const buttons = [
            { cmd: 'bold', label: 'B', title: 'Bold (Ctrl+B)', style: 'font-weight: bold' },
            { cmd: 'italic', label: 'I', title: 'Italic (Ctrl+I)', style: 'font-style: italic' },
            { cmd: 'underline', label: 'U', title: 'Underline (Ctrl+U)', style: 'text-decoration: underline' },
            { cmd: 'strikeThrough', label: 'S', title: 'Strikethrough' },
            { sep: true },
            { cmd: 'insertUnorderedList', label: '• List', title: 'Bullet list' },
            { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
            { sep: true },
            { cmd: 'justifyLeft', label: '⬅', title: 'Align left' },
            { cmd: 'justifyCenter', label: '⬇', title: 'Align center' },
            { cmd: 'justifyRight', label: '➡', title: 'Align right' },
            { sep: true },
            { cmd: 'removeFormat', label: 'Clear', title: 'Clear formatting' },
            { cmd: 'undo', label: '↶', title: 'Undo' },
            { cmd: 'redo', label: '↷', title: 'Redo' },
            { type: 'save', label: '💾 Save', title: 'Save changes' }
        ];

        buttons.forEach((btn, idx) => {
            if (btn.sep) {
                const sep = document.createElement('div');
                sep.style.cssText = 'width: 1px; background: #444; margin: 0 4px;';
                toolbar.appendChild(sep);
                return;
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = btn.label;
            button.title = btn.title;
            button.dataset.adminControl = '1';
            button.style.cssText = `
                padding: 6px 10px;
                background: ${btn.type === 'save' ? '#1b5e20' : '#2b2b2b'};
                color: #fff;
                border: 1px solid ${btn.type === 'save' ? '#2e7d32' : '#444'};
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                min-width: 32px;
                ${btn.style || ''}
            `;

            button.addEventListener('mouseover', () => {
                button.style.background = btn.type === 'save' ? '#2e7d32' : '#3a3a3a';
            });

            button.addEventListener('mouseout', () => {
                button.style.background = btn.type === 'save' ? '#1b5e20' : '#2b2b2b';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (btn.type === 'save') {
                    if (window.savePage) window.savePage();
                } else {
                    document.execCommand(btn.cmd, false, null);
                }
            });

            toolbar.appendChild(button);
        });

        document.body.appendChild(toolbar);
        return toolbar;
    }

    window.pdEditorToolbar = {
        show: function() {
            const toolbar = createToolbar();
            toolbar.style.display = 'flex';
        },
        hide: function() {
            const toolbar = document.getElementById(TOOLBAR_ID);
            if (toolbar) toolbar.style.display = 'none';
        }
    };
})();
