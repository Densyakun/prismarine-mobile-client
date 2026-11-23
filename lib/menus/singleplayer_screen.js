const { LitElement, html, css } = require('lit')
const { commonCss, displayScreen } = require('./components/common')
const {
  isEmbeddedMode,
  getSingleplayerStatus,
  startSingleplayer,
  listWorlds,
  deleteWorld,
  sanitizeWorldName
} = require('../singleplayer')

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

      .section {
        display: flex;
        flex-direction: column;
        gap: 6px 0;
      }

      .section-label {
        font-size: 10px;
        color: white;
        text-shadow: 1px 1px #222;
      }

      .world-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .world-row {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: stretch;
      }

      .world-select {
        flex: 1;
        min-width: 0;
        padding: 4px 6px;
        background: #8b8b8b;
        border: 2px solid;
        border-color: #fff #373737 #373737 #fff;
        color: #222;
        font-family: minecraft, mojangles, monospace;
        font-size: 10px;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      .world-select.selected {
        background: #e8e8e8;
        border-color: #373737 #fff #fff #373737;
        outline: 1px solid #2b7a2b;
      }

      .world-delete {
        flex: none;
        padding: 4px 8px;
        background: #8b8b8b;
        border: 2px solid;
        border-color: #fff #373737 #373737 #fff;
        color: #7a1a1a;
        font-family: minecraft, mojangles, monospace;
        font-size: 10px;
        cursor: pointer;
      }

      .world-delete:disabled {
        color: #555;
        cursor: default;
      }

      .world-empty {
        font-size: 10px;
        color: rgb(206, 206, 206);
        text-shadow: 1px 1px black;
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

      @media (pointer: coarse) {
        .edit-boxes {
          gap: 22px 0;
        }

        .section-label,
        .world-select,
        .world-delete,
        .world-empty,
        .hint,
        .error {
          font-size: 11px;
        }

        .world-select,
        .world-delete {
          padding: 7px 8px;
        }
      }
    `
  }

  static get properties () {
    return {
      username: { type: String },
      gameMode: { type: String },
      version: { type: String },
      available: { type: Boolean },
      embedded: { type: Boolean },
      checking: { type: Boolean },
      connecting: { type: Boolean },
      deleting: { type: String },
      error: { type: String },
      worlds: { type: Array },
      worldsLoading: { type: Boolean },
      selectedWorld: { type: String },
      newWorldName: { type: String }
    }
  }

  constructor () {
    super()
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
    this.worlds = []
    this.worldsLoading = true
    this.selectedWorld = ''
    this.newWorldName = ''
    this.deleting = ''
  }

  connectedCallback () {
    super.connectedCallback()
    if (!this.checked) {
      this.checked = true
      this.checkAvailability().then(() => this.refreshWorlds())
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
      this.requestUpdate()
    }
  }

  async refreshWorlds () {
    this.worldsLoading = true
    this.requestUpdate()
    try {
      const result = await listWorlds()
      this.worlds = Array.isArray(result && result.worlds) ? result.worlds : []
    } catch (e) {
      this.worlds = []
    }
    this.worldsLoading = false

    const names = this.worlds.map((world) => world.name)
    const lastUsed = window.localStorage.getItem('singleplayerWorld')

    if (this.selectedWorld && names.indexOf(this.selectedWorld) === -1) this.selectedWorld = ''
    if (!this.selectedWorld) {
      if (lastUsed && names.indexOf(lastUsed) !== -1) this.selectedWorld = lastUsed
      else if (names.length) this.selectedWorld = names[0]
    }
    if (!this.newWorldName && lastUsed && names.indexOf(lastUsed) === -1) {
      this.newWorldName = lastUsed
    }
    if (!this.newWorldName && !names.length) {
      this.newWorldName = 'world'
    }
    this.requestUpdate()
  }

  toggleGameMode () {
    this.gameMode = this.gameMode === 'creative' ? 'survival' : 'creative'
    this.requestUpdate()
  }

  selectWorld (name) {
    this.selectedWorld = name
    this.error = ''
    this.requestUpdate()
  }

  setNewWorldName (value) {
    this.newWorldName = value
    this.requestUpdate()
  }

  async onPlayPress () {
    if (this.connecting || this.checking) return
    if (!this.available) {
      this.error = 'Singleplayer is not available on this server.'
      return
    }
    if (!this.selectedWorld) {
      this.error = 'Select a world or create a new one.'
      return
    }
    await this.startWorld(this.selectedWorld, false)
  }

  async onCreatePress () {
    if (this.connecting || this.checking) return
    if (!this.available) {
      this.error = 'Singleplayer is not available on this server.'
      return
    }
    if (!this.newWorldName || !String(this.newWorldName).trim()) {
      this.error = 'Enter a name for the new world first.'
      return
    }
    const name = sanitizeWorldName(this.newWorldName)
    if (this.worlds.some((world) => world.name === name)) {
      this.error = 'A world with that name already exists. Select it instead.'
      return
    }
    await this.startWorld(name, true)
  }

  async startWorld (world, create) {
    if (!this.username || !String(this.username).trim()) {
      this.error = 'Enter a username first.'
      return
    }

    this.error = ''
    this.connecting = true
    this.requestUpdate()
    try {
      const status = await startSingleplayer({
        world,
        gameMode: this.gameMode,
        create
      })
      if (!status || !status.port) throw new Error(status.error || 'The world could not be started.')

      const startedWorld = status.world || sanitizeWorldName(world)
      window.localStorage.setItem('singleplayerWorld', startedWorld)
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
      this.refreshWorlds()
    }
  }

  async onDeletePress (name, event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (this.connecting || this.deleting) return
    const confirmed = typeof window.confirm === 'function'
      ? window.confirm(`Delete the world "${name}"? This cannot be undone.`)
      : true
    if (!confirmed) return

    this.deleting = name
    this.error = ''
    this.requestUpdate()
    try {
      const result = await deleteWorld(name)
      if (result && Array.isArray(result.worlds)) this.worlds = result.worlds
      if (this.selectedWorld === name) this.selectedWorld = ''
      await this.refreshWorlds()
    } catch (e) {
      this.error = e.message || 'The world could not be deleted.'
    }
    this.deleting = ''
    this.requestUpdate()
  }

  renderWorldList () {
    if (this.worldsLoading) {
      return html`<div class="world-empty">Loading worlds...</div>`
    }
    if (!this.worlds.length) {
      return html`<div class="world-empty">No worlds yet. Create one below.</div>`
    }
    return html`
      <div class="world-list">
        ${this.worlds.map((world) => html`
          <div class="world-row">
            <button
              type="button"
              class="world-select ${world.name === this.selectedWorld ? 'selected' : ''}"
              @click=${() => this.selectWorld(world.name)}
            >${world.name}</button>
            <button
              type="button"
              class="world-delete"
              ?disabled=${this.deleting === world.name}
              @click=${(e) => this.onDeletePress(world.name, e)}
            >${this.deleting === world.name ? '...' : 'Delete'}</button>
          </div>
        `)}
      </div>
    `
  }

  render () {
    return html`
      <div class="dirt-bg"></div>

      <p class="title">Singleplayer</p>

      <main class="edit-boxes">
        <div class="section">
          <span class="section-label">Worlds</span>
          ${this.renderWorldList()}
        </div>

        <div class="wrapper">
          <pmui-editbox
            pmui-width="326px"
            pmui-label="New World Name"
            pmui-id="spnewworld"
            pmui-value="${this.newWorldName}"
            @input=${e => this.setNewWorldName(e.target.value)}
          ></pmui-editbox>
        </div>

        <pmui-button
          pmui-width="326px"
          pmui-label=${this.connecting ? 'Generating world...' : 'Create New World'}
          ?pmui-disabled=${this.checking || this.connecting}
          @pmui-click=${this.onCreatePress}
        ></pmui-button>

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
          <span class="section-label">Game Mode</span>
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
          ?pmui-disabled=${this.checking || this.connecting || !this.available || !this.selectedWorld}
          @pmui-click=${this.onPlayPress}
        ></pmui-button>
        <pmui-button pmui-width="160px" pmui-label="Cancel" @pmui-click=${() => displayScreen(this, document.getElementById('title-screen'))}></pmui-button>
      </div>
    `
  }
}

window.customElements.define('pmui-singleplayerscreen', SingleplayerScreen)
