const { LitElement, html, css } = require('lit')
const { commonCss } = require('./components/common')
const invsprite = require('../invsprite.json')

const CREATIVE_CATEGORIES = ['All', 'Blocks', 'Tools', 'Combat', 'Food', 'Redstone', 'Materials']

const TOOL_PATTERN = /(_pickaxe|_axe|_shovel|_hoe|shears|flint_and_steel|fishing_rod|bucket|compass|clock|spyglass|brush|lead|name_tag|saddle|elytra|carrot_on_a_stick|warped_fungus_on_a_stick)$/
const COMBAT_PATTERN = /(_sword|_helmet|_chestplate|_leggings|_boots|(^|_)(bow|crossbow|arrow|shield|totem_of_undying|trident)$)/
const REDSTONE_PATTERN = /(redstone|repeater|comparator|piston|observer|dispenser|dropper|hopper|lever|_button|pressure_plate|tripwire|daylight_detector|target|note_block|jukebox|_rail|minecart|command_block|structure_block|sculk_sensor|sculk_shrieker|tnt)/

function range (start, end) {
  const out = []
  for (let i = start; i < end; i++) out.push(i)
  return out
}

function spriteFor (item) {
  if (!item) return null
  return invsprite[item.name] || null
}

function classifyCreativeItem (name, isBlock, isFood) {
  if (isFood) return 'Food'
  if (REDSTONE_PATTERN.test(name)) return 'Redstone'
  if (TOOL_PATTERN.test(name)) return 'Tools'
  if (COMBAT_PATTERN.test(name)) return 'Combat'
  if (isBlock) return 'Blocks'
  return 'Materials'
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
        gap: 8px;
        justify-content: center;
        align-items: flex-start;
      }

      .crafting {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
      }

      .craft-arrow {
        color: #444;
        font-size: 14px;
        line-height: 1;
      }

      .section-note {
        font-size: 8px;
        color: #444;
        margin-top: 2px;
        text-align: center;
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

      .creative-panel {
        width: min(360px, calc(100% - 8px));
      }

      .creative-tools {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
      }

      .creative-search {
        flex: 1;
        min-width: 0;
        height: 20px;
        padding: 0 4px;
        background: #000;
        border: 1px solid #555;
        color: white;
        font-family: minecraft, mojangles, monospace;
        font-size: 10px;
        outline: none;
      }

      .creative-search:focus {
        border-color: #fff;
      }

      .creative-count {
        flex: none;
        font-size: 8px;
        color: #333;
        white-space: nowrap;
      }

      .category-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 3px;
      }

      .category {
        padding: 2px 5px;
        background: #8b8b8b;
        border: 2px solid;
        border-color: #fff #373737 #373737 #fff;
        color: #222;
        font-family: minecraft, mojangles, monospace;
        font-size: 8px;
        line-height: 1.2;
        cursor: pointer;
      }

      .category.active {
        background: #e8e8e8;
        border-color: #373737 #fff #fff #373737;
        outline: 1px solid #2b7a2b;
      }

      .held-bar {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 2px 4px;
        background: #a8a8a8;
        color: #222;
        font-size: 9px;
      }

      .held-bar span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .held-hint {
        font-size: 8px;
        color: #444;
        text-align: center;
      }

      .held-clear,
      .more {
        flex: none;
        padding: 2px 6px;
        background: #8b8b8b;
        border: 2px solid;
        border-color: #fff #373737 #373737 #fff;
        color: #222;
        font-family: minecraft, mojangles, monospace;
        font-size: 9px;
        cursor: pointer;
      }

      .more {
        display: block;
        margin: 4px auto 0;
      }

      .creative-results {
        max-height: 38vh;
        overflow-y: auto;
        padding: 2px;
      }

      .creative-grid {
        grid-template-columns: repeat(auto-fill, 32px);
      }

      .creative-slot {
        cursor: pointer;
      }

      .creative-slot.picked {
        outline: 2px solid #2b7a2b;
        outline-offset: -2px;
        background: #a8a8a8;
      }

      .slot-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        text-shadow: 1px 1px 0 #333;
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

      @media (pointer: coarse) {
        .creative-search {
          height: 34px;
          font-size: 16px;
        }

        .category {
          padding: 5px 8px;
          font-size: 11px;
        }

        .creative-count,
        .held-hint {
          font-size: 10px;
        }

        .held-bar {
          padding: 4px 6px;
          font-size: 11px;
        }

        .held-clear,
        .more {
          padding: 5px 8px;
          font-size: 11px;
        }

        .creative-results {
          max-height: 32vh;
        }
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
    this.gameListener = null
    this.creativeItems = null
    this.creativeItemsBot = null
    this.creativeSearch = ''
    this.creativeCategory = 'All'
    this.creativeHeld = null
    this.creativeVisible = 180
  }

  setBot (bot) {
    if (this.bot === bot) return
    this.detach()
    this.bot = bot
    this.creativeItems = null
    this.creativeItemsBot = null
    this.creativeHeld = null
    if (bot) {
      this.inventoryListener = () => this.refresh()
      bot.inventory.on('updateSlot', this.inventoryListener)
      this.gameListener = () => this.refresh()
      bot.on('game', this.gameListener)
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
    if (this.gameListener && this.bot) {
      try { this.bot.removeListener('game', this.gameListener) } catch (e) {}
    }
    this.inventoryListener = null
    this.gameListener = null
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

  isCreative () {
    if (!this.bot) return false
    if (this.bot.player && this.bot.player.gamemode === 1) return true
    return !!(this.bot.game && this.bot.game.gameMode === 'creative')
  }

  creativeItemList () {
    if (!this.bot || !this.bot.registry) return []
    if (this.creativeItems && this.creativeItemsBot === this.bot) return this.creativeItems

    const registry = this.bot.registry
    const foods = registry.foodsByName || {}
    const blocks = registry.blocksByName || {}
    const items = registry.itemsArray || Object.values(registry.items || {})

    this.creativeItems = items
      .filter((item) => item && item.id > 0 && item.name && item.name !== 'air')
      .map((item) => {
        const displayName = item.displayName || item.name
        return {
          id: item.id,
          name: item.name,
          displayName,
          stackSize: item.stackSize || 64,
          category: classifyCreativeItem(item.name, !!blocks[item.name], !!foods[item.name]),
          search: (item.name + ' ' + displayName).toLowerCase()
        }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
    this.creativeItemsBot = this.bot
    return this.creativeItems
  }

  filteredCreativeItems () {
    const query = this.creativeSearch.trim().toLowerCase()
    const normalized = query.replace(/ /g, '_')
    const category = this.creativeCategory
    return this.creativeItemList().filter((item) => {
      if (category !== 'All' && item.category !== category) return false
      if (!query) return true
      return item.search.includes(query) || item.name.includes(normalized)
    })
  }

  onCreativeSearch (e) {
    this.creativeSearch = e.target.value
    this.creativeVisible = 180
    this.requestUpdate()
  }

  setCreativeCategory (category) {
    this.creativeCategory = category
    this.creativeVisible = 180
    this.requestUpdate()
  }

  showMoreCreative () {
    this.creativeVisible += 180
    this.requestUpdate()
  }

  pickCreative (item) {
    this.creativeHeld = {
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      count: item.stackSize
    }
    this.requestUpdate()
  }

  clearCreativeHeld () {
    this.creativeHeld = null
    this.requestUpdate()
  }

  giveCreativeToSlot (slot) {
    if (!this.bot || !this.creativeHeld || !this.bot.creative) return
    if (typeof this.bot.creative.setInventorySlot !== 'function') return
    if (slot < 0 || slot > 44) return
    const held = this.creativeHeld
    const Item = require('prismarine-item')(this.bot.registry)
    const stack = new Item(held.id, held.count)
    this.bot.creative.setInventorySlot(slot, stack).catch(() => {})
    const hotbarStart = this.bot.inventory.hotbarStart
    if (slot >= hotbarStart && slot < hotbarStart + 9) {
      try { this.bot.setQuickBarSlot(slot - hotbarStart) } catch (e) {}
    }
    this.refresh()
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
    if (this.isCreative() && this.creativeHeld && !this.isContainer()) {
      this.giveCreativeToSlot(slot)
      return
    }
    const button = e.button === 2 ? 1 : 0
    const mode = this.shiftMode && !this.isCreative() ? 1 : 0
    this.bot.clickWindow(slot, button, mode).catch(() => {})
    this.refresh()
  }

  renderItemIcon (item) {
    const sprite = spriteFor(item)
    if (sprite) {
      return html`<div class="slot-icon" style="background-position: -${sprite.x}px -${sprite.y}px"></div>`
    }
    return html`<span class="slot-fallback">${(item.displayName || item.name || '?').charAt(0).toUpperCase()}</span>`
  }

  renderSlot (slot, selected = false) {
    const item = this.slotItem(slot)
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
              ${this.renderItemIcon(item)}
              <span class="slot-count">${item.count > 1 ? item.count : ''}</span>
            `
          : ''}
      </div>
    `
  }

  renderPaletteItem (item) {
    const picked = !!this.creativeHeld && this.creativeHeld.name === item.name
    return html`
      <div
        class="slot creative-slot ${picked ? 'picked' : ''}"
        title="${item.displayName}"
        @pointerdown=${(e) => {
          e.preventDefault()
          e.stopPropagation()
          this.pickCreative(item)
        }}
        @contextmenu=${(e) => e.preventDefault()}
      >
        ${this.renderItemIcon(item)}
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
          <div class="section">
            <div class="section-title">Crafting</div>
            <div class="crafting">
              <div class="grid" style="grid-template-columns: repeat(2, 32px);">
                ${[1, 2, 3, 4].map((slot) => this.renderSlot(slot))}
              </div>
              <span class="craft-arrow">→</span>
              ${this.renderSlot(0)}
            </div>
          </div>
          <div class="section">
            <div class="section-title">Armor</div>
            <div class="grid" style="grid-template-columns: repeat(4, 32px);">
              ${[5, 6, 7, 8].map((slot) => this.renderSlot(slot))}
            </div>
            <div class="section-note">Helmet · Chestplate · Leggings · Boots</div>
          </div>
          <div class="section">
            <div class="section-title">Offhand</div>
            ${this.renderSlot(45)}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Inventory</div>
          <div class="grid" style="grid-template-columns: repeat(9, 32px);">
            ${main.map((slot) => this.renderSlot(slot))}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Armor</div>
          <div class="grid" style="grid-template-columns: repeat(4, 32px);">
            ${[5, 6, 7, 8].map((slot) => this.renderSlot(slot))}
          </div>
          <div class="section-note">Helmet · Chestplate · Leggings · Boots</div>
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

  renderCreative () {
    const items = this.filteredCreativeItems()
    const visible = items.slice(0, this.creativeVisible)
    const selected = this.bot.inventory.hotbarStart + (this.bot.quickBarSlot || 0)
    const main = range(9, 36)
    const hotbar = range(36, 45)

    return html`
      <div class="sections">
        <div class="creative-tools">
          <input
            class="creative-search"
            type="text"
            placeholder="Search items..."
            spellcheck="false"
            autocomplete="off"
            .value=${this.creativeSearch}
            @input=${(e) => this.onCreativeSearch(e)}
            @keydown=${(e) => {
              if (e.code === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                this.close()
              }
            }}
          >
          <span class="creative-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
        </div>

        <div class="category-row">
          ${CREATIVE_CATEGORIES.map((category) => html`
            <button
              class="category ${category === this.creativeCategory ? 'active' : ''}"
              @pointerdown=${(e) => {
                e.preventDefault()
                e.stopPropagation()
                this.setCreativeCategory(category)
              }}
            >${category}</button>
          `)}
        </div>

        ${this.creativeHeld
          ? html`
              <div class="held-bar">
                <span>Held: ${this.creativeHeld.displayName} ×${this.creativeHeld.count}</span>
                <button class="held-clear" @pointerdown=${(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  this.clearCreativeHeld()
                }}>Clear</button>
              </div>
            `
          : html`<div class="held-hint">Pick an item, then tap a slot to place it.</div>`}

        <div class="creative-results">
          <div class="grid creative-grid">
            ${visible.map((item) => this.renderPaletteItem(item))}
          </div>
          ${items.length > visible.length
            ? html`
                <button class="more" @pointerdown=${(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  this.showMoreCreative()
                }}>Show ${Math.min(180, items.length - visible.length)} more</button>
              `
            : ''}
          ${items.length === 0 ? html`<div class="empty">No items found</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Armor</div>
          <div class="grid" style="grid-template-columns: repeat(4, 32px);">
            ${[5, 6, 7, 8].map((slot) => this.renderSlot(slot))}
          </div>
          <div class="section-note">Helmet · Chestplate · Leggings · Boots</div>
        </div>

        <div class="section">
          <div class="section-title">Hotbar</div>
          <div class="grid" style="grid-template-columns: repeat(9, 32px);">
            ${hotbar.map((slot) => this.renderSlot(slot, slot === selected))}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Inventory</div>
          <div class="grid" style="grid-template-columns: repeat(9, 32px);">
            ${main.map((slot) => this.renderSlot(slot))}
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
    const creative = !container && this.isCreative()
    const title = container
      ? (typeof this.activeWindow.title === 'string' ? this.activeWindow.title : 'Container')
      : (creative ? 'Creative Inventory' : 'Inventory')

    return html`
      <div class="bg" @pointerdown=${(e) => { if (e.target.classList.contains('bg')) this.close() }}></div>

      <div class="panel ${creative ? 'creative-panel' : ''}">
        <div class="titlebar">
          <span class="title">${title}</span>
          ${creative
            ? ''
            : html`
                <pmui-button
                  pmui-width="100px"
                  pmui-label=${this.shiftMode ? 'Shift: On' : 'Shift: Off'}
                  class=${this.shiftMode ? 'shift-on' : ''}
                  @pmui-click=${() => { this.shiftMode = !this.shiftMode; this.requestUpdate() }}
                ></pmui-button>
              `}
        </div>

        <div class="scroll">
          ${container ? this.renderContainer() : (creative ? this.renderCreative() : this.renderInventory())}
        </div>

        <div class="toolbar">
          <pmui-button pmui-width="80px" pmui-label="Close" @pmui-click=${() => this.close()}></pmui-button>
        </div>
      </div>
    `
  }
}

window.customElements.define('pmui-inventoryscreen', InventoryScreen)
