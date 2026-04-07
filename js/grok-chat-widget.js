/**
 * CryptoLoveYou Grok chat widget — Tailwind CSS version
 * Self-contained: injects Tailwind + widget CSS if missing
 * Loads on pages that include: <script src="/js/grok-chat-widget.js" defer></script>
 */
;(function () {
  if (document.getElementById('grok-chat-container')) return

  function ensureTailwindAndCss() {
    // 1) Ensure Tailwind is present (needed for Tailwind utility classes)
    if (!document.querySelector('script[data-clu-tailwind="1"]')) {
      var tw = document.createElement('script')
      tw.src = 'https://cdn.tailwindcss.com'
      tw.defer = true
      tw.setAttribute('data-clu-tailwind', '1')
      document.head.appendChild(tw)
    }

    // 2) Ensure widget isolation + mobile rules exist (match homepage)
    if (!document.getElementById('clu-grok-widget-css')) {
      var st = document.createElement('style')
      st.id = 'clu-grok-widget-css'
      st.textContent =
        '/* Animation delay for second ping ring */\\n' +
        '.animation-delay-700{animation-delay:700ms}\\n' +
        '/* Isolate Grok chat widget from theme styles */\\n' +
        '#grok-chat-container{all:initial;position:fixed;bottom:24px;right:24px;z-index:9999}\\n' +
        '/* Mobile responsive adjustments */\\n' +
        '@media (max-width:480px){#chat-window{width:100vw!important;height:100vh!important;max-height:100vh!important;bottom:0!important;right:0!important;border-radius:0!important}#grok-chat-container{bottom:16px!important;right:16px!important}}\\n'
      document.head.appendChild(st)
    }
  }

  ensureTailwindAndCss()

  var API = '/.netlify/functions/grok-chat'

  // Create container with Tailwind classes
  var container = document.createElement('div')
  container.id = 'grok-chat-container'
  container.className = 'fixed bottom-6 right-6 z-[9999]'

  container.innerHTML = `
    <button id="grok-chat-fab" onclick="window.toggleGrokChat()" class="relative w-16 h-16 flex items-center justify-center group">
        <div class="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full animate-ping opacity-30"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full animate-ping opacity-20 animation-delay-700"></div>
        <div class="relative w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_10px] shadow-cyan-400/60">
            <span class="text-3xl">💬</span>
        </div>
    </button>

    <div id="chat-window" class="hidden absolute bottom-20 right-0 w-96 h-[560px] bg-zinc-900 border-2 border-transparent bg-clip-padding rounded-3xl shadow-2xl flex flex-col overflow-hidden" style="background-image: linear-gradient(rgb(24, 24, 27), rgb(24, 24, 27)), linear-gradient(to right, rgb(6, 182, 212), rgb(147, 51, 234)); background-origin: border-box; background-clip: padding-box, border-box;">
        <div class="bg-gradient-to-r from-purple-500 to-cyan-400 px-5 py-4 flex items-center gap-3">
            <div class="w-10 h-10 flex items-center justify-center">
                <img src="/apple-touch-icon.png" alt="CryptoLoveYou" class="w-full h-full object-contain">
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-white text-base">CryptoLoveYou AI</h3>
                <p class="text-xs text-white/80">Crypto • AI • Future</p>
            </div>
            <button onclick="window.toggleGrokChat()" class="text-2xl text-white/80 hover:text-white transition-colors bg-transparent hover:bg-transparent">✕</button>
        </div>

        <div id="chat-messages" class="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-950"></div>

        <!-- Contextual Quick Buttons -->
        <div class="px-5 pb-3 pt-3 flex flex-wrap gap-2 border-t border-zinc-800 bg-zinc-900/50">
            <button onclick="window.sendGrokQuickPrompt('What are the best AI crypto projects in 2026?')" class="text-xs bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-cyan-600 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-full transition-all duration-200 border border-zinc-700 hover:border-transparent">AI Projects</button>
            <button onclick="window.sendGrokQuickPrompt('How do I buy crypto safely in 2026?')" class="text-xs bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-cyan-600 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-full transition-all duration-200 border border-zinc-700 hover:border-transparent">Buy Crypto</button>
            <button onclick="window.sendGrokQuickPrompt('What are the best crypto exchanges in 2026?')" class="text-xs bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-cyan-600 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-full transition-all duration-200 border border-zinc-700 hover:border-transparent">Exchanges</button>
            <button onclick="window.sendGrokQuickPrompt('How can I make money with AI and crypto?')" class="text-xs bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-cyan-600 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-full transition-all duration-200 border border-zinc-700 hover:border-transparent">Make Money</button>
            <button onclick="window.sendGrokQuickPrompt('Explain crypto taxes in 2026')" class="text-xs bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-cyan-600 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-full transition-all duration-200 border border-zinc-700 hover:border-transparent">Taxes</button>
        </div>

        <form id="grok-chat-form" onsubmit="window.sendGrokMessage(event)" class="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
            <input id="user-input" type="text" placeholder="Ask about crypto, AI, or trading..." class="flex-1 bg-zinc-800 border border-zinc-700 focus:border-cyan-400 rounded-full px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors" style="color: #ffffff;">
            <button type="submit" class="bg-gradient-to-r from-purple-500 to-cyan-400 text-white px-6 rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-200">Send</button>
        </form>
    </div>
  `

  document.body.appendChild(container)

  // Global functions for event handlers
  window.toggleGrokChat = function () {
    var win = document.getElementById('chat-window')
    win.classList.toggle('hidden')
    if (!win.classList.contains('hidden')) {
      document.getElementById('user-input').focus()
    }
  }

  window.sendGrokMessage = async function (e) {
    e.preventDefault()
    var input = document.getElementById('user-input')
    var text = input.value.trim()
    if (!text) return

    addMessage('user', text)
    input.value = ''

    var typing = addMessage('bot', '💭 Thinking...')

    try {
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })

      var data = await res.json()
      typing.remove()
      addMessage('bot', data.reply || 'Sorry, something went wrong.')
    } catch (error) {
      typing.remove()
      addMessage('bot', "Couldn't reach the chat service. Check your connection and try again.")
    }
  }

  window.sendGrokQuickPrompt = function (prompt) {
    var win = document.getElementById('chat-window')
    if (win.classList.contains('hidden')) {
      window.toggleGrokChat()
    }
    setTimeout(function () {
      var input = document.getElementById('user-input')
      input.value = prompt
      var fakeEvent = { preventDefault: function () {} }
      window.sendGrokMessage(fakeEvent)
    }, 300)
  }

  function addMessage (sender, text) {
    var container = document.getElementById('chat-messages')
    var div = document.createElement('div')
    div.className = sender === 'user' ? 'flex justify-end' : 'flex justify-start'

    // Format bot messages for better readability
    var formattedText = text
    if (sender === 'bot') {
      formattedText = formatBotMessage(text)
    } else {
      formattedText = escapeHtml(text)
    }

    div.innerHTML = '<div class="' +
      (sender === 'user' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' : 'bg-zinc-800 text-gray-100') +
      ' max-w-[85%] px-5 py-3 rounded-3xl text-sm leading-relaxed">' + formattedText + '</div>'
    container.appendChild(div)
    container.scrollTop = container.scrollHeight
    return div
  }

  function formatBotMessage (text) {
    // Escape HTML first
    var escaped = escapeHtml(text)

    // Format bold text (e.g., **Bitcoin** or **Text**)
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-cyan-300">$1</strong>')

    // Format bullet points (lines starting with - or •)
    escaped = escaped.replace(/^[\-•]\s+(.+)$/gm, '<div class="flex gap-2 mt-1"><span class="text-cyan-400">•</span><span>$1</span></div>')

    // Format numbered lists (lines starting with 1. 2. etc)
    escaped = escaped.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex gap-2 mt-1"><span class="text-cyan-400 font-semibold">$1.</span><span>$2</span></div>')

    // Add spacing between paragraphs (double line breaks)
    escaped = escaped.replace(/\n\n/g, '<div class="h-3"></div>')

    // Convert single line breaks to <br>
    escaped = escaped.replace(/\n/g, '<br>')

    return escaped
  }

  function escapeHtml (text) {
    var div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
})()
