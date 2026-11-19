const { LitElement, html, css } = require('lit')
const { commonCss, displayScreen } = require('./components/common')
const { loadSession, logout, ensureFreshSession } = require('../auth')

class PlayScreen extends LitElement {
  static get styles () {
    return css`
      ${commonCss}
      .title {
        top: 8px;
      }

      .account {
        position: absolute;
        top: 30px;
        left: 50%;
        transform: translate(-50%);
        width: 330px;
        min-height: 34px;
        padding: 5px 8px;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid #555;
        color: white;
        text-shadow: 1px 1px #222;
        font-size: 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .account-name {
        color: #7cfc9a;
        word-break: break-all;
      }

      @media (pointer: coarse) {
        .account {
          font-size: 12px;
        }

        .hint,
        .error {
          font-size: 11px;
        }
      }

      .account-buttons {
        display: flex;
        flex-direction: row;
        gap: 4px;
        flex-shrink: 0;
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

      @media (pointer: coarse) {
        .edit-boxes {
          gap: 28px 0;
        }
      }

      .offline-title {
        font-size: 10px;
        color: #ffd27f;
        text-shadow: 1px 1px black;
      }
    `
  }

  static get properties () {
    return {
      server: { type: String },
      serverport: { type: Number },
      proxy: { type: String },
      proxyport: { type: Number },
      username: { type: String },
      password: { type: String },
      version: { type: String },
      msaSession: { type: Object },
      authError: { type: String },
      connecting: { type: Boolean }
    }
  }

  constructor () {
    super()
    this.username = window.localStorage.getItem('username') ?? 'pviewer' + (Math.floor(Math.random() * 1000))
    this.password = ''
    this.msaSession = loadSession()
    this.authError = ''
    this.connecting = false
    window.fetch('config.json').then(res => res.json()).then(config => {
      this.server = window.localStorage.getItem('server') ?? config.defaultHost ?? ''
      this.serverport = window.localStorage.getItem('serverport') ?? config.defaultHostPort ?? 25565
      this.proxy = window.localStorage.getItem('proxy') ?? config.defaultProxy ?? ''
      this.proxyport = window.localStorage.getItem('proxyport') ?? (!config.defaultProxy && !config.defaultProxyPort ? '' : config.defaultProxyPort ?? 443)
      this.version = window.localStorage.getItem('version') ?? config.defaultVersion
    })
    this.onAuthChanged = () => {
      this.msaSession = loadSession()
      this.authError = ''
      this.requestUpdate()
    }
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('pmui-auth-changed', this.onAuthChanged)
  }

  disconnectedCallback () {
    window.removeEventListener('pmui-auth-changed', this.onAuthChanged)
    super.disconnectedCallback()
  }

  openSignIn () {
    const screen = document.getElementById('auth-screen')
    displayScreen(this, screen)
    screen.start()
  }

  signOut () {
    logout()
    this.msaSession = null
    this.requestUpdate()
  }

  async onConnectPress () {
    if (this.connecting) return
    this.authError = ''

    if (!this.server || !String(this.server).trim()) {
      this.authError = 'Enter a server address first (for example play.example.com).'
      return
    }

    let session = null
    if (this.msaSession) {
      this.connecting = true
      this.requestUpdate()
      session = await ensureFreshSession()
      if (!session) {
        this.authError = 'Your Microsoft session expired. Please sign in again.'
        this.msaSession = null
        this.connecting = false
        this.requestUpdate()
        return
      }
      this.msaSession = session
    }

    window.localStorage.setItem('username', this.username)
    window.localStorage.setItem('server', this.server)
    window.localStorage.setItem('serverport', this.serverport)
    window.localStorage.setItem('proxy', this.proxy)
    window.localStorage.setItem('proxyport', this.proxyport)
    window.localStorage.setItem('version', this.version)

    this.connecting = false
    this.dispatchEvent(new window.CustomEvent('connect', {
      detail: {
        server: `${this.server}:${this.serverport}`,
        proxy: `${this.proxy}${this.proxy !== '' ? `:${this.proxyport}` : ''}`,
        username: session ? session.profile.name : this.username,
        password: this.password,
        botVersion: this.version,
        auth: session ? 'microsoft' : 'offline',
        session
      }
    }))
  }

  render () {
    return html`
      <div class="dirt-bg"></div>

      <p class="title">Join a Server</p>

      <section class="account">
        ${this.msaSession
          ? html`
              <span>Signed in as <b class="account-name">${this.msaSession.profile.name}</b></span>
              <span class="account-buttons">
                <pmui-button pmui-width="70px" pmui-label="Switch" @pmui-click=${this.openSignIn}></pmui-button>
                <pmui-button pmui-width="60px" pmui-label="Sign out" @pmui-click=${this.signOut}></pmui-button>
              </span>
            `
          : html`
              <span>Use your official Minecraft account or play offline.</span>
              <pmui-button pmui-width="100px" pmui-label="Sign in" @pmui-click=${this.openSignIn}></pmui-button>
            `}
      </section>

      <main class="edit-boxes">
        <div class="wrapper">
          <pmui-editbox
            pmui-width="220px"
            pmui-label="Server IP"
            pmui-id="serverip"
            pmui-value="${this.server}"
            @input=${e => { this.server = e.target.value }}
          ></pmui-editbox>
          <pmui-editbox
            pmui-width="100px"
            pmui-label="Port"
            pmui-id="port"
            pmui-value="${this.serverport}"
            @input=${e => { this.serverport = e.target.value }}
          ></pmui-editbox>
        </div>

        ${this.msaSession
          ? html`<p class="hint">Online mode: the server will see you as <b>${this.msaSession.profile.name}</b>.</p>`
          : html`
              <div class="wrapper">
                <pmui-editbox
                  pmui-width="150px"
                  pmui-label="Offline Username"
                  pmui-id="username"
                  pmui-value="${this.username}"
                  @input=${e => { this.username = e.target.value }}
                ></pmui-editbox>
                <pmui-editbox
                  pmui-width="150px"
                  pmui-label="Bot Version (optional)"
                  pmui-id="botversion"
                  pmui-value="${this.version}"
                  @input=${e => { this.version = e.target.value }}
                ></pmui-editbox>
              </div>
              <p class="hint">Example: play.example.com. Offline mode only works on servers that allow it; leave the version blank to auto-detect it.</p>
            `}

        <div class="wrapper">
          <pmui-editbox
            pmui-width="220px"
            pmui-label="Proxy (optional)"
            pmui-id="proxy"
            pmui-value="${this.proxy}"
            @input=${e => { this.proxy = e.target.value }}
          ></pmui-editbox>
          <pmui-editbox
            pmui-width="100px"
            pmui-label="Proxy Port"
            pmui-id="proxyport"
            pmui-value="${this.proxyport}"
            @input=${e => { this.proxyport = e.target.value }}
          ></pmui-editbox>
        </div>
        <p class="hint">Default: a public community proxy. Enter your own proxy or leave blank when self-hosting one.</p>

        ${this.authError ? html`<p class="error">${this.authError}</p>` : ''}
      </main>

      <div class="button-wrapper">
        <pmui-button pmui-width="160px" pmui-label=${this.connecting ? 'Checking login...' : 'Connect'} ?pmui-disabled=${this.connecting} @pmui-click=${this.onConnectPress}></pmui-button>
        <pmui-button pmui-width="160px" pmui-label="Cancel" @pmui-click=${() => displayScreen(this, document.getElementById('title-screen'))}></pmui-button>
      </div>
    `
  }
}

window.customElements.define('pmui-playscreen', PlayScreen)
