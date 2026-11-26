const { LitElement, html, css } = require('lit')

class SelectBox extends LitElement {
  static get styles () {
    return css`
      .select-container {
        position: relative;
        width: 200px;
        height: 20px;
        background: black;
        border: 1px solid grey;
      }

      .select-container:hover,
      .select-container:focus-within {
        border-color: white;
      }

      .select-container label {
        position: absolute;
        z-index: 2;
        pointer-events: none;
        bottom: 21px;
        left: 0;
        font-size: 10px;
        color: rgb(206, 206, 206);
        text-shadow: 1px 1px black;
      }

      .select-box {
        position: relative;
        outline: none;
        border: none;
        background: black;
        color: white;
        width: 100%;
        height: 100%;
        font-family: minecraft, mojangles, monospace;
        font-size: 10px;
        text-shadow: 1px 1px #222;
        padding: 0 2px;
      }

      .select-box option {
        background: #222;
        color: #fff;
      }

      @media (pointer: coarse) {
        .select-container {
          height: 36px;
        }

        .select-container label {
          bottom: calc(100% + 2px);
          font-size: 11px;
        }

        .select-box {
          font-size: 16px;
          padding: 0 6px;
        }
      }
    `
  }

  constructor () {
    super()
    this.width = '200px'
    this.id = ''
    this.value = ''
    this.label = ''
    this.options = []
  }

  static get properties () {
    return {
      width: {
        type: String,
        attribute: 'pmui-width'
      },
      id: {
        type: String,
        attribute: 'pmui-id'
      },
      label: {
        type: String,
        attribute: 'pmui-label'
      },
      value: {
        type: String,
        attribute: 'pmui-value'
      },
      options: {
        type: Array
      }
    }
  }

  onChange (e) {
    this.value = e.target.value
    this.dispatchEvent(new window.CustomEvent('pmui-change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }))
  }

  render () {
    return html`
      <div
        class="select-container"
        style="width: ${this.width};"
      >
        <label for="${this.id}">${this.label}</label>
        <select
          id="${this.id}"
          class="select-box"
          @change=${this.onChange}
        >
          ${this.options.map(option => {
            const value = typeof option === 'string' ? option : option.value
            const label = typeof option === 'string' ? option : option.label
            return html`<option value="${value}" ?selected=${value === this.value}>${label}</option>`
          })}
        </select>
      </div>
    `
  }
}

window.customElements.define('pmui-select', SelectBox)
