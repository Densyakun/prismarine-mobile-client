const { LitElement, html, css } = require('lit')
const { commonCss, isTextInput } = require('./components/common')
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

      .panel-holding .slot {
        touch-action: none;
      }

      .slot.drag-target {
        outline: 2px solid #ffffff;
        outline-offset: -2px;
        background: #b8b8b8;
      }

      .slot.slot-hover {
        outline: 2px solid rgba(255, 255, 255, 0.65);
        outline-offset: -2px;
      }

      .slot.long-press {
        outline: 2px solid #55aaff;
        outline-offset: -2px;
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
    this.creativeCursor = null
    this.creativeVisible = 180
    this.hoverSlot = null
    this.pointerGesture = null
    this.lastClick = { slot: null, time: 0 }
  }

  connectedCallback () {
    super.connectedCallback()
    this.onDocumentPointerMove = (e) => this.handlePointerMove(e)
    this.onDocumentPointerUp = (e) => this.handlePointerUp(e)
    this.onDocumentPointerCancel = () => this.cancelPointerGesture()
    this.onDocumentKeyDown = (e) => this.handleInventoryKey(e)
    document.addEventListener('pointermove', this.onDocumentPointerMove)
    document.addEventListener('pointerup', this.onDocumentPointerUp)
    document.addEventListener('pointercancel', this.onDocumentPointerCancel)
    document.addEventListener('keydown', this.onDocumentKeyDown, true)
  }

  disconnectedCallback () {
    document.removeEventListener('pointermove', this.onDocumentPointerMove)
    document.removeEventListener('pointerup', this.onDocumentPointerUp)
    document.removeEventListener('pointercancel', this.onDocumentPointerCancel)
    document.removeEventListener('keydown', this.onDocumentKeyDown, true)
    super.disconnectedCallback()
  }

  setBot (bot) {
    if (this.bot === bot) return
    this.detach()
    this.bot = bot
    this.creativeItems = null
    this.creativeItemsBot = null
    this.creativeCursor = null
    this.hoverSlot = null
    this.pointerGesture = null
    if (bot) {
      this.inventoryListener = () => this.refresh()
      bot.inventory.on('updateSlot', this.inventoryListener)
      this.gameListener = () => {
        if (!this.isCreative()) this.creativeCursor = null
        this.refresh()
      }
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
    this.cancelPointerGesture()
    if (this.bot) {
      if (this.isCreative() && !this.isContainer()) {
        this.creativeCursor = null
      } else {
        const win = this.inventoryWindow()
        if (win && win.selectedItem) this.bot.clickWindow(-999, 0, 0).catch(() => {})
      }
    }
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

  hasOffhandSlot () {
    if (!this.bot) return false
    if (typeof this.bot.supportFeature === 'function') {
      return !this.bot.supportFeature('doesntHaveOffHandSlot')
    }
    return true
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
    this.creativeCursor = this.makeCreativeItem(item.id, item.stackSize || 1, 0, null)
    this.requestUpdate()
  }

  inventoryWindow () {
    if (!this.bot) return null
    return this.isContainer() ? this.activeWindow : this.bot.inventory
  }

  cursorDisplayItem () {
    if (this.isCreative() && !this.isContainer()) return this.creativeCursor
    const win = this.inventoryWindow()
    return win ? win.selectedItem : null
  }

  makeCreativeItem (type, count, metadata, nbt) {
    const Item = require('prismarine-item')(this.bot.registry)
    return new Item(type, count, metadata, nbt)
  }

  cloneCreativeItem (item, count) {
    if (!item) return null
    const clone = this.makeCreativeItem(item.type, count === undefined ? item.count : count, item.metadata, item.nbt)
    if (item.components) clone.components = item.components
    if (item.removedComponents) clone.removedComponents = item.removedComponents
    if (item.componentMap) clone.componentMap = item.componentMap
    clone.stackId = item.stackId
    return clone
  }

  sameCreativeItem (a, b) {
    if (!a || !b) return false
    if (a.type !== b.type || a.metadata !== b.metadata) return false
    if (JSON.stringify(a.nbt || null) !== JSON.stringify(b.nbt || null)) return false
    if (a.components || b.components) {
      return JSON.stringify(a.components || []) === JSON.stringify(b.components || [])
    }
    return true
  }

  applyCreativeSlot (slot, item) {
    if (!this.bot) return
    if (item) item.slot = slot
    try { this.bot.inventory.updateSlot(slot, item) } catch (e) {}
    try {
      const Item = require('prismarine-item')(this.bot.registry)
      this.bot._client.write('set_creative_slot', { slot, item: Item.toNotch(item) })
    } catch (e) {}
  }

  pickUpCreative (slot, half = false) {
    const item = this.slotItem(slot)
    if (!item) return
    const count = half ? Math.ceil(item.count / 2) : item.count
    this.creativeCursor = this.cloneCreativeItem(item, count)
    const remaining = item.count - count
    this.applyCreativeSlot(slot, remaining > 0 ? this.cloneCreativeItem(item, remaining) : null)
    this.requestUpdate()
  }

  swapCreativeCursor (slot) {
    if (!this.creativeCursor) return
    const target = this.slotItem(slot)
    const cursor = this.creativeCursor
    this.applyCreativeSlot(slot, this.cloneCreativeItem(cursor))
    this.creativeCursor = target ? this.cloneCreativeItem(target) : null
    this.requestUpdate()
  }

  placeCreativeCursor (slot, amount) {
    if (!this.creativeCursor) return
    const target = this.slotItem(slot)
    const cursor = this.creativeCursor
    if (target && !this.sameCreativeItem(target, cursor)) {
      this.swapCreativeCursor(slot)
      return
    }
    const space = target ? Math.max(0, (target.stackSize || 64) - target.count) : (cursor.stackSize || 64)
    const count = Math.max(0, Math.min(amount, cursor.count, space))
    if (count <= 0) return
    if (target) {
      this.applyCreativeSlot(slot, this.cloneCreativeItem(target, target.count + count))
    } else {
      this.applyCreativeSlot(slot, this.cloneCreativeItem(cursor, count))
    }
    cursor.count -= count
    if (cursor.count <= 0) this.creativeCursor = null
    this.requestUpdate()
  }

  clickCreativeSlot (slot, button, shift) {
    if (button === 1) {
      if (!this.creativeCursor) {
        const item = this.slotItem(slot)
        if (item) {
          this.creativeCursor = this.cloneCreativeItem(item, item.stackSize || item.count)
          this.requestUpdate()
        }
      }
      return
    }
    if (shift) {
      this.quickMoveCreative(slot)
      return
    }
    if (button === 2) {
      if (!this.creativeCursor) {
        if (this.slotItem(slot)) this.pickUpCreative(slot, true)
      } else {
        this.placeCreativeCursor(slot, 1)
      }
      return
    }
    if (!this.creativeCursor) {
      if (this.slotItem(slot)) this.pickUpCreative(slot, false)
    } else {
      this.placeCreativeCursor(slot, this.creativeCursor.count)
    }
  }

  quickMoveCreative (slot) {
    if (!this.bot || this.creativeCursor) return
    const item = this.slotItem(slot)
    if (!item) return
    const hotbarStart = this.bot.inventory.hotbarStart
    let ranges
    if (slot >= hotbarStart && slot < hotbarStart + 9) {
      ranges = [[9, hotbarStart]]
    } else if (slot >= 9 && slot < hotbarStart) {
      ranges = [[hotbarStart, hotbarStart + 9]]
    } else {
      ranges = [[9, hotbarStart], [hotbarStart, hotbarStart + 9]]
    }
    let remaining = item.count
    for (const [start, end] of ranges) {
      for (let i = start; i < end && remaining > 0; i++) {
        const target = this.slotItem(i)
        if (target && this.sameCreativeItem(target, item) && target.count < (target.stackSize || 64)) {
          const add = Math.min(remaining, (target.stackSize || 64) - target.count)
          this.applyCreativeSlot(i, this.cloneCreativeItem(target, target.count + add))
          remaining -= add
        }
      }
      for (let i = start; i < end && remaining > 0; i++) {
        if (!this.slotItem(i)) {
          const add = Math.min(remaining, item.stackSize || 64)
          this.applyCreativeSlot(i, this.cloneCreativeItem(item, add))
          remaining -= add
        }
      }
    }
    this.applyCreativeSlot(slot, remaining > 0 ? this.cloneCreativeItem(item, remaining) : null)
    this.requestUpdate()
  }

  doubleClickCreative (slot) {
    if (!this.creativeCursor && this.slotItem(slot)) this.pickUpCreative(slot, false)
    if (!this.creativeCursor) return
    const cursor = this.creativeCursor
    const max = cursor.stackSize || 64
    if (cursor.count >= max) {
      this.requestUpdate()
      return
    }
    for (let i = 9; i < 45 && cursor.count < max; i++) {
      const item = this.slotItem(i)
      if (!item || !this.sameCreativeItem(item, cursor)) continue
      const take = Math.min(max - cursor.count, item.count)
      if (take <= 0) continue
      cursor.count += take
      const remaining = item.count - take
      this.applyCreativeSlot(i, remaining > 0 ? this.cloneCreativeItem(item, remaining) : null)
    }
    this.requestUpdate()
  }

  dropCreativeCursor (all = true) {
    if (!this.creativeCursor) return
    if (!all) {
      this.creativeCursor.count--
      if (this.creativeCursor.count > 0) {
        this.requestUpdate()
        return
      }
    }
    this.creativeCursor = null
    this.requestUpdate()
  }

  dropCreativeSlot (slot, all = true) {
    const item = this.slotItem(slot)
    if (!item) return
    const remaining = all ? 0 : item.count - 1
    this.applyCreativeSlot(slot, remaining > 0 ? this.cloneCreativeItem(item, remaining) : null)
    this.requestUpdate()
  }

  swapCreativeWithHotbar (slot, index) {
    if (!this.bot || this.creativeCursor) return
    const hotbarSlot = this.bot.inventory.hotbarStart + index
    if (slot === hotbarSlot) return
    const a = this.slotItem(slot)
    const b = this.slotItem(hotbarSlot)
    if (!a && !b) return
    this.applyCreativeSlot(hotbarSlot, a ? this.cloneCreativeItem(a) : null)
    this.applyCreativeSlot(slot, b ? this.cloneCreativeItem(b) : null)
    this.requestUpdate()
  }

  swapCreativeOffhand (slot) {
    if (!this.bot || !this.hasOffhandSlot() || slot === 45 || this.creativeCursor) return
    const a = this.slotItem(slot)
    const b = this.slotItem(45)
    if (!a && !b) return
    this.applyCreativeSlot(45, a ? this.cloneCreativeItem(a) : null)
    this.applyCreativeSlot(slot, b ? this.cloneCreativeItem(b) : null)
    this.requestUpdate()
  }

  clickSurvivalSlot (slot, button, shift) {
    if (!this.bot) return
    const mouseButton = button === 2 ? 1 : 0
    const mode = shift ? 1 : 0
    this.bot.clickWindow(slot, mouseButton, mode).catch(() => {})
    this.refresh()
  }

  swapSurvivalWithHotbar (slot, index) {
    if (!this.bot) return
    this.bot.clickWindow(slot, index, 2).catch(() => {})
    this.refresh()
  }

  dropSurvivalSlot (slot, all) {
    if (!this.bot) return
    this.bot.clickWindow(slot, all ? 1 : 0, 4).catch(() => {})
    this.refresh()
  }

  async swapSurvivalOffhand (slot) {
    if (!this.bot || this.isContainer() || !this.hasOffhandSlot() || slot === 45) return
    const win = this.inventoryWindow()
    if (win && win.selectedItem) return
    if (!this.slotItem(slot) && !this.slotItem(45)) return
    try {
      await this.bot.clickWindow(slot, 0, 0)
      await this.bot.clickWindow(45, 0, 0)
      await this.bot.clickWindow(slot, 0, 0)
    } catch (e) {}
    this.refresh()
  }

  async doubleClickSurvival (slot) {
    if (!this.bot) return
    const win = this.inventoryWindow()
    if (!win) return
    if (!win.selectedItem) {
      if (!this.slotItem(slot)) return
      await this.bot.clickWindow(slot, 0, 0)
    }
    const start = Math.max(0, win.inventoryStart || 9)
    const end = Math.min(win.inventoryEnd || 45, 45)
    let cursor = this.inventoryWindow().selectedItem
    if (!cursor) return
    const max = cursor.stackSize || 64
    for (let i = start; i < end; i++) {
      cursor = this.inventoryWindow().selectedItem
      if (!cursor || cursor.count >= max) break
      const item = this.slotItem(i)
      if (!item || !this.sameCreativeItem(item, cursor)) continue
      await this.bot.clickWindow(i, 0, 0)
    }
    this.refresh()
  }

  dragCreative (gesture) {
    if (!this.creativeCursor) return
    const cursor = this.creativeCursor
    const slots = []
    for (const slot of gesture.slots) {
      if (slots.indexOf(slot) === -1) slots.push(slot)
    }
    const targets = slots.filter((slot) => {
      const item = this.slotItem(slot)
      return !item || this.sameCreativeItem(item, cursor)
    })
    if (!targets.length) return
    if (gesture.button === 2) {
      for (const slot of targets) {
        if (!this.creativeCursor) break
        this.placeCreativeCursor(slot, 1)
      }
      return
    }
    const total = cursor.count
    const base = Math.floor(total / targets.length)
    let remainder = total % targets.length
    for (const slot of targets) {
      if (!this.creativeCursor) break
      const target = this.slotItem(slot)
      const space = target ? Math.max(0, (target.stackSize || 64) - target.count) : (cursor.stackSize || 64)
      let amount = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
      amount = Math.min(amount, space)
      if (amount > 0) this.placeCreativeCursor(slot, amount)
    }
  }

  async dragSurvival (gesture) {
    if (!this.bot) return
    const win = this.inventoryWindow()
    if (!win || !win.selectedItem) return
    const cursor = win.selectedItem
    const slots = []
    for (const slot of gesture.slots) {
      if (slots.indexOf(slot) === -1) slots.push(slot)
    }
    const targets = slots.filter((slot) => {
      const item = this.slotItem(slot)
      return !item || this.sameCreativeItem(item, cursor)
    })
    if (!targets.length) return
    if (gesture.button === 2) {
      for (const slot of targets) {
        if (!this.inventoryWindow().selectedItem) break
        await this.bot.clickWindow(slot, 1, 0)
      }
    } else {
      const total = cursor.count
      const base = Math.floor(total / targets.length)
      let remainder = total % targets.length
      for (const slot of targets) {
        const item = this.slotItem(slot)
        const stackSize = item ? (item.stackSize || 64) : (cursor.stackSize || 64)
        const space = item ? Math.max(0, stackSize - item.count) : stackSize
        let amount = base + (remainder > 0 ? 1 : 0)
        if (remainder > 0) remainder--
        amount = Math.min(amount, space)
        for (let i = 0; i < amount; i++) {
          if (!this.inventoryWindow().selectedItem) break
          await this.bot.clickWindow(slot, 1, 0)
        }
      }
    }
    this.refresh()
  }

  applyDrag (gesture) {
    if (this.isCreative() && !this.isContainer()) this.dragCreative(gesture)
    else this.dragSurvival(gesture)
  }

  applyClick (slot, button, shift) {
    if (!this.bot) return
    if (this.isCreative() && !this.isContainer()) this.clickCreativeSlot(slot, button, shift)
    else this.clickSurvivalSlot(slot, button, shift)
  }

  applyDoubleClick (slot) {
    if (this.isCreative() && !this.isContainer()) this.doubleClickCreative(slot)
    else this.doubleClickSurvival(slot)
  }

  slotItem (slot) {
    if (!this.bot) return null
    const source = this.isContainer() ? this.activeWindow : this.bot.inventory
    return source.slots[slot] ?? null
  }

  onSlotPointerDown (slot, event) {
    event.preventDefault()
    event.stopPropagation()
    if (!this.bot) return
    this.hoverSlot = slot
    if (event.button === 1) {
      if (this.isCreative() && !this.isContainer()) this.clickCreativeSlot(slot, 1, false)
      return
    }
    this.clearDragTargets()
    const gesture = {
      slot,
      button: event.button,
      shift: event.shiftKey || this.shiftMode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      slots: [slot],
      dragging: false,
      longPressed: false,
      longPressTimer: null
    }
    if (event.pointerType !== 'mouse' && event.button === 0) {
      gesture.longPressTimer = setTimeout(() => {
        if (this.pointerGesture !== gesture || gesture.dragging) return
        gesture.button = 2
        gesture.longPressed = true
        const element = this.shadowRoot.querySelector('.slot[data-slot="' + slot + '"]')
        if (element) element.classList.add('long-press')
      }, 450)
    }
    this.pointerGesture = gesture
    this.addDragTarget(slot)
  }

  slotAtPoint (x, y) {
    if (!this.shadowRoot) return null
    const element = this.shadowRoot.elementFromPoint(x, y)
    if (!element || typeof element.closest !== 'function') return null
    const slot = element.closest('.slot[data-slot]')
    if (!slot) return null
    const index = Number(slot.dataset.slot)
    return Number.isInteger(index) ? index : null
  }

  addDragTarget (slot) {
    const element = this.shadowRoot.querySelector('.slot[data-slot="' + slot + '"]')
    if (element) element.classList.add('drag-target')
  }

  clearDragTargets () {
    if (!this.shadowRoot) return
    this.shadowRoot.querySelectorAll('.slot.drag-target').forEach((element) => element.classList.remove('drag-target'))
  }

  clearLongPress () {
    if (this.pointerGesture && this.pointerGesture.longPressTimer) {
      clearTimeout(this.pointerGesture.longPressTimer)
      this.pointerGesture.longPressTimer = null
    }
    if (!this.shadowRoot) return
    this.shadowRoot.querySelectorAll('.slot.long-press').forEach((element) => element.classList.remove('long-press'))
  }

  cancelPointerGesture () {
    this.clearLongPress()
    this.pointerGesture = null
    this.clearDragTargets()
  }

  handlePointerMove (event) {
    const gesture = this.pointerGesture
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!gesture.dragging) {
      const dx = event.clientX - gesture.startX
      const dy = event.clientY - gesture.startY
      if (dx * dx + dy * dy < 64) return
      gesture.dragging = true
      if (gesture.longPressTimer) {
        clearTimeout(gesture.longPressTimer)
        gesture.longPressTimer = null
      }
      this.clearLongPress()
    }
    const slot = this.slotAtPoint(event.clientX, event.clientY)
    if (slot === null || gesture.slots.indexOf(slot) !== -1) return
    gesture.slots.push(slot)
    this.addDragTarget(slot)
    if (event.cancelable) event.preventDefault()
  }

  handlePointerUp (event) {
    const gesture = this.pointerGesture
    if (!gesture || gesture.pointerId !== event.pointerId) return
    this.clearLongPress()
    this.pointerGesture = null
    this.clearDragTargets()
    if (gesture.dragging && gesture.slots.length > 1) {
      this.applyDrag(gesture)
      return
    }
    if (gesture.button === 0 && !gesture.shift) {
      const now = performance.now()
      const doubleClick = this.lastClick.slot === gesture.slot && now - this.lastClick.time < 320
      this.lastClick = { slot: gesture.slot, time: doubleClick ? 0 : now }
      if (doubleClick) {
        this.applyDoubleClick(gesture.slot)
        return
      }
    } else {
      this.lastClick = { slot: null, time: 0 }
    }
    this.applyClick(gesture.slot, gesture.button, gesture.shift)
  }

  digitFromCode (code) {
    if (code.startsWith('Digit')) {
      const value = Number(code.slice(5))
      return value >= 1 && value <= 9 ? value : null
    }
    if (code.startsWith('Numpad')) {
      const value = Number(code.slice(6))
      return value >= 1 && value <= 9 ? value : null
    }
    return null
  }

  handleInventoryKey (event) {
    if (this.style.display !== 'block') return
    if (isTextInput(event.target)) return
    if (event.repeat) return
    if (event.code === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.cancelPointerGesture()
      this.dropCursorItem()
      this.close()
      return
    }
    if (!this.bot) return
    const hasCursor = !!this.cursorDisplayItem()
    if (event.code === 'KeyQ' && !event.altKey) {
      if (this.hoverSlot === null && !hasCursor) return
      event.preventDefault()
      event.stopPropagation()
      const all = event.ctrlKey || event.metaKey
      if (this.isCreative() && !this.isContainer()) {
        if (this.creativeCursor) this.dropCreativeCursor(all)
        else this.dropCreativeSlot(this.hoverSlot, all)
      } else if (hasCursor) {
        this.dropCursorItem()
      } else {
        this.dropSurvivalSlot(this.hoverSlot, all)
      }
      return
    }
    if (this.hoverSlot === null) return
    const digit = this.digitFromCode(event.code)
    if (digit !== null && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      if (this.isCreative() && !this.isContainer()) this.swapCreativeWithHotbar(this.hoverSlot, digit - 1)
      else this.swapSurvivalWithHotbar(this.hoverSlot, digit - 1)
      return
    }
    if (event.code === 'KeyF' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      if (this.isContainer()) return
      if (this.isCreative()) this.swapCreativeOffhand(this.hoverSlot)
      else this.swapSurvivalOffhand(this.hoverSlot)
    }
  }

  dropCursorItem () {
    if (!this.bot) return
    if (this.isCreative() && !this.isContainer()) {
      this.creativeCursor = null
      this.requestUpdate()
      return
    }
    const win = this.inventoryWindow()
    if (win && win.selectedItem) this.bot.clickWindow(-999, 0, 0).catch(() => {})
    this.refresh()
  }

  handleBackgroundPointerDown (event) {
    if (this.cursorDisplayItem()) {
      event.preventDefault()
      event.stopPropagation()
      this.dropCursorItem()
      return
    }
    this.close()
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
        @pointerdown=${(e) => this.onSlotPointerDown(slot, e)}
        @pointerenter=${(e) => {
          this.hoverSlot = slot
          e.currentTarget.classList.add('slot-hover')
        }}
        @pointerleave=${(e) => {
          if (this.hoverSlot === slot) this.hoverSlot = null
          e.currentTarget.classList.remove('slot-hover')
        }}
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
    return html`
      <div
        class="slot creative-slot"
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
    const cursor = this.creativeCursor
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

        ${cursor
          ? ''
          : html`<div class="held-hint">Tap: pick/place · Right-click / long-press: split/one · Drag: distribute · Double-tap: collect · 1-9: hotbar · Q: drop · F: offhand</div>`}

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

        <div class="top-sections">
          <div class="section">
            <div class="section-title">Armor</div>
            <div class="grid" style="grid-template-columns: repeat(4, 32px);">
              ${[5, 6, 7, 8].map((slot) => this.renderSlot(slot))}
            </div>
            <div class="section-note">Helmet · Chestplate · Leggings · Boots</div>
          </div>
          ${this.hasOffhandSlot()
            ? html`
                <div class="section">
                  <div class="section-title">Offhand</div>
                  ${this.renderSlot(45)}
                </div>
              `
            : ''}
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
    const cursorItem = this.cursorDisplayItem()
    const title = container
      ? (typeof this.activeWindow.title === 'string' ? this.activeWindow.title : 'Container')
      : (creative ? 'Creative Inventory' : 'Inventory')

    return html`
      <div class="bg" @pointerdown=${(e) => { if (e.target.classList.contains('bg')) this.handleBackgroundPointerDown(e) }}></div>

      <div class="panel ${creative ? 'creative-panel' : ''} ${cursorItem ? 'panel-holding' : ''}">
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
          ${container ? this.renderContainer() : (creative ? this.renderCreative() : this.renderInventory())}
        </div>

        ${cursorItem
          ? html`
              <div class="held-bar">
                <span>Holding: ${cursorItem.displayName || cursorItem.name} ×${cursorItem.count}</span>
                <button class="held-clear" @pointerdown=${(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  this.dropCursorItem()
                }}>Drop</button>
              </div>
            `
          : ''}

        <div class="toolbar">
          <pmui-button pmui-width="80px" pmui-label="Close" @pmui-click=${() => this.close()}></pmui-button>
        </div>
      </div>
    `
  }
}

window.customElements.define('pmui-inventoryscreen', InventoryScreen)
