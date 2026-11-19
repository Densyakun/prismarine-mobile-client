const { LitElement, html, css } = require('lit')
const { commonCss } = require('./components/common')
const invsprite = require('../invsprite.json')

function range (start, end) {
  const out = []
  for (let i = start; i < end; i++) out.push(i)
  return out
}

function spriteFor (item) {
  const sprite = item ? invsprite[item.name] : null
  return sprite || invsprite.air
}

class InventoryScreen extends LitElement {
  static get styles () {
    return css`
      ${commonCss}
      :host {
        pointer-events: auto;
      }

      .bg {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
      }

      .panel {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: calc(100% - 8px);
        max-height: calc(100% - 8px);
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        background: #c6c6c6;
        border: 2px solid #555;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
      }

      .titlebar {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #222;
        font-size: 10px;
        padding: 0 2px;
      }

      .titlebar .title {
        position: static;
        transform: none;
        color: #222;
        text-shadow: none;
        font-size: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .scroll {
        overflow-y: auto;
        max-height: calc(100vh - 90px);
        padding: 2px;
      }

      .sections {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .top-sections {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
      }

      .section-title {
        font-size: 10px;
        color: #333;
        margin-bottom: 2px;
      }

      .grid {
        display: grid;
        gap: 2px;
        justify-content: center;
      }

      .slot {
        position: relative;
        width: 32px;
        height: 32px;
        background: #8b8b8b;
        border: 2px solid;
        border-color: #373737 #fff #fff #373737;
        box-sizing: border-box;
      }

      .slot:active {
        background: #a8a8a8;
      }

      .slot-icon {
        position: absolute;
        top: 0;
        left: 0;
        width: 32px;
        height: 32px;
        background-image: url('invsprite.png');
        background-size: 1024px auto;
        transform: scale(0.85);
        transform-origin: center;
      }

      .slot-count {
        position: absolute;
        right: 1px;
        bottom: -1px;
        color: white;
        font-size: 10px;
        text-shadow: 1px 1px 0 rgb(63, 63, 63);
      }

      .toolbar {
        display: flex;
        flex-direction: row;
        gap: 4px;
        justify-content: flex-end;
        align-items: center;
      }

      .shift-on {
        filter: brightness(1.4);
        outline: 2px solid #2b7a2b;
      }

      .empty {
        font-size: 10px;
        color: #333;
        text-align: center;
      }
    `
  }

  static get properties () {
    return {
      bot: { type: Object },
      activeWindow: { type: Object },
      tick: { type: Number },
      shiftMode: { type: Boolean }
    }
  }

  constructor () {
    super()
    this.bot = null
    this.activeWindow = null
    this.tick = 0
    this.shiftMode = false
    this.windowListener = null
    this.inventoryListener = null
  }

  setBot (bot) {
    if (this.bot === bot) return
    this.detach()
    this.bot = bot
    if (bot) {
      this.inventoryListener = () => this.refresh()
      bot.inventory.on('updateSlot', this.inventoryListener)
    }
  }

  detach () {
    if (this.windowListener) {
      try { this.windowListener.window.removeListener('updateSlot', this.windowListener.handler) } catch (e) {}
      this.windowListener = null
    }
    if (this.inventoryListener && this.bot) {
      try { this.bot.inventory.removeListener('updateSlot', this.inventoryListener) } catch (e) {}
    }
    this.inventoryListener = null
  }

  refresh () {
    this.tick++
    this.requestUpdate()
  }

  open (window = null) {
    if (this.windowListener) {
      try { this.windowListener.window.removeListener('updateSlot', this.windowListener.handler) } catch (e) {}
      this.windowListener = null
    }
    this.activeWindow = window
    this.style.display = 'block'
    if (window && window.on) {
      const handler = () => this.refresh()
      window.on('updateSlot', handler)
      this.windowListener = { window, handler }
    }
    this.refresh()
  }

  close () {
    if (this.activeWindow && this.bot) {
      try { this.bot.closeWindow(this.activeWindow) } catch (e) {}
    }
    this.activeWindow = null
    this.style.display = 'none'
    window.dispatchEvent(new window.CustomEvent('pmui-inventory-closed'))
  }

  isContainer () {
    return !!this.activeWindow && this.activeWindow.id !== 0
  }

  slotItem (slot) {
    if (!this.bot) return null
    const source = this.isContainer() ? this.activeWindow : this.bot.inventory
    return source.slots[slot] ?? null
  }

  onSlotClick (slot, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!this.bot) return
    const button = e.button === 2 ? 1 : 0
    const mode = this.shiftMode ? 1 : 0
    this.bot.clickWindow(slot, button, mode).catch(() => {})
    this.refresh()
  }

  renderSlot (slot, selected = false) {
    const item = this.slotItem(slot)
    const sprite = spriteFor(item)
    return html`
      <div
        class="slot"
        data-slot="${slot}"
        style="${selected ? 'outline:2px solid #fff; outline-offset:-2px;' : ''}"
        title="${item ? item.displayName : ''}"
        @pointerdown=${(e) => this.onSlotClick(slot, e)}
        @contextmenu=${(e) => e.preventDefault()}
      >
        ${item
          ? html`
              <div class="slot-icon" style="background-position: -${sprite.x}px -${sprite.y}px"></div>
              <span class="slot-count">${item.count > 1 ? item.count : ''}</span>
            `
          : ''}
      </div>
    `
  }

  renderGrid (slots, columns) {
    return html`
      <div class="grid" style="grid-template-columns: repeat(${Math.min(columns, slots.length)}, 32px);">
        ${slots.map((slot) => this.renderSlot(slot))}
      </div>
    `
  }

  renderSection (title, slots, columns) {
    if (!slots.length) return ''
    return html`
      <div class="section">
        <div class="section-title">${title}</div>
        ${this.renderGrid(slots, columns)}
      </div>
    `
  }

  renderInventory () {
    const selected = this.bot.inventory.hotbarStart + (this.bot.quickBarSlot || 0)
    const main = range(9, 36)
    const hotbar = range(36, 45)
    return html`
      <div class="sections">
        <div class="top-sections">
          ${this.renderSection('Crafting', [1, 2, 3, 4, 0], 5)}
          ${this.renderSection('Armor / Offhand', [5, 6, 7, 8, 45], 5)}
        </div>
        <div class="section">
          <div class="section-title">Inventory</div>
          <div class="grid" style="grid-template-columns: repeat(9, 32px);">
            ${main.map((slot) => this.renderSlot(slot))}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Hotbar</div>
          <div class="grid" style="grid-template-columns: repeat(9, 32px);">
            ${hotbar.map((slot) => this.renderSlot(slot, slot === selected))}
          </div>
        </div>
      </div>
    `
  }

  renderContainer () {
    const win = this.activeWindow
    const invStart = win.inventoryStart ?? win.slots.length - 36
    const invEnd = win.inventoryEnd ?? win.slots.length - 9
    const containerSlots = range(0, invStart)
    const hotbarStart = Math.max(invStart, invEnd - 9)
    const main = range(invStart, hotbarStart)
    const hotbar = range(hotbarStart, Math.max(hotbarStart, win.slots.length))
    const columns = containerSlots.length > 27 ? 9 : Math.min(9, containerSlots.length)

    return html`
      <div class="sections">
        ${this.renderSection('Contents', containerSlots, columns)}
        ${this.renderSection('Inventory', main, 9)}
        ${this.renderSection('Hotbar', hotbar, 9)}
      </div>
    `
  }

  render () {
    if (!this.bot) return html`<div class="bg"></div>`
    const container = this.isContainer()
    const title = container
      ? (typeof this.activeWindow.title === 'string' ? this.activeWindow.title : 'Container')
      : 'Inventory'

    return html`
      <div class="bg" @pointerdown=${(e) => { if (e.target.classList.contains('bg')) this.close() }}></div>

      <div class="panel">
        <div class="titlebar">
          <span class="title">${title}</span>
          <pmui-button
            pmui-width="100px"
            pmui-label=${this.shiftMode ? 'Shift: On' : 'Shift: Off'}
            class=${this.shiftMode ? 'shift-on' : ''}
            @pmui-click=${() => { this.shiftMode = !this.shiftMode; this.requestUpdate() }}
          ></pmui-button>
        </div>

        <div class="scroll">
          ${container ? this.renderContainer() : this.renderInventory()}
        </div>

        <div class="toolbar">
          <pmui-button pmui-width="80px" pmui-label="Close" @pmui-click=${() => this.close()}></pmui-button>
        </div>
      </div>
    `
  }
}

window.customElements.define('pmui-inventoryscreen', InventoryScreen)
