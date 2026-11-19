/* global document */

// Touch-first controls for phones and tablets. It lives outside of the scaled
// Minecraft UI root so hit targets stay finger sized regardless of guiScale.

function build () {
  const root = document.createElement('div')
  root.id = 'mobile-controls'
  root.hidden = true
  root.innerHTML = `
    <div class="mc-stats">
      <span class="mc-stat mc-hp"><i></i><b id="mc-hp-value">20</b></span>
      <span class="mc-stat mc-food"><i></i><b id="mc-food-value">20</b></span>
    </div>
    <div class="mc-top">
      <button type="button" data-action="chat">CHAT</button>
      <button type="button" data-action="inventory">BAG</button>
      <button type="button" data-action="menu">MENU</button>
    </div>
    <div class="mc-joystick" id="mc-joystick">
      <div class="mc-knob" id="mc-knob"></div>
    </div>
    <div class="mc-toggles">
      <button type="button" data-toggle="sprint">RUN</button>
      <button type="button" data-toggle="sneak">SNEAK</button>
    </div>
    <div class="mc-actions">
      <button type="button" class="mc-action" data-hold="jump">JUMP</button>
      <button type="button" class="mc-action" data-press="attack">HIT</button>
      <button type="button" class="mc-action" data-press="use">USE</button>
      <button type="button" class="mc-action" data-hold="mine">MINE</button>
    </div>
  `
  document.getElementById('mobile-root').appendChild(root)
  return root
}

class MobileControls {
  constructor (handlers) {
    this.handlers = handlers || {}
    this.root = build()
    this.bot = null
    this.visible = false
    this.sprint = false
    this.sneak = false
    this.moveX = 0
    this.moveY = 0
    this.joystickPointer = null
    this.healthListener = null
    this.foodListener = null
    this.spawnListener = null
    this.deathListener = null
    this.bind()
  }

  bind () {
    const root = this.root

    root.addEventListener('contextmenu', (e) => e.preventDefault())

    for (const button of root.querySelectorAll('[data-action]')) {
      button.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (this.handlers.action) this.handlers.action(button.dataset.action)
      })
    }

    for (const button of root.querySelectorAll('[data-hold]')) {
      const action = button.dataset.hold
      const down = (e) => {
        e.preventDefault()
        e.stopPropagation()
        button.classList.add('mc-down')
        this.setHold(action, true)
      }
      const up = (e) => {
        e.preventDefault()
        e.stopPropagation()
        button.classList.remove('mc-down')
        this.setHold(action, false)
      }
      button.addEventListener('pointerdown', down)
      button.addEventListener('pointerup', up)
      button.addEventListener('pointercancel', up)
      button.addEventListener('pointerleave', (e) => {
        if (button.classList.contains('mc-down')) up(e)
      })
    }

    for (const button of root.querySelectorAll('[data-press]')) {
      const action = button.dataset.press
      const down = (e) => {
        e.preventDefault()
        e.stopPropagation()
        button.classList.add('mc-down')
        if (this.handlers.press) this.handlers.press(action)
      }
      const up = (e) => {
        e.preventDefault()
        e.stopPropagation()
        button.classList.remove('mc-down')
      }
      button.addEventListener('pointerdown', down)
      button.addEventListener('pointerup', up)
      button.addEventListener('pointercancel', up)
    }

    for (const button of root.querySelectorAll('[data-toggle]')) {
      const action = button.dataset.toggle
      button.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (action === 'sprint') this.setSprint(!this.sprint)
        if (action === 'sneak') this.setSneak(!this.sneak)
      })
    }

    const joystick = root.querySelector('#mc-joystick')
    const knob = root.querySelector('#mc-knob')

    const updateStick = (e) => {
      const rect = joystick.getBoundingClientRect()
      const radius = rect.width / 2
      let dx = e.clientX - (rect.left + radius)
      let dy = e.clientY - (rect.top + radius)
      const distance = Math.hypot(dx, dy)
      if (distance > radius) {
        dx = dx / distance * radius
        dy = dy / distance * radius
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      const nx = dx / radius
      const ny = dy / radius
      this.applyMove(nx, ny)
    }

    joystick.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.joystickPointer = e.pointerId
      try { joystick.setPointerCapture(e.pointerId) } catch (err) {}
      joystick.classList.add('mc-active')
      updateStick(e)
    })
    joystick.addEventListener('pointermove', (e) => {
      if (this.joystickPointer !== e.pointerId) return
      e.preventDefault()
      updateStick(e)
    })
    const endStick = (e) => {
      if (this.joystickPointer !== e.pointerId) return
      e.preventDefault()
      this.joystickPointer = null
      joystick.classList.remove('mc-active')
      knob.style.transform = ''
      this.applyMove(0, 0)
    }
    joystick.addEventListener('pointerup', endStick)
    joystick.addEventListener('pointercancel', endStick)
  }

  applyMove (x, y) {
    this.moveX = x
    this.moveY = y
    if (!this.bot) return
    const deadzone = 0.28
    this.bot.setControlState('forward', y < -deadzone)
    this.bot.setControlState('back', y > deadzone)
    this.bot.setControlState('left', x < -deadzone)
    this.bot.setControlState('right', x > deadzone)
    const magnitude = Math.hypot(x, y)
    if (magnitude > 0.92 && !this.sprint) {
      this.setSprint(true)
    } else if (magnitude < 0.5 && this.sprint && !this.handlers.keepSprint) {
      // Automatic sprint stops when the stick returns to the center.
      this.setSprint(false)
    }
  }

  setSprint (on) {
    this.sprint = on
    this.root.querySelector('[data-toggle="sprint"]').classList.toggle('mc-on', on)
    if (this.bot) this.bot.setControlState('sprint', on)
  }

  setSneak (on) {
    this.sneak = on
    this.root.querySelector('[data-toggle="sneak"]').classList.toggle('mc-on', on)
    if (this.bot) this.bot.setControlState('sneak', on)
  }

  setHold (action, on) {
    if (action === 'jump') {
      if (this.bot) this.bot.setControlState('jump', on)
      return
    }
    if (action === 'mine') {
      if (this.handlers.mine) this.handlers.mine(on)
    }
  }

  setVisible (visible) {
    this.visible = visible
    this.root.hidden = !visible
    if (!visible) this.applyMove(0, 0)
  }

  setOverlayOpen (open) {
    document.body.classList.toggle('mc-overlay-open', open)
  }

  attachBot (bot) {
    this.detachBot()
    this.bot = bot
    if (!bot) return

    const updateHealth = () => {
      const hp = this.root.querySelector('#mc-hp-value')
      const food = this.root.querySelector('#mc-food-value')
      if (hp) hp.textContent = Math.max(0, Math.round(bot.health ?? 20))
      if (food) food.textContent = Math.max(0, Math.round(bot.food ?? 20))
    }
    this.healthListener = updateHealth
    this.foodListener = updateHealth
    this.spawnListener = () => {
      this.setSprint(false)
      this.setSneak(false)
      this.applyMove(this.moveX, this.moveY)
      updateHealth()
    }
    this.deathListener = () => {
      this.setSprint(false)
      this.setSneak(false)
    }

    bot.on('health', updateHealth)
    bot.on('spawn', this.spawnListener)
    bot.on('death', this.deathListener)
    updateHealth()
  }

  detachBot () {
    if (!this.bot) return
    if (this.healthListener) this.bot.removeListener('health', this.healthListener)
    if (this.spawnListener) this.bot.removeListener('spawn', this.spawnListener)
    if (this.deathListener) this.bot.removeListener('death', this.deathListener)
    this.bot = null
  }
}

let instance = null

function getMobileControls (handlers) {
  if (!instance) instance = new MobileControls(handlers)
  return instance
}

module.exports = { MobileControls, getMobileControls }
