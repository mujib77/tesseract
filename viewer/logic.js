function tokenize(expr) {
  return expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] ?? ''; }
  next() { return this.tokens[this.pos++]; }

  parseExpr() {
    let left = this.parseTerm();
    while (this.peek() === 'OR') {
      this.next();
      const right = this.parseTerm();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    while (this.peek() === 'AND') {
      this.next();
      const right = this.parseFactor();
      left = { type: 'AND', left, right };
    }
    return left;
  }

  parseFactor() {
    const tok = this.peek();
    if (tok === 'NOT') {
      this.next();
      return { type: 'NOT', left: this.parseFactor() };
    }
    if (tok === '(') {
      this.next();
      const inner = this.parseExpr();
      if (this.peek() === ')') this.next();
      return inner;
    }
    this.next();
    return { type: 'VAR', value: tok === 'true' };
  }
}

function evalNode(n) {
  switch (n.type) {
    case 'VAR': return n.value;
    case 'AND': return evalNode(n.left) && evalNode(n.right);
    case 'OR': return evalNode(n.left) || evalNode(n.right);
    case 'NOT': return !evalNode(n.left);
  }
}

function compileExpression(expr) {
  const rhs = expr.split('=')[1]?.trim() ?? expr.trim();
  const tokens = tokenize(rhs);
  const tree = new Parser(tokens).parseExpr();
  const result = evalNode(tree);

  const cubes = [];
  let counter = 0;

  function walk(n) {
    if (n.type === 'VAR') return;
    if (n.type === 'AND') {
      walk(n.left);
      walk(n.right);
      const y = counter * 5;
      cubes.push({ point: [5, y, 0], normal: [-1, 1, 0], state: evalNode(n.left) });
      counter++;
      cubes.push({ point: [5, y + 5, 0], normal: [-1, -1, 0], state: evalNode(n.right) });
      counter++;
    } else if (n.type === 'OR') {
      walk(n.left);
      walk(n.right);
      const y = counter * 5;
      cubes.push({ point: [5, y, 0], normal: [-1, 1, 0], state: evalNode(n.left) || evalNode(n.right) });
      counter++;
    } else if (n.type === 'NOT') {
      walk(n.left);
    }
  }

  walk(tree);
  return { cubes, result };
}

function reflect(dir, normal) {
  const d = dir.x * normal.x + dir.y * normal.y + dir.z * normal.z;
  return {
    x: dir.x - normal.x * 2 * d,
    y: dir.y - normal.y * 2 * d,
    z: dir.z - normal.z * 2 * d,
  };
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function intersectTransistor(origin, dir, cube) {
  if (!cube.state) return -1;
  const normal = { x: cube.normal[0], y: cube.normal[1], z: cube.normal[2] };
  const point = { x: cube.point[0], y: cube.point[1], z: cube.point[2] };

  const denom = normal.x * dir.x + normal.y * dir.y + normal.z * dir.z;
  if (Math.abs(denom) < 1e-6) return -1;

  const diff = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const t = (diff.x * normal.x + diff.y * normal.y + diff.z * normal.z) / denom;
  return t > 1e-6 ? t : -1;
}

function traceGeometry(cubes) {
  let origin = { x: 0, y: 0, z: 0 };
  let dir = normalize({ x: 1, y: 0, z: 0 });
  const points = [[origin.x, origin.y, origin.z]];

  for (const cube of cubes) {
    const t = intersectTransistor(origin, dir, cube);
    if (t < 0) continue;

    const hit = {
      x: origin.x + dir.x * t,
      y: origin.y + dir.y * t,
      z: origin.z + dir.z * t,
    };
    const normal = { x: cube.normal[0], y: cube.normal[1], z: cube.normal[2] };
    const newDir = normalize(reflect(dir, normal));

    points.push([hit.x, hit.y, hit.z]);
    origin = hit;
    dir = newDir;
  }

  const exit = { x: origin.x + dir.x * 5, y: origin.y + dir.y * 5, z: origin.z + dir.z * 5 };
  points.push([exit.x, exit.y, exit.z]);

  return points;
}