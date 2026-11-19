const { LitElement, html, css } = require('lit')
const { commonCss, displayScreen } = require('./components/common')
const { startDeviceLogin, pollDeviceLogin } = require('../auth')

class AuthScreen extends LitElement {
  static get styles () {
    return css`
      ${commonCss}
      .title {
        top: 18px;
      }

      main {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 330px;
        padding: 14px;
      }

      .panel {
        width: 100%;
        background: rgba(0, 0, 0, 0.55);
        border: 2px solid #555;
        padding: 12px;
        text-align: center;
        color: white;
        text-shadow: 1px 1px #222;
      }

      .code {
        display: block;
        margin: 8px auto;
        font-family: monospace;
        font-size: 26px;
        letter-spacing: 4px;
        color: #ffe45c;
        user-select: text;
        -webkit-user-select: text;
      }

      .status {
        font-size: 10px;
        line-height: 1.5;
        min-height: 16px;
        word-break: break-word;
      }

      .error {
        color: #ff8080;
      }

      .row {
        display: flex;
        flex-direction: row;
        gap: 4px;
        width: 100%;
      }

      .hint {
        font-size: 10px;
        color: #c8c8c8;
        line-height: 1.5;
      }

      .spinner {
        display: inline-block;
        width: 10px;
        height: 10px;
        margin-right: 4px;
        border: 2px solid #fff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        vertical-align: -2px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `
  }

  static get properties () {
    return {
      userCode: { type: String },
      status: { type: String },
      error: { type: String },
      busy: { type: Boolean }
    }
  }

  constructor () {
    super()
    this.userCode = ''
    this.status = ''
    this.error = ''
    this.busy = false
    this.active = false
    this.interval = 5
    this.deviceCode = ''
    this.timer = null
  }

  start () {
    this.stop()
    this.active = true
    this.userCode = ''
    this.error = ''
    this.busy = true
    this.status = 'Contacting Microsoft...'
    this.begin()
  }

  stop () {
    this.active = false
    clearTimeout(this.timer)
    this.timer = null
  }

  async begin () {
    try {
      const data = await startDeviceLogin()
      if (!this.active) return
      this.deviceCode = data.deviceCode
      this.userCode = data.userCode
      this.interval = Math.max(3, data.interval || 5)
      this.status = 'Enter the code above at microsoft.com/link, then approve the sign-in.'
      this.busy = false
      this.schedulePoll()
    } catch (e) {
      if (!this.active) return
      this.busy = false
      this.error = e.message
    }
  }

  schedulePoll () {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.poll(), this.interval * 1000)
  }

  async poll () {
    if (!this.active) return
    try {
      const result = await pollDeviceLogin(this.deviceCode)
      if (!this.active) return
      if (result.pending) {
        this.status = 'Waiting for approval...'
        this.schedulePoll()
        return
      }
      this.status = 'Signed in! Returning to the server list...'
      this.busy = true
      window.dispatchEvent(new window.CustomEvent('pmui-auth-changed'))
      setTimeout(() => {
        if (!this.active) return
        this.stop()
        displayScreen(this, document.getElementById('play-screen'))
      }, 900)
    } catch (e) {
      if (!this.active) return
      this.error = e.message
      this.busy = false
    }
  }

  openLink () {
    window.open('https://www.microsoft.com/link', '_blank', 'noopener,noreferrer')
  }

  async copyCode () {
    try {
      await navigator.clipboard.writeText(this.userCode)
      this.status = 'Code copied to the clipboard.'
    } catch (e) {
      this.status = `Your code is ${this.userCode}`
    }
  }

  cancel () {
    this.stop()
    displayScreen(this, document.getElementById('play-screen'))
  }

  render () {
    return html`
      <div class="dirt-bg"></div>

      <p class="title">Sign in with Microsoft</p>

      <main>
        <div class="panel">
          ${this.userCode
            ? html`
                <div class="status">1. Open this page on any device</div>
                <div class="status"><b>microsoft.com/link</b></div>
                <div class="status">2. Enter this code</div>
                <span class="code">${this.userCode}</span>
              `
            : ''}
          <div class="status ${this.error ? 'error' : ''}">
            ${this.busy && !this.error ? html`<span class="spinner"></span>` : ''}
            ${this.error || this.status}
          </div>
        </div>

        ${this.userCode
          ? html`
              <div class="row">
                <pmui-button pmui-width="160px" pmui-label="Open Link" @pmui-click=${this.openLink}></pmui-button>
                <pmui-button pmui-width="160px" pmui-label="Copy Code" @pmui-click=${this.copyCode}></pmui-button>
              </div>
            `
          : ''}

        <p class="hint">Your Microsoft password is never entered into this app. Sign-in uses the official Microsoft device code flow.</p>

        <pmui-button pmui-width="200px" pmui-label="Cancel" @pmui-click=${this.cancel}></pmui-button>
      </main>
    `
  }
}

window.customElements.define('pmui-authscreen', AuthScreen)
