const { LitElement, html, css } = require('lit')

class Slider extends LitElement {
  static get styles () {
    return css`
      .slider-container {
        --txrV: -46px;
        --sScale: 1;
        position: relative;
        width: 150px;
        height: calc(20px * var(--sScale));
        font-family: minecraft, mojangles, monospace;
        font-size: calc(10px * var(--sScale));
        color: white;
        text-shadow: 1px 1px #220;
        z-index: 1;
      }

      .slider-thumb {
        --txrV: -66px;
        pointer-events: none;
        width: calc(8px * var(--sScale));
        height: calc(20px * var(--sScale));
        position: absolute;
        top: 0;
        left: 0;
        z-index: 3;
      }

      .slider-container:hover .slider-thumb {
        --txrV: -86px;
      }

      .slider-container::after,
      .slider-thumb::after {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 50%;
        height: calc(20px * var(--sScale));
        background: url('textures/1.17.1/gui/widgets.png');
        background-size: calc(256px * var(--sScale)) auto;
        background-position-y: calc(var(--txrV) * var(--sScale));
        z-index: -1;
      }

      .slider-container::before,
      .slider-thumb::before {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 50%;
        width: 50%;
        height: calc(20px * var(--sScale));
        background: url('textures/1.17.1/gui/widgets.png');
        background-size: calc(256px * var(--sScale)) auto;
        background-position-x: calc(-200px + 100%);
        background-position-y: calc(var(--txrV) * var(--sScale));
        z-index: -1;
      }

      .slider {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        -webkit-appearance: none;
        appearance: none;
        background: none;
        width: 100%;
        height: calc(20px * var(--sScale));
        margin: 0;
      }

      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        position: relative;
        appearance: none;
        width: calc(8px * var(--sScale));
        height: calc(20px * var(--sScale));
        background: transparent;
      }

      .slider::-moz-range-thumb {
        width: calc(8px * var(--sScale));
        height: calc(20px * var(--sScale));
        background: transparent;
      }

      label {
        pointer-events: none;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 6;
        width: max-content;
      }

      @media (pointer: coarse) {
        .slider-container {
          --sScale: 1.75;
          width: 100% !important;
        }
      }
    `
  }

  constructor () {
    super()
    this.label = ''
    this.type = '%'
    this.width = '150px'
    this.value = '50'
    this.min = '0'
    this.max = '100'
    this.ratio = (Number(this.value) - Number(this.min)) / (Number(this.max) - Number(this.min))
  }

  updated () {
    this.ratio = (Number(this.value) - Number(this.min)) / (Number(this.max) - Number(this.min))
  }

  static get properties () {
    return {
      label: {
        type: String,
        attribute: 'pmui-label'
      },
      type: {
        type: String,
        attribute: 'pmui-type'
      },
      width: {
        type: String,
        attribute: 'pmui-width'
      },
      value: {
        type: String,
        attribute: 'pmui-value'
      },
      min: {
        type: String,
        attribute: 'pmui-min'
      },
      max: {
        type: String,
        attribute: 'pmui-max'
      },
      ratio: { type: Number }
    }
  }

  render () {
    return html`
      <div
        class="slider-container"
        style="width: ${this.width};"
      >
        <input
          type="range"
          class="slider"
          min="${this.min}"
          max="${this.max}"
          value="${this.value}"
          @input=${(e) => {
            const range = e.target
            this.ratio = (range.value - range.min) / (range.max - range.min)
            this.value = range.value
          }}>
        <div
          class="slider-thumb"
          style="left: calc((100% * ${this.ratio}) - (8px * ${this.ratio}));"
        ></div>
        <label>${this.label}: ${this.value}${this.type}</label>
      </div>
    `
  }
}

window.customElements.define('pmui-slider', Slider)
