const THREE = require('three')

// Day/night cycle, sky colour, fog and stars. prismarine-viewer does not
// implement these, so we drive the three.js scene directly.

const NIGHT = new THREE.Color(0x05070f)
const DAY = new THREE.Color(0x9ed8ff)
const DUSK = new THREE.Color(0xff8a4a)

function clamp01 (value) {
  return Math.max(0, Math.min(1, value))
}

function mix (a, b, t) {
  return a.clone().lerp(b, clamp01(t))
}

class Sky {
  constructor (viewer, renderDistance = 6) {
    this.viewer = viewer
    this.scene = viewer.scene
    this.stars = null
    this.sun = null
    this.moon = null
    this.renderDistance = renderDistance
    this.currentColor = new THREE.Color(0x9ed8ff)

    this.scene.fog = new THREE.Fog(0x9ed8ff, 30, 180)
    this.scene.background = new THREE.Color(0x9ed8ff)

    this.createStars()
    this.createBodies()
    this.update(6000)
  }

  createStars () {
    const count = 700
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 420
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false
    })
    this.stars = new THREE.Points(geometry, material)
    this.stars.frustumCulled = false
    this.scene.add(this.stars)
  }

  createBodies () {
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1a0, fog: false, depthWrite: false })
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false, depthWrite: false })
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 12), sunMaterial)
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 12), moonMaterial)
    this.sun.frustumCulled = false
    this.moon.frustumCulled = false
    this.scene.add(this.sun)
    this.scene.add(this.moon)
  }

  setRenderDistance (chunks) {
    this.renderDistance = chunks
    const far = Math.max(48, chunks * 16 + 24)
    if (this.scene.fog) {
      this.scene.fog.near = Math.max(12, far * 0.35)
      this.scene.fog.far = far
    }
  }

  setTime (timeOfDay) {
    const time = ((timeOfDay % 24000) + 24000) % 24000
    // 0 = sunrise, 6000 = noon, 12000 = sunset, 18000 = midnight
    const angle = ((time - 6000) / 24000) * Math.PI * 2
    const elevation = Math.cos(angle)
    const daylight = clamp01(elevation * 1.35 + 0.32)

    const duskAmount = clamp01(1 - Math.abs(elevation) * 3.2) * (elevation > -0.25 ? 1 : 0)
    let color = mix(NIGHT, DAY, daylight)
    color = mix(color, DUSK, duskAmount * 0.55)

    this.currentColor.copy(color)
    this.scene.background.copy(color)
    if (this.scene.fog) this.scene.fog.color.copy(color)

    const viewer = this.viewer
    if (viewer.ambientLight) viewer.ambientLight.color.copy(color)
    if (viewer.ambientLight) viewer.ambientLight.intensity = 0.28 + daylight * 0.62
    if (viewer.directionalLight) {
      viewer.directionalLight.intensity = 0.05 + daylight * 0.65
      viewer.directionalLight.color.copy(mix(DUSK, new THREE.Color(0xffffff), daylight))
      const direction = new THREE.Vector3(
        Math.cos(angle) * 0.8,
        Math.sin(angle) * 0.9,
        Math.cos(angle * 0.5) * 0.3
      ).normalize()
      viewer.directionalLight.position.copy(direction)
    }

    this.elevation = elevation
    this.daylight = daylight
    if (this.stars) this.stars.material.opacity = clamp01(1 - daylight * 1.5)
    if (this.sun && this.sun.material) this.sun.material.color.setHex(duskAmount > 0.35 ? 0xffb060 : 0xfff1a0)
  }

  frame (camera) {
    if (!camera) return
    const angle = this.angle || 0
    if (this.stars) this.stars.position.copy(camera.position)

    const sunDistance = 300
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.15).normalize()
    const moonDir = sunDir.clone().multiplyScalar(-1)
    if (this.sun) {
      this.sun.position.copy(camera.position).addScaledVector(sunDir, sunDistance)
      this.sun.visible = this.elevation > -0.2
    }
    if (this.moon) {
      this.moon.position.copy(camera.position).addScaledVector(moonDir, sunDistance)
      this.moon.visible = this.elevation < 0.2
    }
  }

  update (timeOfDay) {
    const time = ((timeOfDay % 24000) + 24000) % 24000
    this.angle = ((time - 6000) / 24000) * Math.PI * 2
    this.setTime(time)
  }

  bindBot (bot) {
    this.bot = bot
    const update = () => {
      if (bot.time && typeof bot.time.timeOfDay === 'number') this.update(bot.time.timeOfDay)
    }
    bot.on('time', update)
    bot.on('spawn', update)
    update()
  }
}

module.exports = Sky
