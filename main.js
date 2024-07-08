import * as THREE from 'three'
import Stats from 'stats.js'
import { MapControls } from 'three/addons/controls/MapControls.js';
import { randFloat } from 'three/src/math/MathUtils.js';

const stats = new Stats();
stats.showPanel(0)
document.body.appendChild(stats.dom)

let renderer, scene, camera, controls;

const websocket = new WebSocket("ws://localhost:8001")

const player_id = crypto.randomUUID()

let players = {}

init()

function init() {
    // websocket

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

    scene.add(new THREE.AxesHelper(40))

    const geometry = new THREE.PlaneGeometry(100, 100, 10, 10)
    const material = new THREE.MeshBasicMaterial({ wireframe: true, opacity: 0.5, transparent: true})
    const grid = new THREE.Mesh(geometry, material)
    grid.rotation.order = "YXZ"
    grid.rotation.y = - Math.PI / 2
    grid.rotation.x = - Math.PI / 2
    scene.add(grid)

    const geometry2 = new THREE.BoxGeometry(10, 10, 10)
    const material2 = new THREE.MeshNormalMaterial()
    const mesh = new THREE.Mesh(geometry2, material2)
    mesh.position.setX(randFloat(-50, 50))
    mesh.position.setZ(randFloat(-50, 50))
    scene.add(mesh)

    websocket.onopen = function (event) {
        console.log("connection open!")
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
            default:
                throw new Error(`Unsupported event type: ${event.type}`)
        }
    })
    
}

function animate() {
    stats.begin()

    controls.update()
    renderer.render(scene, camera)

    stats.end()
}

renderer.setAnimationLoop( animate );