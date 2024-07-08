import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js';
import { randFloat } from 'three/src/math/MathUtils.js';

const stats = new Stats();
stats.showPanel(0)
document.body.appendChild(stats.dom)

let renderer, scene, camera, controls;

const currentPosition = new THREE.Vector3(randFloat(-50, 50), 0, randFloat(-50, 50))
let targetPosition = new THREE.Vector3(currentPosition.x, currentPosition.y, currentPosition.z)

const websocket = new WebSocket("ws://localhost:8001")

const player_id = crypto.randomUUID()

let players = {}

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

const geometry = new THREE.PlaneGeometry(100, 100, 10, 10)
const material = new THREE.MeshBasicMaterial({ wireframe: true, opacity: 0.5, transparent: true})
const grid = new THREE.Mesh(geometry, material)
grid.rotation.order = "YXZ"
grid.rotation.y = - Math.PI / 2
grid.rotation.x = - Math.PI / 2
grid.layers.enable(1)
scene.add(grid)

window.addEventListener('click', (event) => {
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children)

    if (intersects.length > 0) {
        targetPosition = new THREE.Vector3(...intersects[0].point)
    }

})

const geometry2 = new THREE.BoxGeometry(10, 10, 10)
const material2 = new THREE.MeshNormalMaterial()
const mesh = new THREE.Mesh(geometry2, material2)
mesh.position.set(currentPosition.x, currentPosition.y, currentPosition.z)
scene.add(mesh)

websocket.onopen = function (event) {
    websocket.send(JSON.stringify({
        type: "init",
        id: player_id,
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
    }))
}

function syncPosition() {
    websocket.send(JSON.stringify({
        "type": "update",
        "id": player_id,
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
    }))
}

window.setInterval(syncPosition, 1000)

websocket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data)
    switch (event.type) {
        case "init":
            for (const [id, position] of Object.entries(event.players)) {
                var geo = new THREE.BoxGeometry(10, 10, 10)
                var mat = new THREE.MeshNormalMaterial()
                var mesh = new THREE.Mesh(geo, mat)
                mesh.position.setX(position[0])
                mesh.position.setY(position[1])
                mesh.position.setZ(position[2])
                scene.add(mesh)
                players[id] = mesh.uuid
            }
            break;
        case "remove":
            var object = scene.getObjectByProperty('uuid', players[event.id])
            object.geometry.dispose()
            object.material.dispose()
            scene.remove(object)
            delete players[event.id]
            break;
        case "add":
            var geo = new THREE.BoxGeometry(10, 10, 10)
            var mat = new THREE.MeshNormalMaterial()
            var mesh = new THREE.Mesh(geo, mat)
            mesh.position.setX(event.x)
            mesh.position.setY(event.y)
            mesh.position.setZ(event.z)
            scene.add(mesh)
            players[event.id] = mesh.uuid
            break;
        case "update":
            if (event.id in players) {
                var object = scene.getObjectByProperty('uuid', players[event.id])
                object.position.setX(event.x)
                object.position.setY(event.y)
                object.position.setZ(event.z)
            }
            break;
        default:
            throw new Error(`Unsupported event type: ${event.type}`)
    }
})


function animate() {

    controls.update()

    mesh.position.lerp(targetPosition, 0.02)
    renderer.render(scene, camera)


    stats.update()
}

renderer.setAnimationLoop( animate );