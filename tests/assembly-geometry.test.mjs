import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SHAPES, beltPath, convexHull, wrappedPulleys } from '../modeling/wrenchwise/lib/primitives.mjs';
import { buildAssembly, dimensionValue, resolveParam } from '../modeling/wrenchwise/lib/assembly.mjs';
import { buildGlb, flatten } from '../modeling/wrenchwise/lib/gltf.mjs';

const inventory = JSON.parse(fs.readFileSync('content/components/2jz-ge-vvti-jzs160.json', 'utf8'));
const recipes = JSON.parse(fs.readFileSync('modeling/wrenchwise/recipes.json', 'utf8'));
const built = buildAssembly({ inventory, recipes });

test('every component in the inventory is built, into its declared layer', () => {
  assert.deepEqual(built.missingRecipes, []);
  assert.equal(built.records.length, inventory.components.length);
  for (const component of inventory.components) {
    const objects = built.layers.get(component.asset.layer) ?? [];
    for (const meshId of component.asset.meshIds) {
      const object = objects.find((entry) => entry.name === meshId);
      assert.ok(object, `${meshId} is missing from the ${component.asset.layer} layer`);
      assert.equal(object.extras.componentId, component.id);
      assert.ok(object.parts.length > 0 && object.parts[0].mesh.triangleCount > 0);
    }
  }
});

test('a fastener set produces one selectable mesh per fastener', () => {
  const bolts = inventory.components.find((c) => c.id === 'vvti-controller-factory-bolts');
  assert.equal(bolts.asset.meshIds.length, bolts.quantity.value);
  const objects = built.layers.get('core').filter((entry) => entry.extras.componentId === bolts.id);
  assert.equal(objects.length, bolts.quantity.value);
  // They sit on a bolt circle, so no two share a position.
  const positions = objects.map((entry) => entry.parts[0].mesh.verts[0].join(','));
  assert.equal(new Set(positions).size, objects.length);
});

test('placement and dimensions come from the inventory, never from the recipe', () => {
  const block = inventory.components.find((c) => c.id === 'cylinder-block');
  const object = built.layers.get('core').find((entry) => entry.name === 'cylinder-block');
  assert.deepEqual(object.translation, block.placement.position);
  const width = dimensionValue(block, 'width');
  const spanX = object.bounds.max[0] - object.bounds.min[0];
  assert.ok(Math.abs(spanX - width) < 1e-6, `block spans ${spanX} m, inventory says ${width} m`);
});

test('a recipe parameter without a dimension or a default is an error, not a guess', () => {
  const component = { id: 'x', dimensions: { items: [{ key: 'radius', value: 0.5 }] }, placement: { position: [1, 2, 3] } };
  assert.equal(resolveParam({ dim: 'radius', scale: 2 }, component), 1);
  assert.equal(resolveParam({ dim: 'missing', default: 0.25 }, component), 0.25);
  assert.throws(() => resolveParam({ dim: 'missing' }, component), /no dimension/);
  assert.equal(resolveParam({ abs: 'radius' }, component, { axisIndex: 1 }), 0.5 - 2);
  assert.throws(() => resolveParam({ abs: 'radius' }, component), /offset slot/);
});

test('the whole assembly stays within a plausible engine envelope', () => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const objects of built.layers.values()) {
    for (const object of objects) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], object.bounds.min[axis] + object.translation[axis]);
        max[axis] = Math.max(max[axis], object.bounds.max[axis] + object.translation[axis]);
      }
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const extent = max[axis] - min[axis];
    assert.ok(extent > 0.3 && extent < 2.0, `axis ${axis} extent ${extent} m is not engine-sized`);
  }
});

test('a belt wraps the pulleys it should, whatever order they are listed in', () => {
  // The water-pump pulley sits almost on the line between its neighbours; it is
  // its radius, not its centre, that puts it in contact with the belt.
  const accessory = [
    [0, 0, 0.085, 'crank'],
    [0, 0.22, 0.06, 'water-pump'],
    [0.18, 0.24, 0.055, 'power-steering'],
    [-0.19, 0.2, 0.03, 'alternator'],
    [-0.17, -0.02, 0.06, 'ac'],
    [0.12, 0.06, 0.03, 'tensioner'],
  ];
  const wrapped = wrappedPulleys(accessory).map((entry) => entry[3]);
  assert.ok(wrapped.includes('water-pump'), 'the water-pump pulley is in contact with the belt');
  assert.ok(wrapped.includes('crank') && wrapped.includes('alternator') && wrapped.includes('ac'));

  const shuffled = [...accessory].reverse();
  assert.deepEqual(
    new Set(wrappedPulleys(shuffled).map((entry) => entry[3])),
    new Set(wrapped),
    'the wrap set does not depend on the order the pulleys are listed in',
  );
});

test('a belt is a closed band and reports pulleys it cannot reach', () => {
  const mesh = beltPath({
    pulleys: [
      [0, 0, 0.05, 'a'],
      [0.3, 0, 0.05, 'b'],
      [0.15, 0.3, 0.05, 'c'],
      [0.15, 0.1, 0.005, 'buried'],
    ],
    width: 0.02,
    thickness: 0.004,
  });
  assert.deepEqual(mesh.beltPath.skipped, ['buried']);
  assert.equal(mesh.beltPath.wrapped.length, 3);
  assert.ok(mesh.triangleCount > 100);
});

test('the convex hull is counter-clockwise, which the belt construction relies on', () => {
  const hull = convexHull([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]);
  assert.equal(hull.length, 4, 'the interior point is dropped');
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x0, y0] = hull[i];
    const [x1, y1] = hull[(i + 1) % hull.length];
    area += x0 * y1 - x1 * y0;
  }
  assert.ok(area > 0, 'counter-clockwise traversal');
});

test('tooth and groove counts follow the stated pitch rather than a fixed number', () => {
  const small = SHAPES.toothedPulley({ pitchRadius: 0.03, width: 0.028, toothPitch: 0.0095 });
  const large = SHAPES.toothedPulley({ pitchRadius: 0.06, width: 0.028, toothPitch: 0.0095 });
  assert.ok(large.triangleCount > small.triangleCount * 1.5, 'a bigger pulley gets proportionally more teeth');
  const narrow = SHAPES.groovedPulley({ radius: 0.06, width: 0.015, ribPitch: 0.0075 });
  const wide = SHAPES.groovedPulley({ radius: 0.06, width: 0.045, ribPitch: 0.0075 });
  assert.ok(wide.triangleCount > narrow.triangleCount);
});

test('shapes are centred on their own origin and oriented by the axis argument', () => {
  const extent = (mesh, axis) => {
    const values = mesh.verts.map((vertex) => vertex[axis]);
    return [Math.min(...values), Math.max(...values)];
  };
  const alongZ = SHAPES.cylinder({ radius: 0.01, length: 0.4, axis: 'z' });
  assert.deepEqual(extent(alongZ, 2).map((v) => Math.round(v * 1000)), [-200, 200]);
  const alongX = SHAPES.cylinder({ radius: 0.01, length: 0.4, axis: 'x' });
  assert.deepEqual(extent(alongX, 0).map((v) => Math.round(v * 1000)), [-200, 200]);
  assert.ok(Math.abs(extent(alongX, 2)[1]) < 0.011, 'the X-axis cylinder is thin along Z');
});

test('flat shading gives every triangle its own normal, and the GLB container is well formed', () => {
  const data = flatten(SHAPES.box({ x: 1, y: 1, z: 1 }));
  assert.equal(data.triangleCount, 12);
  assert.equal(data.vertexCount, 36);
  const normals = new Set();
  for (let i = 0; i < data.vertexCount; i++) {
    normals.add(`${data.normals[i * 3]},${data.normals[i * 3 + 1]},${data.normals[i * 3 + 2]}`);
  }
  assert.equal(normals.size, 6, 'a cube has six face normals');

  const { glb, stats } = buildGlb({
    objects: [
      {
        name: 'demo',
        parts: [{ mesh: SHAPES.box({ x: 1, y: 1, z: 1 }), material: 'cast-iron' }],
        translation: [0, 0, 0],
        extras: { componentId: 'demo', meshId: 'demo', modelRevision: 1 },
      },
    ],
    materials: recipes.materials,
  });
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  assert.equal(glb.readUInt32LE(8), glb.length, 'the header length matches the file');
  assert.equal(stats.triangleCount, 12);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
  assert.equal(gltf.asset.version, '2.0');
  assert.equal(gltf.nodes[0].extras.componentId, 'demo');
  assert.equal(gltf.extensionsRequired, undefined, 'no decoder is required to open the asset');
});

test('an unknown material or shape fails the build instead of rendering wrong', () => {
  assert.throws(
    () =>
      buildGlb({
        objects: [
          {
            name: 'x',
            parts: [{ mesh: SHAPES.box({ x: 1, y: 1, z: 1 }), material: 'chartreuse' }],
            translation: [0, 0, 0],
            extras: {},
          },
        ],
        materials: recipes.materials,
      }),
    /Unknown material/,
  );
  assert.throws(
    () =>
      buildAssembly({
        inventory: { components: [{ ...inventory.components[0], id: 'mystery' }] },
        recipes: { ...recipes, components: { mystery: { parts: [{ shape: 'blob', material: 'cast-iron' }] } } },
      }),
    /unknown shape/,
  );
});
