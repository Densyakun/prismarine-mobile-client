const { LitElement, html, css } = require('lit')
const { commonCss, displayScreen } = require('./components/common')
const { isEmbeddedMode, getSingleplayerStatus, startSingleplayer } = require('../singleplayer')

class SingleplayerScreen extends LitElement {
  static get styles () {
    return css`
      ${commonCss}
      .title {
        top: 8px;
      }

      .edit-boxes {
        position: absolute;
        top: 100px;
        bottom: 44px;
        left: 50%;
        display: flex;
        flex-direction: column;
        gap: 18px 0;
        transform: translate(-50%);
        width: 330px;
        overflow-y: auto;
        padding: 20px 2px 2px;
      }

      .wrapper {
        width: 100%;
        display: flex;
        flex-direction: row;
        gap: 0 4px;
      }

      .button-wrapper {
        display: flex;
        flex-direction: row;
        gap: 0 4px;
        position: absolute;
        bottom: 6px;
        left: 50%;
        transform: translate(-50%);
        width: 330px;
      }

      .hint {
        font-size: 10px;
        color: rgb(206, 206, 206);
        text-shadow: 1px 1px black;
        line-height: 1.4;
        margin-top: -8px;
      }

      .error {
        font-size: 10px;
        color: #ff9a9a;
        text-shadow: 1px 1px black;
        line-height: 1.4;
        word-break: break-word;
      }

      .hint a {
        color: #8fd3ff;
        text-decoration: underline;
      }

      .game-mode {
        display: flex;
        flex-direction: column;
        gap: 4px 0;
      }

      .game-mode-label {
        font-size: 10px;
        color: white;
        text-shadow: 1px 1px #222;
      }

      @media (pointer: coarse) {
        .edit-boxes {
          gap: 28px 0;
        }

        .hint,
        .error,
        .game-mode-label {
          font-size: 11px;
        }
      }
    `
  }

  static get properties () {
    return {
      world: { type: String },
      username: { type: String },
      gameMode: { type: String },
      version: { type: String },
      available: { type: Boolean },
      embedded: { type: Boolean },
      checking: { type: Boolean },
      connecting: { type: Boolean },
      error: { type: String }
    }
  }

  constructor () {
    super()
    this.world = window.localStorage.getItem('singleplayerWorld') ?? 'world'
    this.username = window.localStorage.getItem('singleplayerUsername') ??
      window.localStorage.getItem('username') ??
      'player' + (Math.floor(Math.random() * 1000))
    this.gameMode = window.localStorage.getItem('singleplayerGameMode') ?? 'survival'
    this.version = ''
    this.embedded = isEmbeddedMode()
    this.available = true
    this.checking = true
    this.connecting = false
    this.error = ''
    this.checked = false
  }

  connectedCallback () {
    super.connectedCallback()
    if (!this.checked) {
      this.checked = true
      this.checkAvailability()
    }
  }

  async checkAvailability () {
    try {
      const status = await getSingleplayerStatus()
      this.available = !!status.available
      this.embedded = !!status.embedded || this.embedded
      if (status.version) this.version = status.version
      if (!this.available) this.error = 'Singleplayer is not available on this server.'
    } catch (e) {
      this.available = false
      this.error = 'Singleplayer is not available on this server.'
    } finally {
      this.checking = false
    }
  }

  toggleGameMode () {
    this.gameMode = this.gameMode === 'creative' ? 'survival' : 'creative'
  }

  async onPlayPress () {
    if (this.connecting || this.checking) return
    if (!this.available) {
      this.error = 'Singleplayer is not available on this server.'
      return
    }
    if (!this.username || !String(this.username).trim()) {
      this.error = 'Enter a username first.'
      return
    }

    this.error = ''
    this.connecting = true
    try {
      const status = await startSingleplayer({
        world: this.world,
        gameMode: this.gameMode
      })
      if (!status || !status.port) throw new Error(status.error || 'The world could not be started.')

      window.localStorage.setItem('singleplayerWorld', this.world)
      window.localStorage.setItem('singleplayerUsername', this.username)
      window.localStorage.setItem('singleplayerGameMode', this.gameMode)

      this.connecting = false
      this.dispatchEvent(new window.CustomEvent('connect', {
        detail: {
          server: `${status.host}:${status.port}`,
          proxy: '',
          username: this.username,
          password: '',
          botVersion: status.version || this.version,
          auth: 'offline',
          session: null
        }
      }))
    } catch (e) {
      this.error = e.message || 'The world could not be started.'
      this.connecting = false
    }
  }

  render () {
    return html`
      <div class="dirt-bg"></div>

      <p class="title">Singleplayer</p>

      <main class="edit-boxes">
        <div class="wrapper">
          <pmui-editbox
            pmui-width="326px"
            pmui-label="World Name"
            pmui-id="spworld"
            pmui-value="${this.world}"
            @input=${e => { this.world = e.target.value }}
          ></pmui-editbox>
        </div>

        <div class="wrapper">
          <pmui-editbox
            pmui-width="326px"
            pmui-label="Username"
            pmui-id="spusername"
            pmui-value="${this.username}"
            @input=${e => { this.username = e.target.value }}
          ></pmui-editbox>
        </div>

        <div class="game-mode">
          <span class="game-mode-label">Game Mode</span>
          <pmui-button
            pmui-width="200px"
            pmui-label=${this.gameMode === 'creative' ? 'Creative' : 'Survival'}
            @pmui-click=${this.toggleGameMode}
          ></pmui-button>
        </div>

        <p class="hint">
          ${this.embedded
            ? 'The world runs entirely in this browser and is saved locally, so you can continue where you left off.'
            : 'Your world is generated and saved on the server, so you can continue where you left off.'}
          ${this.version ? ` Version ${this.version}.` : ''}
        </p>

        ${this.embedded
          ? ''
          : html`<p class="hint">No server? <a href="?singleplayer=1">Play in this browser</a> instead.</p>`}

        ${this.error ? html`<p class="error">${this.error}</p>` : ''}
      </main>

      <div class="button-wrapper">
        <pmui-button
          pmui-width="160px"
          pmui-label=${this.checking ? 'Checking...' : (this.connecting ? 'Generating world...' : 'Play')}
          ?pmui-disabled=${this.checking || this.connecting || !this.available}
          @pmui-click=${this.onPlayPress}
        ></pmui-button>
        <pmui-button pmui-width="160px" pmui-label="Cancel" @pmui-click=${() => displayScreen(this, document.getElementById('title-screen'))}></pmui-button>
      </div>
    `
  }
}

window.customElements.define('pmui-singleplayerscreen', SingleplayerScreen)
