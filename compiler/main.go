package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Cube struct {
	Point  [3]float64 `json:"point"`
	Normal [3]float64 `json:"normal"`
	State  bool       `json:"state"`
}

type Geometry struct {
	Cubes []Cube `json:"cubes"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("usage: compiler \"out = A AND B\"")
		os.Exit(1)
	}

	expr := os.Args[1]
	parts := strings.SplitN(expr, "=", 2)
	if len(parts) != 2 {
		fmt.Println("invalid expression, expected form: out = A AND B")
		os.Exit(1)
	}

	rhs := strings.TrimSpace(parts[1])
	tokens := strings.Fields(rhs)

	if len(tokens) != 3 || tokens[1] != "AND" {
		fmt.Println("only 'A AND B' is supported right now")
		os.Exit(1)
	}

	inputA := tokens[0] == "true"
	inputB := tokens[2] == "true"

	geometry := Geometry{
		Cubes: []Cube{
			{Point: [3]float64{5, 0, 0}, Normal: [3]float64{-1, 1, 0}, State: inputA},
			{Point: [3]float64{5, 5, 0}, Normal: [3]float64{-1, -1, 0}, State: inputB},
		},
	}

	out, err := json.MarshalIndent(geometry, "", "  ")
	if err != nil {
		fmt.Println("error encoding json:", err)
		os.Exit(1)
	}

	fmt.Println(string(out))
}