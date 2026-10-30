// A small JSON Schema validator covering the subset content/schema/ uses.
//
// Supported: type (single or array), enum, const, required, properties,
// patternProperties, additionalProperties, items, minItems, minimum, maximum,
// pattern, minLength, oneOf, anyOf, allOf, and local $ref into #/$defs.
// Anything else in a schema is ignored rather than silently passing, because
// scripts/validate-content.mjs fails on unknown keywords.

const KNOWN = new Set([
  '$schema', '$id', '$ref', '$defs', 'title', 'description', 'examples', 'default',
  'type', 'enum', 'const', 'required', 'properties', 'patternProperties',
  'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems',
  'minimum', 'maximum', 'pattern', 'minLength', 'oneOf', 'anyOf', 'allOf',
]);

export function unknownKeywords(schema, path = '#') {
  const found = [];
  const walk = (node, at) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${at}/${i}`));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (!KNOWN.has(key)) {
        found.push(`${at}/${key}`);
        continue;
      }
      if (['properties', 'patternProperties', '$defs'].includes(key)) {
        for (const [name, child] of Object.entries(value)) walk(child, `${at}/${key}/${name}`);
      } else if (['items', 'additionalProperties'].includes(key)) {
        if (typeof value === 'object') walk(value, `${at}/${key}`);
      } else if (['oneOf', 'anyOf', 'allOf'].includes(key)) {
        walk(value, `${at}/${key}`);
      }
    }
  };
  walk(schema, path);
  return found;
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(expected, actual) {
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return expected === actual;
}

/** Validate `value` against `schema`. Returns an array of human-readable errors. */
export function validate(value, schema, { root = schema, path = '' } = {}) {
  const errors = [];
  const at = path || '(root)';

  if (schema.$ref) {
    const target = resolveRef(schema.$ref, root);
    if (!target) return [`${at}: unresolved $ref "${schema.$ref}"`];
    return validate(value, target, { root, path });
  }

  if (schema.type) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    if (!expected.some((t) => typeMatches(t, actual))) {
      return [`${at}: expected ${expected.join(' | ')}, found ${actual}`];
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: "${value}" is not one of ${schema.enum.join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${at}: "${value}" does not match /${schema.pattern}/`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${at}: shorter than ${schema.minLength} characters`);
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${at}: ${value} is below the minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${at}: ${value} is above the maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${at}: needs at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${at}: allows at most ${schema.maxItems} item(s)`);
    }
    if (schema.uniqueItems) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push(`${at}: items must be unique`);
    }
    if (schema.items) {
      value.forEach((item, i) => {
        errors.push(...validate(item, schema.items, { root, path: `${at}[${i}]` }));
      });
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${at}: missing required property "${key}"`);
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) {
        errors.push(...validate(child, properties[key], { root, path: `${at}.${key}` }));
        continue;
      }
      let matched = false;
      for (const [pattern, child2] of Object.entries(schema.patternProperties ?? {})) {
        if (new RegExp(pattern).test(key)) {
          matched = true;
          errors.push(...validate(child, child2, { root, path: `${at}.${key}` }));
        }
      }
      if (matched) continue;
      if (schema.additionalProperties === false) {
        errors.push(`${at}: unexpected property "${key}"`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(...validate(child, schema.additionalProperties, { root, path: `${at}.${key}` }));
      }
    }
  }

  for (const sub of schema.allOf ?? []) {
    errors.push(...validate(value, sub, { root, path }));
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((sub) => validate(value, sub, { root, path }).length === 0);
    if (passing.length !== 1) {
      errors.push(`${at}: must match exactly one of ${schema.oneOf.length} alternatives (matched ${passing.length})`);
    }
  }
  if (schema.anyOf) {
    const passing = schema.anyOf.some((sub) => validate(value, sub, { root, path }).length === 0);
    if (!passing) errors.push(`${at}: matches none of the allowed alternatives`);
  }

  return errors;
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#/')) return null;
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node?.[part];
  }
  return node ?? null;
}
