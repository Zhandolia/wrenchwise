// Resolve the component inventory plus recipes.json into placed, named geometry.
//
// Nothing in here invents a dimension: every length and position is read from
// the inventory, where each value carries its own evidence status. Recipe
// constants are tessellation choices and are reported as such.

import { SHAPES, Mesh } from './primitives.mjs';

export function dimensionValue(component, key) {
  for (const item of component.dimensions?.items ?? []) {
    if (item.key === key) return item.value;
  }
  return undefined;
}

/** Resolve a recipe parameter. See recipes.json#parameterForms. */
export function resolveParam(spec, component, context = {}) {
  if (typeof spec === 'number' || typeof spec === 'string' || spec === null) return spec;
  if (typeof spec !== 'object') throw new Error(`Bad parameter: ${JSON.stringify(spec)}`);

  if (spec.quantity) {
    return (component.quantity?.value ?? 0) * (spec.scale ?? 1) + (spec.plus ?? 0);
  }
  if (spec.abs !== undefined) {
    const value = dimensionValue(component, spec.abs) ?? spec.default;
    if (value === undefined) {
      throw new Error(`${component.id}: no dimension "${spec.abs}" and no default`);
    }
    if (context.axisIndex === undefined) {
      throw new Error(`${component.id}: "abs" parameter is only valid in an offset slot`);
    }
    return value - component.placement.position[context.axisIndex];
  }
  if (spec.dim !== undefined) {
    const raw = dimensionValue(component, spec.dim) ?? spec.default;
    if (raw === undefined) {
      throw new Error(`${component.id}: no dimension "${spec.dim}" and no default`);
    }
    return raw * (spec.scale ?? 1) + (spec.plus ?? 0);
  }
  throw new Error(`${component.id}: unrecognised parameter ${JSON.stringify(spec)}`);
}

function resolveOffset(spec, component) {
  if (!spec) return [0, 0, 0];
  return spec.map((value, axisIndex) => resolveParam(value, component, { axisIndex }));
}

function resolveParams(params, component) {
  const out = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    out[key] = resolveParam(value, component);
  }
  return out;
}

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

function resolvePulleys(part, component, componentsById, notes) {
  const plane = part.params?.plane ?? 'xy';
  const [u, w] = plane.split('');
  const ui = AXIS_INDEX[u];
  const wi = AXIS_INDEX[w];
  const origin = component.placement.position;
  const rows = [];
  for (const entry of part.pulleys) {
    const other = componentsById.get(entry.component);
    if (!other) throw new Error(`${component.id}: unknown pulley component "${entry.component}"`);
    const radius = dimensionValue(other, entry.radiusDim);
    if (radius === undefined) {
      throw new Error(`${component.id}: pulley "${entry.component}" has no dimension "${entry.radiusDim}"`);
    }
    rows.push([
      other.placement.position[ui] - origin[ui],
      other.placement.position[wi] - origin[wi],
      radius * (entry.radiusScale ?? 1),
      entry.component,
    ]);
  }
  void notes;
  return rows;
}

/** Per-mesh offsets for a component with more than one selectable mesh. */
function instanceOffsets(recipe, component) {
  const meshIds = component.asset.meshIds;
  const instances = recipe.instances;
  if (recipe.meshes) {
    if (recipe.meshes.length !== meshIds.length) {
      throw new Error(`${component.id}: ${recipe.meshes.length} recipe meshes for ${meshIds.length} mesh ids`);
    }
    return recipe.meshes.map((m) => resolveOffset(m.offset, component));
  }
  if (!instances) {
    if (meshIds.length !== 1) {
      throw new Error(`${component.id}: ${meshIds.length} mesh ids but no "instances" or "meshes" recipe`);
    }
    return [[0, 0, 0]];
  }
  const count = meshIds.length;
  if (instances.mode === 'mirror-x') {
    if (count !== 2) throw new Error(`${component.id}: mirror-x needs exactly 2 mesh ids`);
    const o = resolveParam(instances.offset, component);
    return [[o, 0, 0], [-o, 0, 0]];
  }
  if (instances.mode === 'bolt-circle') {
    const radius = resolveParam(instances.radius, component);
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
    });
  }
  if (instances.mode === 'linear-y') {
    const spacing = resolveParam(instances.spacing, component);
    return Array.from({ length: count }, (_, i) => [0, (i - (count - 1) / 2) * spacing, 0]);
  }
  throw new Error(`${component.id}: unknown instances mode "${instances.mode}"`);
}

function buildParts(parts, component, componentsById, notes) {
  const built = [];
  for (const part of parts) {
    const shape = SHAPES[part.shape];
    if (!shape) throw new Error(`${component.id}: unknown shape "${part.shape}"`);
    const params = resolveParams(part.params, component);
    if (part.pulleys) {
      params.pulleys = resolvePulleys(part, component, componentsById, notes);
    }
    const baseOffset = resolveOffset(part.offset, component);
    const placements = [];
    if (part.repeat) {
      const axisIndex = AXIS_INDEX[part.repeat.axis];
      const spacing = resolveParam(part.repeat.spacing, component);
      for (let i = 0; i < part.repeat.count; i++) {
        const offset = [...baseOffset];
        offset[axisIndex] += (i - (part.repeat.count - 1) / 2) * spacing;
        placements.push(offset);
      }
    } else {
      placements.push(baseOffset);
    }
    for (const offset of placements) {
      const mesh = shape(params);
      if (mesh.beltPath?.skipped?.length) {
        notes.push(
          `${component.id}: belt drawn as the outer tangent loop; not in contact with ` +
            `${mesh.beltPath.skipped.join(', ')}.`,
        );
      }
      const placed = new Mesh().merge(mesh, offset);
      built.push({ mesh: placed, material: part.material });
    }
  }
  return built;
}

function meshBounds(parts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) {
    for (const v of part.mesh.verts) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) min[i] = v[i];
        if (v[i] > max[i]) max[i] = v[i];
      }
    }
  }
  return { min, max };
}

/**
 * Build every component in the inventory that has a recipe.
 * Returns objects grouped by asset layer, plus build notes.
 */
export function buildAssembly({ inventory, recipes }) {
  const componentsById = new Map(inventory.components.map((c) => [c.id, c]));
  const layers = new Map();
  const notes = [];
  const missingRecipes = [];
  const records = [];

  for (const component of inventory.components) {
    const recipe = recipes.components[component.id];
    if (!recipe) {
      missingRecipes.push(component.id);
      continue;
    }
    const offsets = instanceOffsets(recipe, component);
    const layer = component.asset.layer;
    if (!layers.has(layer)) layers.set(layer, []);

    let triangles = 0;
    const meshIds = component.asset.meshIds;
    for (let i = 0; i < meshIds.length; i++) {
      const perMesh = recipe.meshes ? recipe.meshes[i].parts : recipe.parts;
      const parts = buildParts(perMesh, component, componentsById, notes);
      const instanceOffset = offsets[i];
      for (const part of parts) part.mesh.translate(...instanceOffset);
      const bounds = meshBounds(parts);
      triangles += parts.reduce((sum, p) => sum + p.mesh.triangleCount, 0);
      layers.get(layer).push({
        name: meshIds[i],
        parts,
        translation: component.placement.position,
        extras: {
          componentId: component.id,
          meshId: meshIds[i],
          modelRevision: recipes.revision,
        },
        bounds,
      });
    }
    records.push({
      componentId: component.id,
      name: component.name,
      system: component.system,
      kind: component.kind,
      layer,
      meshIds,
      triangleCount: triangles,
      dimensionStatus: component.dimensions?.status ?? 'unknown',
      placementStatus: component.placement?.status ?? 'unknown',
      procedureStepIds: component.procedureStepIds ?? [],
    });
  }

  return { layers, notes, missingRecipes, records };
}
