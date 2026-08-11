(() => {
  function tokenize(source) {
    const tokens = [];
    let i = 0;

    while (i < source.length) {
      if (/\s/.test(source[i])) {
        i++;
        continue;
      }

      const rest = source.slice(i);
      const number = rest.match(/^\d+(?:\.\d+)?/);
      const identifier = rest.match(/^[A-Za-z_]\w*/);

      if (number) {
        tokens.push({ type: 'number', value: Number(number[0]) });
        i += number[0].length;
      } else if (identifier) {
        tokens.push({ type: 'identifier', value: identifier[0] });
        i += identifier[0].length;
      } else if ('+-*/^=()'.includes(source[i])) {
        tokens.push({ type: 'operator', value: source[i] });
        i++;
      } else {
        throw new Error(`Unexpected character: "${source[i]}"`);
      }
    }

    tokens.push({ type: 'eof', value: '' });
    return tokens;
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
      this.nextId = 1;
    }

    peek() {
      return this.tokens[this.pos];
    }

    take() {
      return this.tokens[this.pos++];
    }

    matches(value) {
      return this.peek().value === value;
    }

    expect(value) {
      if (!this.matches(value)) {
        throw new Error(`Expected "${value}", got "${this.peek().value}"`);
      }
      return this.take();
    }

    node(type, fields = {}) {
      return { id: this.nextId++, type, ...fields };
    }

    parseProgram() {
      const isAssignment =
        this.peek().type === 'identifier' &&
        this.tokens[this.pos + 1]?.value === '=';

      if (isAssignment) {
        const name = this.take().value;
        this.take(); // =
        const value = this.parseExpression();
        this.expect('');
        return this.node('assign', { name, value });
      }

      const expression = this.parseExpression();
      this.expect('');
      return expression;
    }

    parseExpression() {
      let left = this.parseTerm();

      while (this.matches('+') || this.matches('-')) {
        const operator = this.take().value;
        left = this.node('binary', {
          operator,
          left,
          right: this.parseTerm(),
        });
      }

      return left;
    }

    parseTerm() {
      let left = this.parsePower();

      while (this.matches('*') || this.matches('/')) {
        const operator = this.take().value;
        left = this.node('binary', {
          operator,
          left,
          right: this.parsePower(),
        });
      }

      return left;
    }

    parsePower() {
      let left = this.parseUnary();

      if (this.matches('^')) {
        this.take();
        left = this.node('binary', {
          operator: '^',
          left,
          right: this.parsePower(),
        });
      }

      return left;
    }

    parseUnary() {
      if (this.matches('-')) {
        this.take();
        return this.node('unary', {
          operator: '-',
          value: this.parseUnary(),
        });
      }

      if (this.matches('+')) {
        this.take();
        return this.parseUnary();
      }

      return this.parsePrimary();
    }

    parsePrimary() {
      const token = this.peek();

      if (token.type === 'number') {
        this.take();
        return this.node('number', { value: token.value });
      }

      if (token.type === 'identifier') {
        this.take();
        return this.node('variable', { name: token.value });
      }

      if (this.matches('(')) {
        this.take();
        const inner = this.parseExpression();
        this.expect(')');
        return inner;
      }

      throw new Error(`Expected a number, variable, or "(", got "${token.value}"`);
    }
  }

  function run(source, previousScope = {}) {
    const ast = new Parser(tokenize(source)).parseProgram();
    const scope = { ...previousScope };
    const steps = [];

    function emit(node, kind, label, inputs, value) {
      steps.push({ id: node.id, kind, label, inputs, value });
      return value;
    }

    function evaluate(node) {
      if (node.type === 'number') {
        return emit(node, 'source', String(node.value), [], node.value);
      }

      if (node.type === 'variable') {
        if (!(node.name in scope)) {
          throw new Error(`"${node.name}" has not been defined yet`);
        }
        return emit(node, 'source', node.name, [], scope[node.name]);
      }

      if (node.type === 'assign') {
        const value = evaluate(node.value);
        scope[node.name] = value;
        return emit(node, 'assign', `${node.name} =`, [node.value.id], value);
      }

      if (node.type === 'unary') {
        const value = -evaluate(node.value);
        return emit(node, 'operator', 'NEG', [node.value.id], value);
      }

      const left = evaluate(node.left);
      const right = evaluate(node.right);

      let value;
      switch (node.operator) {
        case '+': value = left + right; break;
        case '-': value = left - right; break;
        case '*': value = left * right; break;
        case '/':
          if (right === 0) throw new Error('Division by zero');
          value = left / right;
          break;
        case '^': value = left ** right; break;
      }

      return emit(
        node,
        'operator',
        node.operator,
        [node.left.id, node.right.id],
        value,
      );
    }

    return {
      ast,
      result: evaluate(ast),
      scope,
      steps,
    };
  }

  window.TesseractMath = { run };
})();