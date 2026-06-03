(function () {
    'use strict';

    const CSS = `
        #chat-toggle-btn {
            position: fixed;
            bottom: 24px;
            left: 24px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: #1a202c;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 22px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, transform 0.15s;
        }
        #chat-toggle-btn:hover { background: #2d3748; transform: scale(1.05); }

        #chat-panel {
            position: fixed;
            bottom: 88px;
            left: 24px;
            width: 360px;
            height: 460px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.22);
            z-index: 999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: transform 0.22s ease, opacity 0.22s ease;
        }
        #chat-panel.chat-hidden {
            transform: translateY(16px);
            opacity: 0;
            pointer-events: none;
        }

        #chat-header {
            background: #1a202c;
            color: white;
            padding: 13px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        #chat-header-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }
        #chat-header-sub {
            font-size: 10px;
            color: #a0aec0;
            margin-top: 1px;
        }
        #chat-close-btn {
            background: none;
            border: none;
            color: #a0aec0;
            cursor: pointer;
            font-size: 22px;
            line-height: 1;
            padding: 0;
            margin-left: 8px;
        }
        #chat-close-btn:hover { color: white; }

        #chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #f8f9fa;
        }
        #chat-messages::-webkit-scrollbar { width: 4px; }
        #chat-messages::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 2px; }

        .chat-bubble {
            max-width: 88%;
            padding: 9px 13px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.55;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .chat-bubble.user {
            align-self: flex-end;
            background: #1a202c;
            color: white;
            border-bottom-right-radius: 3px;
        }
        .chat-bubble.assistant {
            align-self: flex-start;
            background: white;
            color: #1a202c;
            border-bottom-left-radius: 3px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .chat-bubble.assistant.streaming { opacity: 0.85; }
        .chat-system-note {
            align-self: center;
            font-size: 11px;
            color: #a0aec0;
            text-align: center;
            padding: 2px 8px;
        }

        #chat-input-row {
            display: flex;
            padding: 10px;
            border-top: 1px solid #e2e8f0;
            gap: 8px;
            flex-shrink: 0;
            background: white;
        }
        #chat-input {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            font-family: inherit;
            outline: none;
            background: #f8f9fa;
            color: #1a202c;
            transition: border-color 0.15s;
        }
        #chat-input:focus { border-color: #1a202c; background: white; }
        #chat-send-btn {
            background: #1a202c;
            color: white;
            border: none;
            border-radius: 8px;
            width: 36px;
            height: 36px;
            cursor: pointer;
            font-size: 17px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.15s;
        }
        #chat-send-btn:hover:not(:disabled) { background: #2d3748; }
        #chat-send-btn:disabled { background: #cbd5e0; cursor: not-allowed; }
    `;

    function init(getContextFn) {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.innerHTML = `
            <button id="chat-toggle-btn" title="Ask AI about the data">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </button>
            <div id="chat-panel" class="chat-hidden">
                <div id="chat-header">
                    <div>
                        <div id="chat-header-title">Walkability AI</div>
                        <div id="chat-header-sub">Powered by Gemini</div>
                    </div>
                    <button id="chat-close-btn" title="Close">×</button>
                </div>
                <div id="chat-messages">
                    <div class="chat-system-note">Ask about walkability scores, county comparisons, or methodology.</div>
                </div>
                <div id="chat-input-row">
                    <input id="chat-input" type="text" placeholder="Ask about the data…" autocomplete="off" />
                    <button id="chat-send-btn" title="Send">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const panel    = document.getElementById('chat-panel');
        const toggle   = document.getElementById('chat-toggle-btn');
        const closeBtn = document.getElementById('chat-close-btn');
        const input    = document.getElementById('chat-input');
        const sendBtn  = document.getElementById('chat-send-btn');
        const messages = document.getElementById('chat-messages');

        const history = [];

        toggle.addEventListener('click', () => {
            const isHidden = panel.classList.toggle('chat-hidden');
            if (!isHidden) input.focus();
        });
        closeBtn.addEventListener('click', () => panel.classList.add('chat-hidden'));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        });
        sendBtn.addEventListener('click', send);

        function addBubble(role, text) {
            const el = document.createElement('div');
            el.className = `chat-bubble ${role}`;
            el.textContent = text;
            messages.appendChild(el);
            messages.scrollTop = messages.scrollHeight;
            return el;
        }

        async function send() {
            const text = input.value.trim();
            if (!text || sendBtn.disabled) return;

            input.value = '';
            sendBtn.disabled = true;
            addBubble('user', text);
            history.push({ role: 'user', content: text });

            const assistantEl = addBubble('assistant', '');
            assistantEl.classList.add('streaming');

            // Typing indicator while waiting for first token
            assistantEl.innerHTML = '<span style="color:#a0aec0;font-size:18px;letter-spacing:3px">···</span>';

            const mapContext = getContextFn ? getContextFn() : null;

            try {
                const resp = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: history, mapContext })
                });

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
                    assistantEl.textContent = `Error: ${err.error}`;
                    assistantEl.classList.remove('streaming');
                    history.pop();
                    return;
                }

                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let buf = '';
                let assistantText = '';
                let firstToken = true;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop();

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const payload = line.slice(6).trim();
                        if (payload === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(payload);
                            if (parsed.error) {
                                assistantEl.textContent = `Error: ${parsed.error}`;
                                assistantEl.classList.remove('streaming');
                                history.pop();
                                return;
                            }
                            if (parsed.delta) {
                                if (firstToken) { assistantEl.textContent = ''; firstToken = false; }
                                assistantText += parsed.delta;
                                assistantEl.textContent = assistantText;
                                messages.scrollTop = messages.scrollHeight;
                            }
                        } catch (_) { /* skip malformed SSE line */ }
                    }
                }

                assistantEl.classList.remove('streaming');
                history.push({ role: 'assistant', content: assistantText });
            } catch (err) {
                assistantEl.textContent = `Network error: ${err.message}`;
                assistantEl.classList.remove('streaming');
                history.pop();
            } finally {
                sendBtn.disabled = false;
                input.focus();
            }
        }
    }

    window.ChatWidget = { init };
})();
