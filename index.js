import * as THREE from 'three';
import { OrbitControls } from "three/addons";
import GUI from 'lil-gui'; 
import { clamp, remap, mix, smoothstep } from './src/math.js';
import { vertexShader, fragmentShader } from './src/shaders.js';

let camera, scene, renderer;
let geometry, material, mesh, group;
let controls;
let panel;

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
    })

    let flipSpeed = 0.1;
    document.addEventListener('wheel', (e) => {
        progress = clamp(progress + flipSpeed * e.deltaY, 0, 100);
        changeProgress(progress);
    })

    let isPanelOpen = false;
    let matrixConvertSpeed = 0.01;
    let isToScreenSpace = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            isToScreenSpace = !isToScreenSpace;
            let id = setInterval(() => {
                if ((isToScreenSpace && matrixT >= 1) || (!isToScreenSpace && matrixT <= 0)) clearInterval(id);
                matrixT = clamp(matrixT + matrixConvertSpeed * (isToScreenSpace ? 1 : -1), 0, 1);
                group.traverse((child) => {
                    if (child === group) return;
                    child.material.uniforms['matrixT'].value = matrixT;
                })
            }, 0.01);
        } else if (e.key === ' ') {
            isPanelOpen = !isPanelOpen;
            if (isPanelOpen) panel.open();
            else panel.close();
        } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
            // let curPageNumber = Math.floor(progress / 100 * pageCount);
            // console.log(curPageNumber);
            // // solve the equation: -flipPercent + 100 / pageCount * (curPageNumber + 1) = remap( the_number_we_want, 0, 100, -flipPercent, 100 + flipPercent )
            // let leftSide = -flipPercent + 100 / pageCount * clamp((curPageNumber - 1), 0, pageCount - 1);
            // console.log(leftSide);
            // progress = unremap(leftSide, 0, 100, -flipPercent, 100 + flipPercent);
            // console.log(progress);
            // changeProgress(progress);
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
            let curPageNumber = Math.floor(progress / 100 * pageCount);
            console.log(curPageNumber);
            // solve the equation: -flipPercent + 100 / pageCount * (curPageNumber + 1) = remap( the_number_we_want, 0, 100, -flipPercent, 100 + flipPercent )
            let leftSide = -flipPercent + 100 / pageCount * clamp((curPageNumber + 1), 0, pageCount - 1);
            leftSide = -flipPercent + 10 * 4; // todo Steve: we got this fixed number part right. Only bug is in the curPageNumber calculation
            console.log(leftSide);
            // progress = unremap(leftSide, 0, 100, -flipPercent, 100 + flipPercent);
            progress = (leftSide + flipPercent) / (100 * flipPercent * 2) * 100 * 100;
            console.log(progress);
            changeProgress(progress);
        }
    })
}

let pageThickness = 0.01;
let pageCount = 10;

let maxBendAngle = Math.PI / 2;
let angle = 0;
let progress = 0;
let flipPercent = 27; // input to a smoothstep() function that controls in what range a page starts/ends flipping.

let matrixT = 0; // 0 --- world space, normal view; 1 --- screen space, as if the object is right in front of the camera, takes up exactly the entire screen
function createPanel() {
    panel = new GUI( { width: 200 } );
    panel.close();

    const folder1 = panel.addFolder('Page flipping');
    let settings1 = {
        'max bend angle': maxBendAngle,
        'angle': angle,
        'progress': progress,
        'flip percent': flipPercent,
    };

    function animateProgress() {
        let id = setInterval(() => {
            if (progress > 46) clearInterval(id);
            progress += 0.5 * (Math.max((46 - progress) / 46, 0.005));
            changeProgress(progress);
        }, 1/60);
    }
    // changeProgress(settings1.progress);
    animateProgress();

    folder1.add(settings1, 'max bend angle', 0, Math.PI / 2).onChange((value) => {
        maxBendAngle = value;
        group.traverse((child) => {
            if (child === group) return;
            child.material.uniforms['bendAngle'].value = remap(Math.sin(angle), 0, 1, 0, maxBendAngle);
        })
        changeProgress(progress);
    });

    folder1.add(settings1, 'angle', 0, Math.PI).onChange(changeAngle);
    function changeAngle(value) { // just a debug slider value to test out what if all the pages have the same rotate angle looks like, no other use
        angle = value;
        group.traverse((child) => {
            if (child === group) return;
            child.material.uniforms['rotateAngle'].value = angle;
            child.material.uniforms['bendAngle'].value = remap(Math.sin(angle), 0, 1, 0, maxBendAngle); // angle range: (0. -> PI / 2. -> PI); Math.sin(angle) range: (0. -> 1. -> 0.); remap range: (0. -> PI / 2. -> 0.)
        })
    }

    let controller = folder1.add(settings1, 'progress', 0, 100).onChange(changeProgress);
    controller.step(0.01);

    folder1.add(settings1, 'flip percent', 0, 50).onChange((value) => {
        flipPercent = value;
        changeProgress(progress);
    })
    folder1.open();

    const folder2 = panel.addFolder( 'Matrix morphing' );
    let settings2 = {
        'matrix t': matrixT,
    };
    folder2.add(settings2, 'matrix t', 0, 1).onChange(changeMatrixT);
    function changeMatrixT(value) {
        matrixT = value;
        group.traverse((child) => {
            if (child === group) return;
            child.material.uniforms['matrixT'].value = matrixT;
        })
    }
    folder2.open();
}

function changeProgress(value) {
    progress = value;
    for (let i = 0; i < group.children.length; i++) {
        let a = smoothstep(-flipPercent + 100 / pageCount * (i + 1), flipPercent + 100 / pageCount * (i + 1), remap(progress, 0, 100, -flipPercent, 100 + flipPercent)); // here need to remap b/c need to account for the flipPercent values, so that the 1st and last pages are completely closed
        let newAngle = mix(0, Math.PI, a);
        group.children[i].material.uniforms['rotateAngle'].value = newAngle;
        group.children[i].material.uniforms['bendAngle'].value = remap(Math.sin(newAngle), 0, 1, 0, maxBendAngle);
    }
}

let loader = new THREE.TextureLoader();
function loadTexture(idx) {
    return new Promise((resolve, reject) => {
        loader.load(`${import.meta.env.BASE_URL}imgs/${idx}.jpg`, (texture) => {
            resolve(texture);
        });
    });
}

async function init() {
    // renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    let canvas_parent_div = document.querySelector('#canvas-container');
    canvas_parent_div.appendChild(renderer.domElement);

    // scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 1.5, 1.2);

    // lighting
    const light = new THREE.AmbientLight(0x404040, 10);
    scene.add(light);
    const light2 = new THREE.PointLight(0x404040, 100, 100);
    light2.position.set(1, 2.5, 5);
    scene.add(light2);

    // comic texture
    const texture = await loadTexture(1);

    // mesh
    geometry = new THREE.BoxGeometry(1, pageThickness, 1.3, 10, 2, 2);
    geometry.translate(0.5, 0, 0);
    let posAttri = geometry.getAttribute('position');
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < posAttri.count; i++) {
        let tmp = posAttri.getX(i);
        if (tmp < minX) minX = tmp;
        if (tmp > maxX) maxX = tmp;
    }
    material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            'screenRatio': {value: window.innerWidth / window.innerHeight},
            'matrixT': {value: matrixT},
            'division': {value: geometry.parameters.widthSegments},
            'segmentLength': {value: geometry.parameters.width / geometry.parameters.widthSegments}, // segment length
            'bendAngle': {value: angle}, // total page flip/bend angle
            'rotateAngle': {value: angle}, // total whole thing rotate angle
            'maxBendAngle': {value: maxBendAngle},
            'minX': {value: minX},
            'maxX': {value: maxX},
            'yOffset': {value: 0},
            'xOffset': {value: pageThickness * pageCount / 16}, // arbitrary value, adjust as I see fit
            'comicTextureFront': {value: texture},
            'comicTextureBack': {value: texture},
        },
    });
    group = new THREE.Group();

    let idx = 1;
    for (let i = -(pageCount - 1) / 2; i <= (pageCount - 1) / 2; i++) {
        let newGeometry = geometry.clone();
        let newMaterial = material.clone();
        newMaterial.uniforms['yOffset'].value = -i * pageThickness / 8; // arbitrary value, adjust as I see fit
        newMaterial.uniforms['comicTextureFront'].value = await loadTexture(idx++);
        newMaterial.uniforms['comicTextureBack'].value = await loadTexture(idx++);
        let newPage = new THREE.Mesh(newGeometry, newMaterial);
        group.add(newPage);
    }
    // mesh = new THREE.Mesh(geometry, material);

    // group = new THREE.Group();
    // group.add(mesh);
    scene.add(group);

    // orbit control
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    setupEventListeners();
    createPanel();
}

function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}

init();
animate();