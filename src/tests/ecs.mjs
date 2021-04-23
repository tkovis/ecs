import Tester from "../utils/Tester.mjs";
import ecs from "../ecs.mjs";

/**
 * Test and demonstrate some of ecs api. Create pretty snapshots of results so you can browse results without running anything.
 */

const tester = new Tester("ecs");

const world = ecs.createWorld();

tester.snapshot("World should exist but be empty", world);

ecs.registerComponent(world, "position");

tester.snapshot("World should have a position component", world);

const createEntity = ecs.initializeCreateEntity();
createEntity(world, { position: { x: 1.0, y: 2.0 } });

tester.snapshot("World should have an entity with position component", world);

createEntity(world, { position: { x: 2.0, y: 1.0 } });

tester.snapshot(
  "World should have another entity with a different position component",
  world
);

ecs.registerComponent(world, "velocity");

tester.snapshot("World should have a velocity component", world);

ecs.addComponents(world, 1, { velocity: { x: 1 / 1000, y: 0.0 } });

tester.snapshot(
  "The first entity should have a velocity component added",
  world
);

const moveSystem = {
  name: "moveSystem",
  execute: (world, deltaTime, time) => {
    const moveEntities = (eid) => {
      const velocity = world.components.velocity.get(eid);
      world.components.position.get(eid).x += velocity.x * deltaTime;
      world.components.position.get(eid).y += velocity.y * deltaTime;
    };
    ecs.innerJoin(
      moveEntities,
      world.components.position,
      world.components.velocity
    );
  },
};
ecs.registerSystem(world, moveSystem);

tester.snapshot("The world should have a moveSystem", world);

const runOnce = (world, delta, time) => {
  world.systems.forEach(({ execute }) => {
    execute(world, delta, time);
  });
};

runOnce(world, 7, 50);

tester.snapshot(
  "Entities should have moved according to velocity, position and deltaTime",
  world
);

tester.print();
