const { LitElement, html, css } = require('lit')
const { isMobile } = require('./components/common')

const GAME_MODES = ['survival', 'creative', 'adventure', 'spectator']

// The server is authoritative for the game mode: it is delivered in the login
// / respawn packets and in game_state_change (both captured by mineflayer in
// `bot.game.gameMode`). `bot.player.gamemode` can be missing on 1.18 servers,
// so only use it as a fallback.
function gameModeOf (bot) {
  if (bot && bot.game && typeof bot.game.gameMode === 'string') {
    const index = GAME_MODES.indexOf(bot.game.gameMode)
    if (index !== -1) return index
  }
  if (bot && bot.player && typeof bot.player.gamemode === 'number') return bot.player.gamemode
  return 0
}

class Hud extends LitElement {
  static get styles () {
    return css`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        z-index: -2;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      chat-box,
      pmui-hotbar,
      pmui-debug-overlay {
        pointer-events: auto;
      }

      .crosshair {
        width: 16px;
        height: 16px;
        background: url('textures/1.17.1/gui/icons.png');
        background-size: 256px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
      }

      #xp-label {
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translate(-50%);
        font-size: 10px;
        font-family: minecraft, mojangles, monospace;
        color: rgb(30, 250, 30);
        text-shadow: 0px -1px #000, 0px 1px #000, 1px 0px #000, -1px 0px #000;
        z-index: 10;
      }

      #xp-bar-bg {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translate(-50%);
        width: 182px;
        height: 5px;
        background-image: url('textures/1.16.4/gui/icons.png');
        background-size: 256px;
        background-position-y: -64px;
      }

      .xp-bar {
        width: 182px;
        height: 5px;
        background-image: url('textures/1.17.1/gui/icons.png');
        background-size: 256px;
        background-position-y: -69px;
      }

      @media (pointer: coarse) {
        pmui-hotbar {
          transform: scale(1.65);
          transform-origin: bottom center;
        }

        #xp-bar-bg {
          bottom: calc(38px + env(safe-area-inset-bottom));
          transform: translate(-50%) scale(1.65);
          transform-origin: bottom center;
        }

        #xp-label {
          top: -13px;
          font-size: 14px;
        }
      }
    `
  }

  static get properties () {
    return {
      bot: { type: Object }
    }
  }

  /**
   * @param {import('mineflayer').Bot} bot
   */
  preload (bot) {
    const bossBars = this.shadowRoot.querySelector('#bossbars-overlay')
    bossBars.bot = bot

    bossBars.init()
  }

  /**
   * @param {globalThis.THREE.Renderer} renderer
   * @param {import('mineflayer').Bot} bot
   * @param {string} host
   */
  init (renderer, bot, host) {
    const debugMenu = this.shadowRoot.querySelector('#debug-overlay')
    const playerList = this.shadowRoot.querySelector('#playerlist-overlay')
    const healthbar = this.shadowRoot.querySelector('#health-bar')
    const foodbar = this.shadowRoot.querySelector('#food-bar')
    // const breathbar = this.shadowRoot.querySelector('#breath-bar')
    const chat = this.shadowRoot.querySelector('#chat')
    const hotbar = this.shadowRoot.querySelector('#hotbar')
    const xpLabel = this.shadowRoot.querySelector('#xp-label')

    this.bot = bot
    hotbar.bot = bot
    debugMenu.bot = bot

    hotbar.init()
    chat.init(bot._client, renderer, bot)
    bot.on('spawn', () => playerList.init(bot, host))

    bot.on('entityHurt', (entity) => {
      if (entity !== bot.entity) return
      healthbar.onDamage()
    })

    bot.on('entityEffect', (entity, effect) => {
      if (entity !== bot.entity) return
      healthbar.effectAdded(effect)
    })

    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity !== bot.entity) return
      healthbar.effectEnded(effect)
    })

    const xpBar = this.shadowRoot.querySelector('#xp-bar-bg')

    const updateGameMode = () => {
      const gameMode = gameModeOf(bot)
      healthbar.gameModeChanged(gameMode, bot.game && bot.game.hardcore)
      foodbar.gameModeChanged(gameMode)
      // breathbar.gameModeChanged(gameMode)
      xpBar.style.display = gameMode === 1 ? 'none' : 'block'
    }

    const updateExperience = () => {
      if (!bot.experience) return
      xpBar.firstElementChild.style.width = `${182 * bot.experience.progress}px`
      xpLabel.innerHTML = bot.experience.level
      xpLabel.style.display = bot.experience.level > 0 ? 'block' : 'none'
    }

    const updateVitals = () => {
      updateGameMode()
      updateExperience()
      healthbar.updateHealth(bot.health ?? 20)
      foodbar.updateHunger(bot.food ?? 20)
      // breathbar.updateOxygen(bot.oxygenLevel ?? 20)
    }

    bot.on('game', updateGameMode)

    bot.on('health', () => {
      healthbar.updateHealth(bot.health, true)
      foodbar.updateHunger(bot.food, true)
    })

    bot.on('experience', updateExperience)
    bot.on('spawn', updateVitals)

    // `init` runs while the first spawn event is being emitted, so a listener
    // registered above will not see it. Apply the current state right away.
    updateVitals()

    if (document.getElementById('options-screen').forceMobileControls || isMobile()) {
      this.showMobileControls(true)
    } else {
      this.showMobileControls(false)
    }
  }

  /** @param {boolean} bl */
  showMobileControls (bl) {
    window.dispatchEvent(new window.CustomEvent('pmui-mobile-toggle', { detail: bl }))
  }

  render () {
    return html`
      <pmui-debug-overlay id="debug-overlay"></pmui-debug-overlay>
      <pmui-playerlist-overlay id="playerlist-overlay"></pmui-playerlist-overlay>
      <pmui-bossbars-overlay id="bossbars-overlay"></pmui-bossbars-overlay>
      <div class="crosshair"></div>
      <chat-box id="chat"></chat-box>
      <!--<pmui-breathbar id="breath-bar"></pmui-breathbar>-->
      <pmui-healthbar id="health-bar"></pmui-healthbar>
      <pmui-foodbar id="food-bar"></pmui-foodbar>
      <div id="xp-bar-bg">
        <div class="xp-bar"></div>
        <span id="xp-label"></span>
      </div>
      <pmui-hotbar id="hotbar"></pmui-hotbar>
    `
  }
}

window.customElements.define('pmui-hud', Hud)
