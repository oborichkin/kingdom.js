import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js';
import { randFloat } from 'three/src/math/MathUtils.js';

const stats = new Stats();
stats.showPanel(0)
document.body.appendChild(stats.dom)

let renderer, scene, camera, controls;

const websocket = new WebSocket("ws://localhost:8001")

let player_map = {}
let player_targets = {}

const player_id = crypto.randomUUID()
const currentPosition = new THREE.Vector3(randFloat(-50, 50), 0, randFloat(-50, 50))
player_targets[player_id] = currentPosition

const TERRAIN_LAYER = 1

// renderer
renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// scene
scene = new THREE.Scene()

// camera
// source: https://stackoverflow.com/questions/23450588/isometric-camera-with-three-js
const aspect = window.innerWidth / window.innerHeight
const d = 60
camera = new THREE.OrthographicCamera(-d*aspect, d*aspect, d, -d, -100, 1000)

camera.position.set(20, 20, 20)
camera.lookAt(scene.position)

// controls
controls = new MapControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2

// ambient
scene.add(new THREE.AmbientLight(0x444444))

// light
const light = new THREE.PointLight(0xffffff, 0.8)
light.position.set(0, 50, 50)
scene.add(light)

// raycaster
const raycaster = new THREE.Raycaster()
raycaster.layers.set(1)
const pointer = new THREE.Vector2()

window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1
})

scene.add(new THREE.AxesHelper(40))

// grid
const geometry = new THREE.PlaneGeometry(100, 100, 10, 10)
const material = new THREE.MeshBasicMaterial({ wireframe: true, opacity: 0.5, transparent: true})
const grid = new THREE.Mesh(geometry, material)
grid.rotation.order = "YXZ"
grid.rotation.y = - Math.PI / 2
grid.rotation.x = - Math.PI / 2
grid.layers.enable(1)
scene.add(grid)

const geometry2 = new THREE.BoxGeometry(10, 10, 10)
const material2 = new THREE.MeshNormalMaterial()
const mesh = new THREE.Mesh(geometry2, material2)
mesh.position.set(currentPosition.x, currentPosition.y, currentPosition.z)
scene.add(mesh)
player_map[player_id] = mesh


window.addEventListener('click', (event) => {
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children)

    if (intersects.length > 0) {
        player_targets[player_id] = new THREE.Vector3(...intersects[0].point)
        websocket.send(JSON.stringify({type: "update", id: player_id, target: {...intersects[0].point}}))
    }

})

websocket.onopen = function (event) {
    websocket.send(JSON.stringify({
        type: "init",
        id: player_id,
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
    }))
}

websocket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data)
    switch (event.type) {
        case "init":
            for (const [id, remote_data] of Object.entries(event.players)) {
                var geo = new THREE.BoxGeometry(10, 10, 10)
                var mat = new THREE.MeshNormalMaterial()
                var mesh = new THREE.Mesh(geo, mat)
                mesh.position.setX(remote_data.position.x)
                mesh.position.setY(remote_data.position.y)
                mesh.position.setZ(remote_data.position.z)
                scene.add(mesh)
                player_map[id] = mesh
                player_targets[id] = new THREE.Vector3(remote_data.target.x, remote_data.target.y, remote_data.target.z)
            }
            break;
        case "remove":
            player_map[event.id].geometry.dispose()
            player_map[event.id].material.dispose()
            scene.remove(player_map[event.id])
            delete player_map[event.id]
            delete player_targets[event.id]
            break;
        case "add":
            var geo = new THREE.BoxGeometry(10, 10, 10)
            var mat = new THREE.MeshNormalMaterial()
            var mesh = new THREE.Mesh(geo, mat)
            mesh.position.setX(event.x)
            mesh.position.setY(event.y)
            mesh.position.setZ(event.z)
            scene.add(mesh)
            player_map[event.id] = mesh
            player_targets[event.id] = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z)
            break;
        case "update":
            if (event.id != player_id && event.id in player_map) {
                player_targets[event.id] = new THREE.Vector3(event.target.x, event.target.y, event.target.z)
            }
            break;
        default:
            throw new Error(`Unsupported event type: ${event.type}`)
    }
})


function animate() {

    controls.update()

    for (const [id, target] of Object.entries(player_targets)) {
        player_map[id].position.lerp(target, 0.02)
    }

    renderer.render(scene, camera)

    stats.update()
}

renderer.setAnimationLoop( animate );