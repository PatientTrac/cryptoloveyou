;(function () {
  if (document.getElementById('grok-widget-root')) return

  var API_CHAT = '/.netlify/functions/grok-chat'
  var API_STT  = '/.netlify/functions/stt'

  var style = document.createElement('style')
  style.textContent =
    '@keyframes clw-ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.8);opacity:0}}' +
    '#grok-widget-root{all:initial;position:fixed;bottom:24px;right:24px;z-index:9999;font-family:system-ui,sans-serif}' +
    '#grok-fab{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 24px 8px rgba(139,92,246,.45);border:none;position:relative}' +
    '#grok-fab::before{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);animation:clw-ping 1.8s ease-out infinite}' +
    '#grok-window{position:absolute;bottom:72px;right:0;width:384px;height:560px;background:#0f172a;border:1px solid rgba(167,139,250,.3);border-radius:24px;box-shadow:0 25px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}' +
    '#grok-messages::-webkit-scrollbar{width:4px}#grok-messages::-webkit-scrollbar-thumb{background:rgba(139,92,246,.4);border-radius:2px}' +
    '@media(max-width:480px){#grok-window{width:100vw;height:100vh;bottom:0;right:0;border-radius:0}#grok-widget-root{bottom:16px;right:16px}}'
  document.head.appendChild(style)

  var root = document.createElement('div')
  root.id = 'grok-widget-root'

  root.innerHTML =
    '<button id="grok-fab" aria-label="Open chat">💬</button>' +
    '<div id="grok-window" style="display:none">' +
      '<div style="background:linear-gradient(90deg,#6d28d9,#9333ea);padding:16px 20px;display:flex;align-items:center;gap:12px;color:#fff;flex-shrink:0">' +
        '<span style="font-size:22px;font-weight:700">𝕏</span>' +
        '<div style="flex:1">' +
          '<div style="font-weight:600;font-size:15px">Grok • CryptoLoveYou AI</div>' +
          '<div style="font-size:11px;opacity:.75">Crypto • AI • Future ❤️</div>' +
        '</div>' +
        '<button id="grok-close" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;opacity:.8;line-height:1">✕</button>' +
      '</div>' +
      '<div id="grok-messages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;background:#0f172a"></div>' +
      '<div style="padding:14px 16px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;background:#0f172a;flex-shrink:0">' +
        '<button id="grok-mic" aria-label="Voice input" style="width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,.1);border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff">🎤</button>' +
        '<input id="grok-input" type="text" placeholder="Ask Grok anything..." style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:10px 18px;color:#fff;font-size:13px;outline:none">' +
        '<button id="grok-send" style="padding:10px 20px;background:linear-gradient(90deg,#7c3aed,#9333ea);color:#fff;border:none;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0">Send</button>' +
      '</div>' +
    '</div>'

  document.body.appendChild(root)

  var fab     = document.getElementById('grok-fab')
  var win     = document.getElementById('grok-window')
  var closeBtn= document.getElementById('grok-close')
  var msgs    = document.getElementById('grok-messages')
  var input   = document.getElementById('grok-input')
  var sendBtn = document.getElementById('grok-send')
  var micBtn  = document.getElementById('grok-mic')

  function openWidget () {
    win.style.display = 'flex'
    fab.style.display = 'none'
    input.focus()
    if (!msgs.firstChild) addBotMsg('Hey! I\'m Grok from CryptoLoveYou ❤️ Ask me anything about crypto, AI, or whatever you want.')
  }

  function closeWidget () {
    win.style.display = 'none'
    fab.style.display = 'flex'
  }

  fab.addEventListener('click', openWidget)
  closeBtn.addEventListener('click', closeWidget)

  function escapeHtml (t) {
    var d = document.createElement('div')
    d.textContent = t
    return d.innerHTML
  }

  function addBubble (html, isUser) {
    var d = document.createElement('div')
    d.style.cssText = 'display:flex;justify-content:' + (isUser ? 'flex-end' : 'flex-start')
    var b = document.createElement('div')
    b.style.cssText = 'max-width:78%;padding:12px 16px;border-radius:18px;font-size:13px;line-height:1.5;color:#fff;' +
      (isUser ? 'background:linear-gradient(135deg,#7c3aed,#9333ea)' : 'background:rgba(255,255,255,.1)')
    b.innerHTML = html
    d.appendChild(b)
    msgs.appendChild(d)
    msgs.scrollTop = msgs.scrollHeight
    return b
  }

  function addUserMsg (text) { addBubble(escapeHtml(text), true) }
  function addBotMsg (text)  { addBubble(formatReply(text), false) }

  function formatReply (text) {
    var s = escapeHtml(text)
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c4b5fd">$1</strong>')
    s = s.replace(/^[\-•]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin-top:4px"><span style="color:#a78bfa">•</span><span>$1</span></div>')
    s = s.replace(/\n\n/g, '<div style="height:8px"></div>')
    s = s.replace(/\n/g, '<br>')
    return s
  }

  async function sendMessage () {
    var text = input.value.trim()
    if (!text) return
    addUserMsg(text)
    input.value = ''

    var thinking = addBubble('💭 Thinking…', false)
    thinking.style.opacity = '.6'

    try {
      var res  = await fetch(API_CHAT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:text}) })
      var data = await res.json()
      thinking.parentNode.remove()
      addBotMsg(data.reply || 'Sorry, something went wrong.')
    } catch (e) {
      thinking.parentNode.remove()
      addBotMsg("Couldn't reach the chat service. Check your connection and try again.")
    }
  }

  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMessage() })

  // Voice input
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
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      var chunks = []
      grokRecorder = new MediaRecorder(stream)

      micBtn.textContent = '🔴'
      micBtn.title = 'Stop recording'

      grokRecorder.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data) }

      grokRecorder.onstop = async function () {
        stream.getTracks().forEach(function (t) { t.stop() })
        micBtn.textContent = '⏳'
        micBtn.disabled = true

        try {
          var blob   = new Blob(chunks, { type:'audio/webm' })
          var base64 = await blobToBase64(blob)
          var res    = await fetch(API_STT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({audio:base64, mimeType:'audio/webm'}) })
          var data   = await res.json()
          if (data.text) {
            input.value = data.text
            input.focus()
          } else {
            addBotMsg('⚠️ Could not transcribe audio. Please type your message.')
          }
        } catch (err) {
          addBotMsg('⚠️ Voice transcription failed. Please type your message.')
        } finally {
          micBtn.textContent = '🎤'
          micBtn.title = 'Voice input'
          micBtn.disabled = false
        }
      }

      grokRecorder.start()
      setTimeout(function () { if (grokRecorder && grokRecorder.state === 'recording') grokRecorder.stop() }, 30000)

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        addBotMsg('🎤 Microphone access denied. Please allow it in your browser settings.')
      } else {
        addBotMsg('🎤 Voice input unavailable. Please type your message.')
      }
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
