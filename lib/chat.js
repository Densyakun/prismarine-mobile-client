const { LitElement, html, css } = require('lit')
const { isMobile, isTextInput } = require('./menus/components/common')
const { staticSuggestions } = require('./commands')

const styles = {
  black: 'color:#000000',
  dark_blue: 'color:#0000AA',
  dark_green: 'color:#00AA00',
  dark_aqua: 'color:#00AAAA',
  dark_red: 'color:#AA0000',
  dark_purple: 'color:#AA00AA',
  gold: 'color:#FFAA00',
  gray: 'color:#AAAAAA',
  dark_gray: 'color:#555555',
  blue: 'color:#5555FF',
  green: 'color:#55FF55',
  aqua: 'color:#55FFFF',
  red: 'color:#FF5555',
  light_purple: 'color:#FF55FF',
  yellow: 'color:#FFFF55',
  white: 'color:#FFFFFF',
  bold: 'font-weight:900',
  strikethrough: 'text-decoration:line-through',
  underlined: 'text-decoration:underline',
  italic: 'font-style:italic'
}

function extractCommandNames (packet) {
  const names = []
  if (!packet || !Array.isArray(packet.nodes)) return names
  const root = packet.nodes[packet.rootIndex === undefined ? 0 : packet.rootIndex]
  if (!root || !Array.isArray(root.children)) return names
  for (const childIndex of root.children) {
    const node = packet.nodes[childIndex]
    if (!node) continue
    const extra = node.extraNodeData || node.data || {}
    const name = extra.name || node.name
    if (name) names.push(name)
  }
  return names
}

function colorShadow (hex, dim = 0.25) {
  const color = parseInt(hex.replace('#', ''), 16)

  const r = (color >> 16 & 0xFF) * dim | 0
  const g = (color >> 8 & 0xFF) * dim | 0
  const b = (color & 0xFF) * dim | 0

  const f = (c) => ('00' + c.toString(16)).substr(-2)
  return `#${f(r)}${f(g)}${f(b)}`
}

class ChatBox extends LitElement {
  static get styles () {
    return css`
        .chat-wrapper {
            position: fixed;
            z-index: 10;
        }

        .chat-display-wrapper {
            bottom: 40px;
            padding: 4px;
            padding-left: 0;
            max-height: var(--chatHeight);
            width: var(--chatWidth);
            transform-origin: bottom left;
            transform: scale(var(--chatScale));
        }

        .chat-input-wrapper {
            bottom: 1px;
            width: calc(100% - 3px);
            position: absolute;
            left: 1px;
            box-sizing: border-box;
            overflow: visible;
            background-color: rgba(0, 0, 0, 0);
        }

        .input-mobile {
          top: 1px;
        }

        .display-mobile {
          top: 40px;
        }

        .chat {
            overflow: hidden;
            color: white;
            font-size: 10px;
            margin: 0px;
            line-height: 100%;
            text-shadow: 1px 1px 0px #3f3f3f;
            font-family: mojangles, minecraft, monospace;
            width: 100%;
            max-height: var(--chatHeight);
        }

        input[type=text], #chatinput {
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 0, 0, 0);
            display: none;
            outline: none;
        }

        #chatinput:focus {
          border-color: white;
        }

        @media (pointer: coarse) {
          #chatinput {
            font-size: 16px;
            padding: 4px;
            height: 38px;
          }

          .chat-input-wrapper,
          .chat-input-wrapper.input-mobile {
            top: auto;
            bottom: calc(54px + env(safe-area-inset-bottom));
          }

          .chat-display-wrapper,
          .chat-display-wrapper.display-mobile {
            top: auto;
            bottom: calc(98px + env(safe-area-inset-bottom));
          }
        }
        
        .chat-suggestions {
            display: none;
            position: absolute;
            left: 0;
            bottom: calc(100% + 2px);
            width: 100%;
            max-height: 132px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.35);
            z-index: 4;
            pointer-events: auto;
        }

        .chat-suggestion {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 6px;
            padding: 3px 5px;
            font-size: 10px;
            line-height: 1.2;
            color: white;
            text-shadow: 1px 1px 0px #3f3f3f;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
        }

        .chat-suggestion .suggestion-label {
            flex: none;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-suggestion .suggestion-detail {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #b0b0b0;
            font-size: 9px;
        }

        .chat-suggestion.selected {
            background: rgba(255, 255, 255, 0.22);
        }

        @media (pointer: coarse) {
          .chat-suggestion {
            font-size: 13px;
            padding: 6px;
          }

          .chat-suggestion .suggestion-detail {
            font-size: 11px;
          }
        }

        .chat-message {
            display: block;
            padding-left: 4px;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .chat-message-fadeout {
            opacity: 1;
            transition: all 3s;
        }

        .chat-message-fade {
            opacity: 0;
        }

        .chat-message-faded {
            transition: none !important;
        }

        #chat-send {
            display: none;
            position: absolute;
            right: 4px;
            bottom: 4px;
            height: 38px;
            min-width: 60px;
            padding: 0 10px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 8px;
            background: rgba(20, 30, 40, 0.85);
            color: white;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            z-index: 3;
        }

        @media (pointer: coarse) {
          #chatinput {
            width: calc(100% - 74px);
          }

          #chat-send {
            display: none;
          }

          #chat-send.visible {
            display: block;
          }
        }

        .chat-message-chat-opened {
            opacity: 1 !important;
            transition: none !important;
        }
    `
  }

  render () {
    return html`
    <div id="chat-wrapper" class="chat-wrapper chat-display-wrapper">
      <div class="chat" id="chat">
        <li class="chat-message chat-message-fade chat-message-faded">Welcome to prismarine-web-client! Chat appears here.</li>
      </div>
    </div>
    <div id="chat-wrapper2" class="chat-wrapper chat-input-wrapper">
      <div class="chat" id="chat-input">
        <input type="text" class="chat" id="chatinput" spellcheck="false" autocomplete="off" enterkeyhint="send"></input>
        <button id="chat-send" type="button">SEND</button>
      </div>
      <div id="chat-suggestions" class="chat-suggestions"></div>
    </div>
    `
  }

  constructor () {
    super()
    this.chatHistoryPos = 0
    this.chatHistory = []
    this.bot = null
    this.chatInput = null
    this.suggestions = []
    this.suggestionIndex = -1
    this.suggestionTimer = null
    this.tabRequestId = 0
    this.tabPending = false
    this.tabQueued = null
    this.tabUnsupported = false
    this.completionCache = null
    this.serverCommands = []
  }

  setupAutocomplete (client, bot) {
    this.bot = bot
    this.chatInput = this.shadowRoot.querySelector('#chatinput')
    if (!this.chatInput) return

    this.chatInput.addEventListener('input', () => this.scheduleSuggestions())
    this.chatInput.addEventListener('click', () => this.scheduleSuggestions())

    if (client && typeof client.on === 'function') {
      client.on('declare_commands', (packet) => {
        try {
          this.serverCommands = extractCommandNames(packet)
        } catch (e) {}
      })
    }
  }

  buildCompletionContext () {
    const context = { players: [], commands: this.serverCommands }
    if (this.bot && this.bot.players) {
      context.players = Object.keys(this.bot.players)
    }
    const registry = this.bot && this.bot.registry
    if (!registry) return context

    if (!this.completionCache) {
      const items = registry.itemsArray || Object.values(registry.items || {})
      this.completionCache = {
        items: items.filter((item) => item && item.id > 0 && item.name !== 'air').map((item) => item.name),
        blocks: (registry.blocksArray || []).map((block) => block.name),
        entities: (registry.entitiesArray || []).map((entity) => entity.name),
        effects: (registry.effectsArray || []).map((effect) => effect.name),
        enchantments: (registry.enchantmentsArray || []).map((enchantment) => enchantment.name),
        particles: (registry.particlesArray || []).map((particle) => particle.name)
      }
    }
    return Object.assign(context, this.completionCache)
  }

  scheduleSuggestions () {
    if (this.suggestionTimer) clearTimeout(this.suggestionTimer)
    this.suggestionTimer = setTimeout(() => {
      this.suggestionTimer = null
      this.refreshSuggestions()
    }, 90)
  }

  refreshSuggestions () {
    if (!this.inChat || !this.chatInput) {
      this.hideSuggestions()
      return
    }
    const value = this.chatInput.value
    if (!value.startsWith('/')) {
      this.hideSuggestions()
      return
    }
    this.suggestionIndex = -1
    this.showSuggestions(staticSuggestions(value, this.buildCompletionContext()))
    this.requestServerSuggestions(value)
  }

  showSuggestions (list) {
    this.suggestions = list
    if (this.suggestionIndex >= list.length) this.suggestionIndex = list.length - 1
    const container = this.shadowRoot.querySelector('#chat-suggestions')
    if (!container) return
    container.replaceChildren()
    if (!list.length || !this.inChat) {
      container.style.display = 'none'
      return
    }
    container.style.display = 'block'
    list.forEach((suggestion, index) => {
      const row = document.createElement('div')
      row.className = 'chat-suggestion' + (index === this.suggestionIndex ? ' selected' : '')
      const label = document.createElement('span')
      label.className = 'suggestion-label'
      label.textContent = suggestion.label || suggestion.value
      row.appendChild(label)
      if (suggestion.detail) {
        const detail = document.createElement('span')
        detail.className = 'suggestion-detail'
        detail.textContent = suggestion.detail
        row.appendChild(detail)
      }
      row.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.applySuggestion(suggestion)
      })
      container.appendChild(row)
    })
  }

  hideSuggestions () {
    this.suggestionIndex = -1
    this.suggestions = []
    const container = this.shadowRoot.querySelector('#chat-suggestions')
    if (!container) return
    container.replaceChildren()
    container.style.display = 'none'
  }

  applySuggestion (suggestion) {
    if (!this.chatInput || !suggestion) return
    const value = this.chatInput.value
    const lastSpace = value.lastIndexOf(' ')
    if (lastSpace === -1) {
      this.chatInput.value = '/' + suggestion.value + ' '
    } else {
      this.chatInput.value = value.slice(0, lastSpace + 1) + suggestion.value + ' '
    }
    this.chatInput.focus()
    this.refreshSuggestions()
  }

  renderSuggestionSelection () {
    const container = this.shadowRoot.querySelector('#chat-suggestions')
    if (!container) return
    const rows = container.querySelectorAll('.chat-suggestion')
    rows.forEach((row, index) => {
      row.classList.toggle('selected', index === this.suggestionIndex)
    })
    const selected = rows[this.suggestionIndex]
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }

  handleSuggestionKey (event) {
    if (!this.inChat) return false
    if (event.code === 'Tab') {
      event.preventDefault()
      if (this.suggestions.length) {
        const index = this.suggestionIndex < 0 ? 0 : this.suggestionIndex
        this.applySuggestion(this.suggestions[index])
      }
      return true
    }
    if (!this.suggestions.length) return false
    if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return false
    if (event.code === 'ArrowDown') {
      this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length
      this.renderSuggestionSelection()
      event.preventDefault()
      return true
    }
    if (event.code === 'ArrowUp') {
      this.suggestionIndex = this.suggestionIndex <= 0 ? this.suggestions.length - 1 : this.suggestionIndex - 1
      this.renderSuggestionSelection()
      event.preventDefault()
      return true
    }
    return false
  }

  requestServerSuggestions (value) {
    if (!this.bot || typeof this.bot.tabComplete !== 'function' || this.tabUnsupported) return
    this.tabQueued = { value, id: ++this.tabRequestId }
    if (this.tabPending) return
    this.drainTabQueue()
  }

  async drainTabQueue () {
    if (this.tabPending) return
    if (this.tabUnsupported) {
      this.tabQueued = null
      return
    }
    const job = this.tabQueued
    this.tabQueued = null
    if (!job) return
    this.tabPending = true
    try {
      const matches = await this.bot.tabComplete(job.value, true, false, 2500)
      if (job.id !== this.tabRequestId) return
      if (!this.chatInput || this.chatInput.value !== job.value) return
      this.mergeServerSuggestions(job.value, matches)
    } catch (e) {
      if (/did not fire within timeout/.test(e && e.message ? e.message : '')) this.tabUnsupported = true
    } finally {
      this.tabPending = false
      if (this.tabQueued) this.drainTabQueue()
    }
  }

  mergeServerSuggestions (value, matches) {
    if (!Array.isArray(matches)) return
    const hasSpace = /\s/.test(value.slice(1))
    const token = value.split(/\s+/).pop() || ''
    const needle = token.toLowerCase()
    const merged = this.suggestions.slice()
    const seen = new Set(merged.map((suggestion) => suggestion.value.toLowerCase()))

    for (const entry of matches) {
      const raw = typeof entry === 'string' ? entry : entry && (entry.match || entry.name)
      if (!raw || typeof raw !== 'string') continue
      let candidate = raw.replace(/^\//, '')
      if (candidate.includes(' ')) candidate = candidate.split(/\s+/).pop()
      if (!candidate) continue
      const lower = candidate.toLowerCase()
      if (needle && !lower.startsWith(needle)) continue
      if (seen.has(lower)) continue
      seen.add(lower)
      merged.push({
        value: candidate,
        label: hasSpace ? candidate : '/' + candidate,
        detail: '',
        kind: hasSpace ? 'arg' : 'command'
      })
      if (merged.length >= 16) break
    }

    if (merged.length !== this.suggestions.length) this.showSuggestions(merged)
  }

  enableChat (isCommand) {
    const chat = this.shadowRoot.querySelector('#chat')
    const chatInput = this.shadowRoot.querySelector('#chatinput')

    this.shadowRoot.querySelector('#chat-wrapper2').classList.toggle('input-mobile', isMobile())
    this.shadowRoot.querySelector('#chat-wrapper').classList.toggle('display-mobile', isMobile())

    // Set inChat value
    this.inChat = true
    window.dispatchEvent(new window.CustomEvent('pmui-chat-open'))
    // Exit the pointer lock
    document.exitPointerLock()
    // Show chat input
    chatInput.style.display = 'block'
    const sendButton = this.shadowRoot.querySelector('#chat-send')
    if (sendButton) sendButton.classList.toggle('visible', isMobile())
    // Show extended chat history
    chat.style.maxHeight = 'var(--chatHeight)'
    chat.scrollTop = chat.scrollHeight // Stay bottom of the list
    if (isCommand) { // handle commands
      chatInput.value = '/'
    }
    // Focus element
    chatInput.focus()
    this.chatHistoryPos = this.chatHistory.length
    document.querySelector('#hud').shadowRoot.querySelector('#chat').shadowRoot.querySelectorAll('.chat-message').forEach(e => e.classList.add('chat-message-chat-opened'))
    if (isCommand) setTimeout(() => this.refreshSuggestions(), 0)
  }

  /**
   * @param {globalThis.THREE.Renderer} client
   * @param {import('minecraft-protocol').Client} renderer
   * @param {import('mineflayer').Bot} bot
   */
  init (client, renderer, bot) {
    this.inChat = false
    const chat = this.shadowRoot.querySelector('#chat')
    const gameMenu = document.getElementById('pause-screen')
    const chatInput = this.shadowRoot.querySelector('#chatinput')
    const sendButton = this.shadowRoot.querySelector('#chat-send')

    this.setupAutocomplete(client, bot)

    if (sendButton) {
      sendButton.addEventListener('click', (e) => {
        e.preventDefault()
        const value = chatInput.value
        if (value) client.write('chat', { message: value })
        chatInput.value = ''
        disableChat()
      })
    }

    renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock ||
            renderer.domElement.mozRequestPointerLock ||
            renderer.domElement.webkitRequestPointerLock

    // Show chat
    chat.style.display = 'block'

    // Esc event - Doesnt work with onkeypress?! - keypressed is deprecated uk
    document.addEventListener('keydown', e => {
      if (gameMenu.inMenu) return
      if (!this.inChat) return
      if (this.handleSuggestionKey(e)) return
      e = e || window.event
      if (e.code === 'Escape') {
        disableChat()
      } else if (e.code === 'ArrowUp') {
        if (this.chatHistoryPos === 0) return
        chatInput.value = this.chatHistory[--this.chatHistoryPos] !== undefined ? this.chatHistory[this.chatHistoryPos] : ''
        setTimeout(() => { chatInput.setSelectionRange(-1, -1) }, 0)
      } else if (e.code === 'ArrowDown') {
        if (this.chatHistoryPos === this.chatHistory.length) return
        chatInput.value = this.chatHistory[++this.chatHistoryPos] !== undefined ? this.chatHistory[this.chatHistoryPos] : ''
        setTimeout(() => { chatInput.setSelectionRange(-1, -1) }, 0)
      }
    })

    const keyBindScrn = document.getElementById('keybinds-screen')

    // Chat events
    document.addEventListener('keypress', e => {
      if (gameMenu.inMenu) return
      if (!this.inChat && isTextInput(e.target)) return
      const inventory = document.getElementById('inventory-screen')
      if (!this.inChat && inventory && inventory.style.display === 'block') return
      e = e || window.event
      if (this.inChat === false) {
        keyBindScrn.keymaps.forEach(km => {
          if (e.code === km.key) {
            switch (km.defaultKey) {
              case 'KeyT':
                setTimeout(() => this.enableChat(false), 0)
                break
              case 'Slash':
                setTimeout(() => this.enableChat(true), 0)
                break
            }
          }
        })

        return false
      }

      if (!this.inChat) return

      e.stopPropagation()

      if (e.code === 'Enter') {
        if (this.suggestionIndex >= 0 && this.suggestions.length) {
          this.applySuggestion(this.suggestions[this.suggestionIndex])
          return
        }
        this.chatHistory.push(chatInput.value)
        this.hideSuggestions()
        client.write('chat', { message: chatInput.value })
        disableChat()
      }
    })

    const disableChat = () => {
      this.inChat = false
      this.hideSuggestions()
      hideChat()
      window.dispatchEvent(new window.CustomEvent('pmui-chat-close'))
      if (!isMobile()) renderer.domElement.requestPointerLock()
    }

    const hideChat = () => {
      if (this.suggestionTimer) {
        clearTimeout(this.suggestionTimer)
        this.suggestionTimer = null
      }
      this.hideSuggestions()
      // Clear chat input
      chatInput.value = ''
      // Unfocus it
      chatInput.blur()
      // Hide it
      chatInput.style.display = 'none'
      const sendButton = this.shadowRoot.querySelector('#chat-send')
      if (sendButton) sendButton.classList.remove('visible')
      // Hide extended chat history
      chat.style.maxHeight = 'var(--chatHeight)'
      chat.scrollTop = chat.scrollHeight // Stay bottom of the list
      document.querySelector('#hud').shadowRoot.querySelector('#chat').shadowRoot.querySelectorAll('.chat-message').forEach(e => e.classList.remove('chat-message-chat-opened'))
    }

    client.on('chat', (packet) => {
      // Reading of chat message
      const fullmessage = JSON.parse(packet.message.toString())
      const msglist = []

      const colorF = (color) => {
        return color.trim().startsWith('#') ? `color:${color}` : styles[color] ?? undefined
      }

      const readMsg = (msglist, msg) => {
        const styles = {
          color: msg.color,
          bold: !!msg.bold,
          italic: !!msg.italic,
          underlined: !!msg.underlined,
          strikethrough: !!msg.strikethrough,
          obfuscated: !!msg.obfuscated
        }

        if (msg.text) {
          msglist.push({
            text: msg.text,
            ...styles
          })
        }

        if (msg.translate) {
          const tText = window.mcData.language[msg.translate] ?? msg.translate

          if (msg.with) {
            const splited = tText.split(/%s|%\d+\$s/g)

            let i = 0
            splited.forEach((spl, j, arr) => {
              msglist.push({ text: spl, ...styles })

              if (j + 1 < arr.length) {
                if (msg.with[i]) {
                  if (typeof msg.with[i] === 'string') {
                    readMsg(msglist, {
                      ...styles,
                      text: msg.with[i]
                    })
                  } else {
                    readMsg(msglist, {
                      ...styles,
                      ...msg.with[i]
                    })
                  }
                }
                i++
              }
            })
          } else {
            msglist.push({
              text: tText,
              ...styles
            })
          }
        }

        if (msg.extra) {
          msg.extra.forEach(ex => {
            readMsg(msglist, { ...styles, ...ex })
          })
        }
      }

      readMsg(msglist, fullmessage)

      const li = document.createElement('li')
      msglist.forEach(msg => {
        const span = document.createElement('span')
        span.appendChild(document.createTextNode(msg.text))
        span.setAttribute(
          'style',
                `${msg.color ? colorF(msg.color.toLowerCase()) + `; text-shadow: 1px 1px 0px ${colorShadow(colorF(msg.color.toLowerCase()).replace('color:', ''))}` : styles.white}; ${
                msg.bold ? styles.bold + ';' : ''
                }${msg.italic ? styles.italic + ';' : ''}${
                msg.strikethrough ? styles.strikethrough + ';' : ''
                }${msg.underlined ? styles.underlined + ';' : ''}`
        )
        li.appendChild(span)
      })
      chat.appendChild(li)
      chat.scrollTop = chat.scrollHeight // Stay bottom of the list
      // fading
      li.classList.add('chat-message')
      if (this.inChat) {
        li.classList.add('chat-message-chat-opened')
      }
      setTimeout(() => {
        li.classList.add('chat-message-fadeout')
        li.classList.add('chat-message-fade')
        setTimeout(() => {
          li.classList.add('chat-message-faded')
        }, 3000)
      }, 5000)
    })

    hideChat()
  }
}

window.customElements.define('chat-box', ChatBox)
