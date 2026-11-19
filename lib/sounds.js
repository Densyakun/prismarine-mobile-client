/* global window */

// Small procedural sound engine. Minecraft's audio assets are copyrighted, so
// instead of shipping them we synthesise short effects with the Web Audio API.
// Named server sound effects are mapped onto these procedural effects.

class SoundManager {
  constructor () {
    this.ctx = null
    this.master = null
    this.enabled = true
    this.volume = 0.5
    this.lastPlayed = {}
  }

  ensureContext () {
    if (!this.enabled) return null
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) {
        this.enabled = false
        return null
      }
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  setVolume (volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.master) this.master.gain.value = this.volume
  }

  readVolumeFromOptions () {
    const options = document.getElementById('options-screen')
    if (options && typeof options.sound === 'number') this.setVolume(options.sound / 100)
  }

  tone (freq, duration, { type = 'sine', gain = 0.3, endFreq = null, delay = 0 } = {}) {
    const ctx = this.ensureContext()
    if (!ctx) return
    const now = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration)
    env.gain.setValueAtTime(0.0001, now)
    env.gain.exponentialRampToValueAtTime(gain, now + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(env)
    env.connect(this.master)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  noise (duration, { gain = 0.3, filter = 1200, type = 'lowpass', delay = 0 } = {}) {
    const ctx = this.ensureContext()
    if (!ctx) return
    const now = ctx.currentTime + delay
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const biquad = ctx.createBiquadFilter()
    biquad.type = type
    biquad.frequency.value = filter
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, now)
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(biquad)
    biquad.connect(env)
    env.connect(this.master)
    source.start(now)
    source.stop(now + duration + 0.02)
  }

  play (name) {
    if (!this.enabled) return
    this.readVolumeFromOptions()
    if (this.volume <= 0.01) return
    const now = Date.now()
    const throttles = { dig: 90, place: 70, hit: 90, hurt: 200, chat: 120 }
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < (throttles[name] || 40)) return
    this.lastPlayed[name] = now

    switch (name) {
      case 'click':
        this.tone(760, 0.05, { type: 'square', gain: 0.08 })
        break
      case 'dig':
        this.noise(0.12, { gain: 0.22, filter: 700 })
        this.tone(150, 0.09, { type: 'triangle', gain: 0.12, endFreq: 110 })
        break
      case 'place':
        this.noise(0.07, { gain: 0.18, filter: 1600 })
        this.tone(240, 0.1, { type: 'triangle', gain: 0.16, endFreq: 150 })
        break
      case 'hit':
        this.noise(0.06, { gain: 0.2, filter: 2400, type: 'highpass' })
        this.tone(320, 0.06, { type: 'square', gain: 0.08, endFreq: 180 })
        break
      case 'hurt':
        this.tone(330, 0.22, { type: 'sawtooth', gain: 0.16, endFreq: 120 })
        this.noise(0.1, { gain: 0.1, filter: 800 })
        break
      case 'levelup':
        this.tone(523, 0.14, { type: 'triangle', gain: 0.16 })
        this.tone(659, 0.14, { type: 'triangle', gain: 0.16, delay: 0.1 })
        this.tone(784, 0.14, { type: 'triangle', gain: 0.16, delay: 0.2 })
        this.tone(1046, 0.24, { type: 'triangle', gain: 0.16, delay: 0.3 })
        break
      case 'open':
        this.tone(420, 0.08, { type: 'square', gain: 0.07 })
        this.tone(620, 0.1, { type: 'square', gain: 0.07, delay: 0.06 })
        break
      case 'close':
        this.tone(620, 0.08, { type: 'square', gain: 0.07 })
        this.tone(420, 0.1, { type: 'square', gain: 0.07, delay: 0.06 })
        break
      case 'chat':
        this.tone(880, 0.06, { type: 'sine', gain: 0.08 })
        this.tone(1180, 0.08, { type: 'sine', gain: 0.07, delay: 0.05 })
        break
      case 'explode':
        this.noise(0.5, { gain: 0.35, filter: 300 })
        this.tone(90, 0.4, { type: 'sawtooth', gain: 0.18, endFreq: 35 })
        break
      case 'splash':
        this.noise(0.35, { gain: 0.18, filter: 1800, type: 'bandpass' })
        break
      default:
        this.tone(480, 0.05, { type: 'sine', gain: 0.05 })
    }
  }

  mapServerSound (name) {
    const n = String(name || '').toLowerCase()
    if (!n) return null
    if (n.includes('explode')) return 'explode'
    if (n.includes('splash') || n.includes('swim')) return 'splash'
    if (n.includes('hurt') || n.includes('death')) return 'hurt'
    if (n.includes('levelup') || n.includes('orb')) return 'levelup'
    if (n.includes('break') || n.includes('dig')) return 'dig'
    if (n.includes('place') || n.includes('step') || n.includes('land')) return 'place'
    if (n.includes('attack') || n.includes('hit') || n.includes('swing')) return 'hit'
    if (n.includes('click') || n.includes('button')) return 'click'
    if (n.includes('chest') || n.includes('open') || n.includes('door')) return 'open'
    if (n.includes('close')) return 'close'
    return null
  }

  bindBot (bot) {
    this.bot = bot

    bot.on('soundEffectHeard', (name, position, volume) => {
      if (volume !== undefined && volume < 0.05) return
      const mapped = this.mapServerSound(name)
      if (mapped) this.play(mapped)
    })

    bot.on('hardcodedSoundEffectHeard', (id, category, position, volume) => {
      if (volume !== undefined && volume < 0.05) return
      // Hardcoded ids are version specific; only use them for broad categories.
      if (category === 0) this.play('dig')
      else if (category === 2) this.play('hit')
    })

    let lastLevel = null
    bot.on('experience', () => {
      const level = bot.experience?.level
      if (lastLevel !== null && level > lastLevel) this.play('levelup')
      lastLevel = level
    })

    bot.on('chat', (username, message) => {
      if (username === bot.username) return
      if (message.includes(bot.username)) this.play('chat')
    })

    bot.on('death', () => this.play('hurt'))
  }
}

module.exports = SoundManager
