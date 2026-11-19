const { LitElement, html, css } = require('lit')

const audioContext = new window.AudioContext()
const sounds = {}

async function playSound (path) {
  let volume = 1
  const options = document.getElementById('options-screen')
  if (options) {
    volume = options.sound / 100
  }

  let soundBuffer = sounds[path]

  if (!soundBuffer) {
    const res = await window.fetch(path)
    const data = await res.arrayBuffer()

    soundBuffer = await audioContext.decodeAudioData(data)
    sounds[path] = soundBuffer
  }

  const gainNode = audioContext.createGain()
  const source = audioContext.createBufferSource()
  source.buffer = soundBuffer
  source.connect(gainNode)
  gainNode.connect(audioContext.destination)
  gainNode.gain.value = volume
  source.start(0)
}

class Button extends LitElement {
  static get styles () {
    return css`
      .button {
        --txrV: 66px;
        --btnScale: 1;
        position: relative;
        width: 200px;
        height: calc(20px * var(--btnScale));
        font-family: minecraft, mojangles, monospace;
        font-size: calc(10px * var(--btnScale));
        color: white;
        text-shadow: 1px 1px #222;
        border: none;
        z-index: 1;
        outline: none;
      }

      .button:hover,
      .button:focus-visible {
        --txrV: 86px;
      }

      .button:disabled {
        --txrV: 46px;
        color: #A0A0A0;
        text-shadow: 1px 1px #111;
      }

      .button::after {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 50%;
        height: calc(20px * var(--btnScale));
        background: url('textures/1.17.1/gui/widgets.png');
        background-size: calc(256px * var(--btnScale)) auto;
        background-position-y: calc(var(--txrV) * -1 * var(--btnScale));
        z-index: -1;
      }

      .button::before {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 50%;
        width: 50%;
        height: calc(20px * var(--btnScale));
        background: url('textures/1.17.1/gui/widgets.png');
        background-size: calc(256px * var(--btnScale)) auto;
        background-position-x: calc(-200px + 100%);
        background-position-y: calc(var(--txrV) * -1 * var(--btnScale));
        z-index: -1;
      }

      @media (pointer: coarse) {
        .button {
          --btnScale: 1.75;
        }
      }
    `
  }

  static get properties () {
    return {
      label: {
        type: String,
        attribute: 'pmui-label'
      },
      width: {
        type: String,
        attribute: 'pmui-width'
      },
      disabled: {
        type: Boolean,
        attribute: 'pmui-disabled'
      },
      onPress: {
        type: Function,
        attribute: 'pmui-click'
      }
    }
  }

  constructor () {
    super()
    this.label = ''
    this.disabled = false
    this.width = '200px'
    this.onPress = () => {}
  }

  render () {
    return html`
    <button
      class="button"
      ?disabled=${this.disabled}
      @click=${this.onBtnClick}
      style="width: ${this.width};"
    >
      ${this.label}
    </button>`
  }

  onBtnClick () {
    playSound('click_stereo.ogg')
    this.dispatchEvent(new window.CustomEvent('pmui-click'))
  }
}

window.customElements.define('pmui-button', Button)
const _playSound = playSound
export { _playSound as playSound }
