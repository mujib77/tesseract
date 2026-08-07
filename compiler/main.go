package main

import (
	"fmt"
	"os"
	"strings"
)

type NodeType int

const (
	NodeVar NodeType = iota
	NodeAnd
	NodeOr
	NodeNot
)

type Node struct {
	Type  NodeType
	Value bool   
	Left  *Node
	Right *Node
}

type Parser struct {
	tokens []string
	pos    int
}

func (p *Parser) peek() string {
	if p.pos >= len(p.tokens) {
		return ""
	}
	return p.tokens[p.pos]
}

func (p *Parser) next() string {
	tok := p.peek()
	p.pos++
	return tok
}

func (p *Parser) parseExpr() *Node {
	left := p.parseTerm()
	for p.peek() == "OR" {
		p.next()
		right := p.parseTerm()
		left = &Node{Type: NodeOr, Left: left, Right: right}
	}
	return left
}

func (p *Parser) parseTerm() *Node {
	left := p.parseFactor()
	for p.peek() == "AND" {
		p.next()
		right := p.parseFactor()
		left = &Node{Type: NodeAnd, Left: left, Right: right}
	}
	return left
}

func (p *Parser) parseFactor() *Node {
	tok := p.peek()

	if tok == "NOT" {
		p.next()
		inner := p.parseFactor()
		return &Node{Type: NodeNot, Left: inner}
	}

	if tok == "(" {
		p.next()
		inner := p.parseExpr()
		if p.peek() == ")" {
			p.next()
		}
		return inner
	}

	p.next()
	return &Node{Type: NodeVar, Value: tok == "true"}
}

func eval(n *Node) bool {
	switch n.Type {
	case NodeVar:
		return n.Value
	case NodeAnd:
		return eval(n.Left) && eval(n.Right)
	case NodeOr:
		return eval(n.Left) || eval(n.Right)
	case NodeNot:
		return !eval(n.Left)
	}
	return false
}

func tokenize(expr string) []string {
	expr = strings.ReplaceAll(expr, "(", " ( ")
	expr = strings.ReplaceAll(expr, ")", " ) ")
	return strings.Fields(expr)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("usage: compiler \"out = (true AND false) OR NOT false\"")
		os.Exit(1)
	}

	expr := os.Args[1]
	parts := strings.SplitN(expr, "=", 2)
	if len(parts) != 2 {
		fmt.Println("invalid expression, expected form: out = <expr>")
		os.Exit(1)
	}

	rhs := strings.TrimSpace(parts[1])
	tokens := tokenize(rhs)

	parser := &Parser{tokens: tokens}
	tree := parser.parseExpr()

	result := eval(tree)
	fmt.Printf("out = %v\n", result)
}