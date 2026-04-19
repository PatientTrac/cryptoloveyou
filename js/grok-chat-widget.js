;(function () {
  if (document.getElementById('grok-widget')) return

  var API_CHAT = '/.netlify/functions/grok-chat'
  var API_STT  = '/.netlify/functions/stt'

  // Tailwind CDN
  if (!document.querySelector('script[data-clw-tw]')) {
    var tw = document.createElement('script')
    tw.src = 'https://cdn.tailwindcss.com'
    tw.defer = true
    tw.setAttribute('data-clw-tw', '1')
    document.head.appendChild(tw)
  }

  var style = document.createElement('style')
  style.textContent =
    '#grok-widget,#grok-float-btn{all:initial;font-family:system-ui,sans-serif}' +
    '#grok-widget{position:fixed;bottom:24px;right:24px;width:384px;height:560px;' +
    'background:#0f172a;border:1px solid rgba(167,139,250,.3);border-radius:24px;' +
    'overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;z-index:9999}' +
    '#grok-float-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;' +
    'background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:16px;' +
    'display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;' +
    'cursor:pointer;box-shadow:0 8px 32px rgba(124,58,237,.5);border:none;z-index:9998;transition:transform .2s}' +
    '#grok-float-btn:hover{transform:scale(1.1)}' +
    '#grok-messages::-webkit-scrollbar{width:4px}' +
    '#grok-messages::-webkit-scrollbar-thumb{background:rgba(139,92,246,.4);border-radius:2px}' +
    '@media(max-width:480px){#grok-widget{width:100vw!important;height:100vh!important;bottom:0!important;right:0!important;border-radius:0!important}}'
  document.head.appendChild(style)

  var widget = document.createElement('div')
  widget.id = 'grok-widget'
  widget.style.display = 'none'
  widget.innerHTML =
    '<div style="background:linear-gradient(90deg,#6d28d9,#9333ea);padding:16px 20px;' +
    'display:flex;align-items:center;gap:12px;color:#fff;flex-shrink:0;position:relative">' +
      '<span style="font-size:22px;font-weight:700">𝕏</span>' +
      '<div style="font-weight:600;font-size:15px">Grok • CryptoLoveYou AI</div>' +
      '<div style="position:absolute;right:48px;top:14px;font-size:18px">❤️</div>' +
      '<button id="grok-close" style="position:absolute;right:18px;top:12px;background:none;border:none;' +
      'color:#fff;font-size:22px;cursor:pointer;opacity:.8;line-height:1">✕</button>' +
    '</div>' +
    '<div id="grok-messages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;background:#0f172a"></div>' +
    '<div style="padding:14px 16px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;background:#0f172a;flex-shrink:0">' +
      '<button id="grok-mic" style="width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.1);' +
      'border:none;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">🎤</button>' +
      '<input id="grok-input" type="text" placeholder="Ask Grok anything..." ' +
      'style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);' +
      'border-radius:999px;padding:10px 18px;color:#fff;font-size:13px;outline:none">' +
      '<button id="grok-send" style="padding:10px 22px;background:linear-gradient(90deg,#7c3aed,#9333ea);' +
      'color:#fff;border:none;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0">Send</button>' +
    '</div>'

  var floatBtn = document.createElement('button')
  floatBtn.id = 'grok-float-btn'
  floatBtn.setAttribute('aria-label', 'Open Grok chat')
  floatBtn.style.display = 'none'
  floatBtn.textContent = '𝕏'

  document.body.appendChild(widget)
  document.body.appendChild(floatBtn)

  var msgs     = document.getElementById('grok-messages')
  var input    = document.getElementById('grok-input')
  var sendBtn  = document.getElementById('grok-send')
  var micBtn   = document.getElementById('grok-mic')
  var closeBtn = document.getElementById('grok-close')
  var welcomed = false

  function openWidget () {
    widget.style.display = 'flex'
    floatBtn.style.display = 'none'
    if (!welcomed) {
      welcomed = true
      addBotMsg('Hey! I\'m Grok from CryptoLoveYou ❤️ You can ask me <strong style="color:#c4b5fd">anything</strong> — or just tap the mic and speak!')
    }
    input.focus()
  }

  function closeWidget () {
    widget.style.display = 'none'
    floatBtn.style.display = 'flex'
  }

  closeBtn.addEventListener('click', closeWidget)
  floatBtn.addEventListener('click', openWidget)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openWidget)
  } else {
    openWidget()
  }

  // ── Helpers ──────────────────────────────────────────────────
  function escapeHtml (t) {
    var d = document.createElement('div')
    d.textContent = t
    return d.innerHTML
  }

  function addRow (html, isUser) {
    var row = document.createElement('div')
    row.style.cssText = 'display:flex;justify-content:' + (isUser ? 'flex-end' : 'flex-start')
    var b = document.createElement('div')
    b.style.cssText = 'max-width:78%;padding:12px 16px;border-radius:18px;font-size:13px;line-height:1.6;color:#fff;word-break:break-word;' +
      (isUser ? 'background:linear-gradient(135deg,#7c3aed,#9333ea)' : 'background:rgba(255,255,255,.1)')
    b.innerHTML = html
    row.appendChild(b)
    msgs.appendChild(row)
    msgs.scrollTop = msgs.scrollHeight
    return b
  }

  function addBotMsg (html) { return addRow(html, false) }
  function addUserMsg (text) { return addRow(escapeHtml(text), true) }

  function addStatusMsg (html) {
    var d = document.createElement('div')
    d.style.cssText = 'background:rgba(255,255,255,.07);padding:10px 14px;border-radius:14px;font-size:12px;color:rgba(255,255,255,.7);text-align:center'
    d.innerHTML = html
    msgs.appendChild(d)
    msgs.scrollTop = msgs.scrollHeight
    return d
  }

  function formatReply (text) {
    var s = escapeHtml(text)
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c4b5fd">$1</strong>')
    s = s.replace(/^[\-•]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin-top:4px"><span style="color:#a78bfa">•</span><span>$1</span></div>')
    s = s.replace(/\n\n/g, '<div style="height:8px"></div>')
    s = s.replace(/\n/g, '<br>')
    return s
  }

  // ── Send ─────────────────────────────────────────────────────
  async function sendMessage () {
    var text = input.value.trim()
    if (!text) return
    addUserMsg(text)
    input.value = ''

    var thinking = addBotMsg('<span style="opacity:.6">💭 Thinking…</span>')
    try {
      var res  = await fetch(API_CHAT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:text}) })
      var data = await res.json()
      thinking.parentNode.remove()
      addBotMsg(formatReply(data.reply || 'Sorry, something went wrong.'))
    } catch (e) {
      thinking.parentNode.remove()
      addBotMsg("Couldn't reach the chat service. Check your connection and try again.")
    }
  }

  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMessage() })

  // ── Voice input ───────────────────────────────────────────────
  var grokRecorder = null

  micBtn.addEventListener('click', async function () {
    if (grokRecorder && grokRecorder.state === 'recording') {
      grokRecorder.stop()
      return
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addBotMsg('🎤 Voice input is not supported in this browser.')
      return
    }
    try {
      var stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      var chunks   = []
      grokRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      var listeningMsg = addStatusMsg('🎤 Listening… (tap ⏹️ to stop)')
      micBtn.textContent = '⏹️'

      grokRecorder.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data) }

      grokRecorder.onstop = async function () {
        stream.getTracks().forEach(function (t) { t.stop() })
        listeningMsg.remove()
        var transcribing = addStatusMsg('⏳ Transcribing with AI…')
        micBtn.textContent = '🎤'
        micBtn.disabled = true

        try {
          var blob = new Blob(chunks, { type:'audio/webm' })
          var b64  = await blobToBase64(blob)
          var res  = await fetch(API_STT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({audio:b64, mimeType:'audio/webm'}) })
          var data = await res.json()
          transcribing.remove()

          if (data.text) {
            input.value = data.text
            sendMessage()
          } else {
            addStatusMsg('⚠️ ' + (data.error || 'Could not transcribe. Please type your message.'))
          }
        } catch (err) {
          transcribing.remove()
          addStatusMsg('⚠️ Voice transcription failed. Please type your message.')
        } finally {
          micBtn.disabled = false
        }
      }

      grokRecorder.start()
      setTimeout(function () { if (grokRecorder && grokRecorder.state === 'recording') grokRecorder.stop() }, 30000)

    } catch (err) {
      addStatusMsg(err.name === 'NotAllowedError'
        ? '❌ Microphone access denied. Please allow mic permission or type your message.'
        : '❌ Could not access microphone. Please type your message.')
    }
  })

  function blobToBase64 (blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onload  = function () { resolve(reader.result.split(',')[1]) }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
})()
