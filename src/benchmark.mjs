import ecs from "./ecs.mjs";
import * as THREE from "https://unpkg.com/three@0.127.0/build/three.module.js";

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#canvas"),
});

const fov = 75;
const aspect = 2;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 30;

const scene = new THREE.Scene();

const color = 0xffffff;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = (canvas.clientWidth * pixelRatio) | 0;
  const height = (canvas.clientHeight * pixelRatio) | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render() {
  renderer.render(scene, camera);

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

/**
 * Run ecs with "entityCount" entities, give all of them random position and velocity components, move them on each iteration according to moveSystem.
 * Also give them age, kill them when age runs out and on each update spawn entities until there are "entityCount" entities;
 */
const entityCount = 3_000;
const entityMaxAge = 10 * 1000;
const components = ["mesh", "velocity", "age"];
const moveSystem = {
  name: "moveSystem",
  execute: (world, deltaTime, time) => {
    const moveEntity = (eid) => {
      const velocity = world.components.velocity.get(eid);
      const mesh = world.components.mesh.get(eid);
      mesh.position.x += velocity.x * deltaTime;
      mesh.position.y += velocity.y * deltaTime;
      mesh.position.z += velocity.z * deltaTime;

      mesh.rotation.x = time * velocity.x;
      mesh.rotation.y = time * velocity.y;
      // TODO maybe move to its own system?
      // add age for entities too far away
      if (
        (Math.abs(mesh.position.x) > 5 ||
          Math.abs(mesh.position.y) > 5 ||
          Math.abs(mesh.position.z) > 5) &&
        !world.components.age.has(eid)
      ) {
        ecs.addComponents(world, eid, {
          age: { value: Math.random() * entityMaxAge },
        });
      }
      // remove velocity if even farther
      if (
        (Math.abs(mesh.position.x) > 12 ||
          Math.abs(mesh.position.y) > 12 ||
          Math.abs(mesh.position.z) > 12) &&
        world.components.velocity.has(eid)
      ) {
        ecs.removeComponents(world, eid, ["velocity"]);
      }
    };
    ecs.innerJoin(moveEntity, world.components.mesh, world.components.velocity);
  },
};
const agingSystem = {
  name: "agingSystem",
  execute: (world, deltaTime) => {
    for (const eid of world.components.age.keys()) {
      const currentAge = (world.components.age.get(eid).value -= deltaTime);
      if (currentAge < 0) {
        world.resources.scene.remove(world.components.mesh.get(eid));
        ecs.removeEntity(world, eid);
      }
    }
  },
};
const spawningSystem = {
  name: "spawningSystem",
  execute: (world) => {
    const currentEntityCount = world.entities.count;
    if (currentEntityCount < entityCount) {
      const delta = entityCount - currentEntityCount;
      for (let i = 0; i < delta; i++) {
        world.resources.createEntity(
          world,
          world.resources.createRandomEntityComponents(world)
        );
      }
    }
  },
};

let updateCounter = 0;
let frameTime1 = performance.now();

const debugSystem = {
  name: "debugSystem",
  execute: () => {
    updateCounter++;
    if (updateCounter === 60) {
      const frameTime2 = performance.now();
      const frameDelta = frameTime2 - frameTime1;
      frameTime1 = frameTime2;
      const fps = 60 / (frameDelta * 0.001);
      console.log("fps", Math.round(fps));
      updateCounter = 0;
    }
  },
};

const systems = [moveSystem, agingSystem, spawningSystem, debugSystem];

console.time("init");
const world = ecs.createWorld();

const boxWidth = 1;
const boxHeight = 1;
const boxDepth = 1;
const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });

world.resources.scene = scene;
world.resources.materials = {};
world.resources.materials.cube = material;
world.resources.geometries = {};
world.resources.geometries.cube = geometry;
world.resources.camera = camera;

components.forEach((component) => {
  ecs.registerComponent(world, component);
});

const createEntity = ecs.initializeCreateEntity();

world.resources.createEntity = createEntity;

const createRandomEntityComponents = (world) => {
  const mesh = new THREE.Mesh(
    world.resources.geometries.cube,
    world.resources.materials.cube
  );
  mesh.position.x = (Math.random() - 0.5 + Number.EPSILON) * 10;
  mesh.position.y = (Math.random() - 0.5 + Number.EPSILON) * 10;
  mesh.position.z = (Math.random() - 0.5 + Number.EPSILON) * 10;
  world.resources.scene.add(mesh);
  return {
    mesh,
    velocity: {
      x: (Math.random() - 0.5) * 0.001 + Number.EPSILON,
      y: (Math.random() - 0.5) * 0.001 + Number.EPSILON,
      z: (Math.random() - 0.5) * 0.001 + Number.EPSILON,
    },
  };
};

world.resources.createRandomEntityComponents = createRandomEntityComponents;

for (let i = 0; i < entityCount; i++) {
  createEntity(world, createRandomEntityComponents(world));
}

ecs.registerSystem(world, moveSystem);

systems.forEach((system) => {
  ecs.registerSystem(world, system);
});

console.timeEnd("init");
console.log({ entityCount });

ecs.run(world, performance.now());
