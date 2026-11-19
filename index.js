/* global THREE */

// `/?singleplayer=1` (or /singleplayer) runs the singleplayer world inside the
// browser instead of requiring a self-hosted Node.js server. This must be set
// before the menu custom elements are defined below.
const startupParams = new URLSearchParams(window.location.search)
if (startupParams.has('singleplayer') || /\/singleplayer\/?$/.test(window.location.pathname)) {
  window.__PMUI_EMBEDDED_SINGLEPLAYER__ = true
}

require('./lib/chat')

require('./lib/menus/components/button')
require('./lib/menus/components/edit_box')
require('./lib/menus/components/slider')
require('./lib/menus/components/hotbar')
require('./lib/menus/components/health_bar')
require('./lib/menus/components/food_bar')
require('./lib/menus/components/breath_bar')
require('./lib/menus/components/debug_overlay')
require('./lib/menus/components/playerlist_overlay')
require('./lib/menus/components/bossbars_overlay')
require('./lib/menus/hud')
require('./lib/menus/play_screen')
require('./lib/menus/singleplayer_screen')
require('./lib/menus/pause_screen')
require('./lib/menus/loading_screen')
require('./lib/menus/keybinds_screen')
require('./lib/menus/options_screen')
require('./lib/menus/title_screen')
require('./lib/menus/auth_screen')
require('./lib/menus/inventory_screen')

const net = require('net')
global.THREE = require('three')
const Cursor = require('./lib/cursor')
const Sky = require('./lib/sky')
const SoundManager = require('./lib/sounds')
const { getMobileControls } = require('./lib/mobile_controls')

// Workaround for process.versions.node not existing in the browser
process.versions.node = '14.0.0'

const mineflayer = require('mineflayer')
const { WorldView, Viewer } = require('prismarine-viewer/viewer')
const pathfinder = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')
const { initVR } = require('./lib/vr')

// Older versions registered a Workbox service worker that cached index.html.
// That left some clients with an HTML document from a previous deployment and
// a mismatched script, which produced null-element crashes. Unregister any old
// worker and clear its caches once, then reload to pick up the current HTML.
async function cleanupOldServiceWorker () {
  if (!('serviceWorker' in navigator) && !window.caches) return
  let changed = false
  try {
    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length) {
        await Promise.all(registrations.map((registration) => registration.unregister()))
        changed = true
      }
    }
  } catch (e) {}

  try {
    if (window.caches) {
      const keys = await window.caches.keys()
      if (keys.length) {
        await Promise.all(keys.map((key) => window.caches.delete(key)))
        changed = true
      }
    }
  } catch (e) {}

  if (changed) {
    try {
      if (!window.sessionStorage.getItem('pmui.cache.cleared')) {
        window.sessionStorage.setItem('pmui.cache.cleared', '1')
        window.location.reload()
      }
    } catch (e) {}
  }
}
cleanupOldServiceWorker()

const maxPitch = 0.5 * Math.PI
const minPitch = -0.5 * Math.PI

function viewportSize () {
  const viewport = window.visualViewport
  return {
    width: Math.max(1, Math.round(viewport ? viewport.width : window.innerWidth)),
    height: Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight))
  }
}

// Create three.js context, add to page
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
const initialSize = viewportSize()
renderer.setSize(initialSize.width, initialSize.height)
document.body.appendChild(renderer.domElement)

// Create viewer
const viewer = new Viewer(renderer)

const soundManager = new SoundManager()

let cursor = null
let sky = null
let currentBot = null
let inGame = false

// Menu panorama background
function addPanoramaCubeMap () {
  let time = 0
  const size = viewportSize()
  viewer.camera = new THREE.PerspectiveCamera(85, size.width / size.height, 0.05, 1000)
  viewer.camera.updateProjectionMatrix()
  viewer.camera.position.set(0, 0, 0)
  viewer.camera.rotation.set(0, 0, 0)
  const panorGeo = new THREE.BoxGeometry(1000, 1000, 1000)

  const loader = new THREE.TextureLoader()
  const panorMaterials = [
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_1.png'), transparent: true, side: THREE.DoubleSide }), // WS
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_3.png'), transparent: true, side: THREE.DoubleSide }), // ES
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_4.png'), transparent: true, side: THREE.DoubleSide }), // Up
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_5.png'), transparent: true, side: THREE.DoubleSide }), // Down
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_0.png'), transparent: true, side: THREE.DoubleSide }), // NS
    new THREE.MeshBasicMaterial({ map: loader.load('extra-textures/background/panorama_2.png'), transparent: true, side: THREE.DoubleSide }) // SS
  ]

  const panoramaBox = new THREE.Mesh(panorGeo, panorMaterials)

  panoramaBox.onBeforeRender = () => {
    time += 0.01
    panoramaBox.rotation.y = Math.PI + time * 0.01
    panoramaBox.rotation.z = Math.sin(-time * 0.001) * 0.001
  }

  const group = new THREE.Object3D()
  group.add(panoramaBox)

  const Entity = require('prismarine-viewer/viewer/lib/entity/Entity')
  for (let i = 0; i < 42; i++) {
    const m = new Entity('1.16.4', 'squid').mesh
    m.position.set(Math.random() * 30 - 15, Math.random() * 20 - 10, Math.random() * 10 - 17)
    m.rotation.set(0, Math.PI + Math.random(), -Math.PI / 4, 'ZYX')
    const v = Math.random() * 0.01
    m.children[0].onBeforeRender = () => {
      m.rotation.y += v
      m.rotation.z = Math.cos(panoramaBox.rotation.y * 3) * Math.PI / 4 - Math.PI / 2
    }
    group.add(m)
  }

  viewer.scene.add(group)
  return group
}

const panoramaCubeMap = addPanoramaCubeMap()

function removePanorama () {
  const size = viewportSize()
  viewer.camera = new THREE.PerspectiveCamera(document.getElementById('options-screen').fov, size.width / size.height, 0.1, 1000)
  viewer.camera.updateProjectionMatrix()
  viewer.scene.remove(panoramaCubeMap)
}

let animate = () => {
  window.requestAnimationFrame(animate)
  viewer.update()
  if (sky) sky.frame(viewer.camera)
  renderer.render(viewer.scene, viewer.camera)
}
animate()

function onResize () {
  const size = viewportSize()
  viewer.camera.aspect = size.width / size.height
  viewer.camera.updateProjectionMatrix()
  renderer.setSize(size.width, size.height)
}
window.addEventListener('resize', onResize)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onResize)
  window.visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0))
}

const showEl = (str) => {
  const element = document.getElementById(str)
  if (element) element.style = 'display:block'
}
async function main () {
  for (const id of ['play-screen', 'singleplayer-screen']) {
    const menu = document.getElementById(id)
    if (!menu) continue

    menu.addEventListener('connect', e => {
      const options = e.detail
      menu.style = 'display: none;'
      const title = document.getElementById('title-screen')
      if (title) title.style.display = 'none'
      showEl('loading-screen')
      removePanorama()
      connect(options)
    })
  }
}

function createMicrosoftAuth (session) {
  return (client, options) => {
    const profile = { id: session.profile.id, name: session.profile.name }
    client.session = {
      accessToken: session.accessToken,
      selectedProfile: profile,
      availableProfile: [profile]
    }
    client.username = profile.name
    client.uuid = profile.id
    options.accessToken = session.accessToken
    options.username = profile.name
    options.haveCredentials = true
    options.sessionServer = `${window.location.origin}/api/sessionserver`
    client.emit('session', client.session)
    options.connect(client)
  }
}

async function connect (options) {
  const loadingScreen = document.getElementById('loading-screen')

  const hud = document.getElementById('hud')
  const chat = hud.shadowRoot.querySelector('#chat')
  const debugMenu = hud.shadowRoot.querySelector('#debug-overlay')
  const optionsScrn = document.getElementById('options-screen')
  const keyBindScrn = document.getElementById('keybinds-screen')
  const gameMenu = document.getElementById('pause-screen')
  const inventoryScreen = document.getElementById('inventory-screen')

  const viewDistance = optionsScrn.renderDistance
  const hostprompt = options.server
  const proxyprompt = options.proxy
  const username = options.username

  let host, port, proxy, proxyport
  if (!hostprompt.includes(':')) {
    host = hostprompt
    port = 25565
  } else {
    [host, port] = hostprompt.split(':')
    port = parseInt(port, 10)
  }

  if (!proxyprompt.includes(':')) {
    proxy = proxyprompt
    proxyport = undefined
  } else {
    [proxy, proxyport] = proxyprompt.split(':')
    proxyport = parseInt(proxyport, 10)
  }
  console.log(`connecting to ${host} ${port} with ${username}`)

  if (proxy) {
    console.log(`using proxy ${proxy} ${proxyport}`)
    net.setProxy({ hostname: proxy, port: proxyport })
  } else {
    // Self-hosted proxy on the same origin (server.js / proxy-server.js).
    net.setProxy({})
  }

  loadingScreen.status = 'Logging in'

  const botOptions = {
    host,
    port,
    version: options.botVersion === '' ? false : options.botVersion,
    username,
    viewDistance: 'tiny',
    checkTimeoutInterval: 240 * 1000,
    noPongTimeout: 240 * 1000,
    closeTimeout: 240 * 1000
  }

  if (options.auth === 'microsoft' && options.session) {
    botOptions.auth = createMicrosoftAuth(options.session)
    botOptions.haveCredentials = true
    botOptions.accessToken = options.session.accessToken
    botOptions.sessionServer = `${window.location.origin}/api/sessionserver`
  } else {
    botOptions.auth = 'offline'
    botOptions.password = ''
  }

  const errorAbortController = new AbortController()
  const handleError = (err) => {
    if (errorAbortController.signal.aborted) return
    console.log('Encountered error!', err)
    const message = err && err.message ? err.message : err
    loadingScreen.status = `Error encountered. Error message: ${message}. Please reload the page`
    loadingScreen.style = 'display: block;'
    loadingScreen.hasError = true
  }
  window.addEventListener('unhandledrejection', (e) => {
    handleError(e.reason)
  })
  window.addEventListener('error', (e) => {
    handleError(e.message)
  })

  const bot = mineflayer.createBot(botOptions)
  currentBot = bot
  hud.preload(bot)

  bot.on('error', handleError)

  bot.on('kicked', (kickReason) => {
    console.log('User was kicked!', kickReason)
    loadingScreen.status = `The Minecraft server kicked you. Kick reason: ${kickReason}. Please reload the page to rejoin`
    loadingScreen.style = 'display: block;'
    loadingScreen.hasError = true
  })

  bot.on('end', (endReason) => {
    console.log('disconnected for', endReason)
    if (endReason === 'disconnect.quitting') return
    loadingScreen.status = `You have been disconnected from the server. End reason: ${endReason}. Please reload the page to rejoin`
    loadingScreen.style = 'display: block;'
    loadingScreen.hasError = true
  })

  soundManager.bindBot(bot)

  bot.once('login', () => {
    loadingScreen.status = 'Loading world'
  })

  bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)

    loadingScreen.status = 'Placing blocks (starting viewer)'

    console.log('bot spawned - starting viewer')

    const version = bot.version
    const center = bot.entity.position
    const worldView = new WorldView(bot.world, viewDistance, center)

    gameMenu.init(renderer)
    optionsScrn.isInsideWorld = true
    optionsScrn.addEventListener('fov_changed', (e) => {
      viewer.camera.fov = e.detail.fov
      viewer.camera.updateProjectionMatrix()
    })

    viewer.setVersion(version)
    sky = new Sky(viewer, viewDistance)
    sky.bindBot(bot)
    sky.setRenderDistance(viewDistance)

    window.worldView = worldView
    window.bot = bot
    window.mcData = mcData
    window.viewer = viewer
    window.Vec3 = Vec3
    window.pathfinder = pathfinder
    window.debugMenu = debugMenu
    window.settings = optionsScrn
    window.renderer = renderer

    initVR(bot, renderer, viewer)

    const localCursor = new Cursor(viewer, renderer, bot)
    cursor = localCursor
    window.cursor = cursor

    animate = () => {
      window.requestAnimationFrame(animate)
      viewer.update()
      localCursor.update(bot)
      if (sky) sky.frame(viewer.camera)
      debugMenu.cursorBlock = localCursor.cursorBlock
      renderer.render(viewer.scene, viewer.camera)
    }

    // Link WorldView and Viewer
    viewer.listen(worldView)
    worldView.listenToBot(bot)
    worldView.init(bot.entity.position)

    // Bot position callback
    function botPosition () {
      viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
      worldView.updatePosition(bot.entity.position)
    }
    bot.on('move', botPosition)
    botPosition()

    loadingScreen.status = 'Setting callbacks'

    function moveCallback (e) {
      bot.entity.pitch -= e.movementY * optionsScrn.mouseSensitivityY * 0.0001
      bot.entity.pitch = Math.max(minPitch, Math.min(maxPitch, bot.entity.pitch))
      bot.entity.yaw -= e.movementX * optionsScrn.mouseSensitivityX * 0.0001

      viewer.setFirstPersonCamera(null, bot.entity.yaw, bot.entity.pitch)
    }

    function changeCallback () {
      if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', moveCallback, false)
      } else {
        document.removeEventListener('mousemove', moveCallback, false)
      }
    }

    document.addEventListener('pointerlockchange', changeCallback, false)
    document.addEventListener('mozpointerlockchange', changeCallback, false)
    document.addEventListener('webkitpointerlockchange', changeCallback, false)

    // Touch look controls -------------------------------------------------
    let lookPointer = null
    let lookLastX = 0
    let lookLastY = 0
    let lookStartTime = 0
    let lookDistance = 0
    const canvas = renderer.domElement

    const isOverlayOpen = () => chat.inChat || gameMenu.inMenu || inventoryScreen.style.display === 'block'

    const lookFromPointer = (e) => {
      const dx = e.clientX - lookLastX
      const dy = e.clientY - lookLastY
      lookLastX = e.clientX
      lookLastY = e.clientY
      lookDistance += Math.abs(dx) + Math.abs(dy)

      bot.entity.pitch -= dy * optionsScrn.mouseSensitivityY * 0.0001
      bot.entity.pitch = Math.max(minPitch, Math.min(maxPitch, bot.entity.pitch))
      bot.entity.yaw -= dx * optionsScrn.mouseSensitivityX * 0.0001
      viewer.setFirstPersonCamera(null, bot.entity.yaw, bot.entity.pitch)
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return
      if (isOverlayOpen()) return
      if (lookPointer !== null) return
      lookPointer = e.pointerId
      lookLastX = e.clientX
      lookLastY = e.clientY
      lookStartTime = performance.now()
      lookDistance = 0
      try { canvas.setPointerCapture(e.pointerId) } catch (err) {}
      e.preventDefault()
    }, { passive: false })

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookPointer) return
      e.preventDefault()
      lookFromPointer(e)
    }, { passive: false })

    const endLook = (e) => {
      if (e.pointerId !== lookPointer) return
      const duration = performance.now() - lookStartTime
      lookPointer = null
      e.preventDefault()
      if (duration < 280 && lookDistance < 14) {
        // A tap interacts with whatever is under the crosshair.
        if (cursor.findEntity()) {
          cursor.attack()
        } else {
          cursor.use()
        }
      }
    }
    canvas.addEventListener('pointerup', endLook, { passive: false })
    canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId === lookPointer) lookPointer = null
    })

    renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock ||
      renderer.domElement.mozRequestPointerLock ||
      renderer.domElement.webkitRequestPointerLock
    document.addEventListener('mousedown', (e) => {
      if (!chat.inChat && !gameMenu.inMenu && !isMobileLike()) {
        renderer.domElement.requestPointerLock()
      }
    })

    document.addEventListener('contextmenu', (e) => e.preventDefault(), false)

    window.addEventListener('blur', (e) => {
      bot.clearControlStates()
    }, false)

    document.addEventListener('keydown', (e) => {
      if (chat.inChat) return
      if (gameMenu.inMenu) return

      if (e.code === 'KeyE') {
        openInventory()
        return
      }

      keyBindScrn.keymaps.forEach(km => {
        if (e.code === km.key) {
          switch (km.defaultKey) {
            case 'KeyQ':
              if (bot.heldItem) bot.tossStack(bot.heldItem)
              break
            case 'ControlLeft':
              bot.setControlState('sprint', true)
              break
            case 'ShiftLeft':
              bot.setControlState('sneak', true)
              break
            case 'Space':
              bot.setControlState('jump', true)
              break
            case 'KeyD':
              bot.setControlState('left', true)
              break
            case 'KeyA':
              bot.setControlState('right', true)
              break
            case 'KeyS':
              bot.setControlState('back', true)
              break
            case 'KeyW':
              bot.setControlState('forward', true)
              break
          }
        }
      })
    }, false)

    document.addEventListener('keyup', (e) => {
      keyBindScrn.keymaps.forEach(km => {
        if (e.code === km.key) {
          switch (km.defaultKey) {
            case 'ControlLeft':
              bot.setControlState('sprint', false)
              break
            case 'ShiftLeft':
              bot.setControlState('sneak', false)
              break
            case 'Space':
              bot.setControlState('jump', false)
              break
            case 'KeyD':
              bot.setControlState('left', false)
              break
            case 'KeyA':
              bot.setControlState('right', false)
              break
            case 'KeyS':
              bot.setControlState('back', false)
              break
            case 'KeyW':
              bot.setControlState('forward', false)
              break
          }
        }
      })
    }, false)

    loadingScreen.status = 'Done!'
    console.log(loadingScreen.status)

    hud.init(renderer, bot, host)
    hud.style.display = 'block'

    // Inventory / container UI
    inventoryScreen.setBot(bot)
    bot.on('windowOpen', (window) => {
      inventoryScreen.open(window)
      updateMobileOverlay()
      soundManager.play('open')
    })
    bot.on('windowClose', (window) => {
      if (inventoryScreen.activeWindow === window) {
        inventoryScreen.activeWindow = null
        inventoryScreen.style.display = 'none'
      }
      updateMobileOverlay()
      soundManager.play('close')
    })
    bot.on('death', () => {
      inventoryScreen.style.display = 'none'
      updateMobileOverlay()
    })

    // Mobile controls
    inGame = true
    mobileControls.attachBot(bot)
    mobileControls.setVisible(document.getElementById('options-screen').forceMobileControls)
    updateMobileOverlay()

    setTimeout(function () {
      // game in playable state show errors in console instead
      errorAbortController.abort()
      if (loadingScreen.hasError) return
      // remove loading screen, wait a second to make sure a frame has properly rendered
      loadingScreen.style = 'display: none;'
    }, 2500)
  })
}

function isMobileLike () {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

function updateMobileOverlay () {
  const chatEl = document.getElementById('hud')?.shadowRoot?.querySelector('#chat')
  const menu = document.getElementById('pause-screen')
  const inventory = document.getElementById('inventory-screen')
  const open = !!(chatEl?.inChat || menu?.inMenu || inventory?.style.display === 'block')
  mobileControls.setOverlayOpen(open)
}

function openInventory () {
  if (!currentBot) return
  const screen = document.getElementById('inventory-screen')
  screen.setBot(currentBot)
  screen.open(null)
  updateMobileOverlay()
  soundManager.play('open')
}

function handleMobileAction (action) {
  if (action === 'chat') {
    const chatEl = document.getElementById('hud').shadowRoot.querySelector('#chat')
    chatEl.enableChat(false)
    updateMobileOverlay()
    soundManager.play('click')
  } else if (action === 'inventory') {
    openInventory()
  } else if (action === 'menu') {
    document.getElementById('pause-screen').enableGameMenu()
    updateMobileOverlay()
    soundManager.play('click')
  }
}

function handleMobilePress (action) {
  if (!cursor) return
  if (action === 'attack') {
    cursor.attack()
    soundManager.play('hit')
  } else if (action === 'use') {
    cursor.use()
    soundManager.play('place')
  }
}

const mobileControls = getMobileControls({
  action: handleMobileAction,
  press: handleMobilePress,
  mine: (on) => {
    if (!cursor) return
    cursor.setDigging(on)
    if (on) soundManager.play('dig')
  }
})

window.addEventListener('pmui-mobile-toggle', (e) => {
  mobileControls.setVisible(!!e.detail && inGame)
})

window.addEventListener('pmui-chat-open', updateMobileOverlay)
window.addEventListener('pmui-chat-close', updateMobileOverlay)
window.addEventListener('pmui-menu-open', updateMobileOverlay)
window.addEventListener('pmui-menu-close', updateMobileOverlay)
window.addEventListener('pmui-inventory-closed', updateMobileOverlay)

/**
 * @param {URLSearchParams} params
 * @param {string} address
 */
async function fromTheOutside (params, address) {
  const opts = {}
  const dfltConfig = await (await window.fetch('config.json')).json()

  let server, port, proxy, proxyPort

  if (address.includes(':')) {
    const s = address.split(':')
    server = s[0]
    port = Number(s[1]) || 25565
  } else {
    server = address
    port = Number(params.get('port')) || 25565
  }

  const proxyAddr = params.get('proxy')
  if (proxyAddr) {
    const s = proxyAddr.split(':')
    proxy = s[0]
    proxyPort = Number(s[1] ?? 'NaN') || 22
  } else {
    proxy = dfltConfig.defaultProxy
    proxyPort = !dfltConfig.defaultProxy && !dfltConfig.defaultProxyPort ? '' : dfltConfig.defaultProxyPort ?? 443
  }

  opts.server = `${server}:${port}`
  opts.proxy = `${proxy}${proxy ? `:${proxyPort}` : ''}`
  opts.username = params.get('username') ?? `pviewer${Math.floor(Math.random() * 1000)}`
  opts.password = params.get('password') ?? ''
  opts.botVersion = params.get('version') ?? false

  console.log(opts)

  showEl('loading-screen')
  removePanorama()
  connect(opts)
}

const params = new URLSearchParams(window.location.search)
let address
if ((address = params.get('address'))) {
  fromTheOutside(params, address)
} else {
  showEl('title-screen')
  main()
}
