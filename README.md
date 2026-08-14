# Tesseract

> **What if code didn't run on a CPU - what if it became a machine made of light?**

Tesseract is an experimental optical-computation simulator that turns programs and mathematical operations into physical-looking 3D execution chambers.

Instead of only showing:

```text
22 + 99 = 121
```

Tesseract tries to show **how that computation happens**.

The input is compiled into an optical machine made from emitters, logic components, light paths and detectors. Then simulated light travels through that machine and the final detector array produces the result.

The goal is simple:

**make computation something you can see.**

---

## Demo

**[▶ Watch the demo](https://github.com/mujib77/tesseract/releases/download/v0.1.0/demo.mp4)**

---

## The idea

Most programming languages eventually turn your code into something that a computer can execute.

Tesseract takes a very different approach.

```text
             SOURCE
               │
               ▼
        ┌──────────────┐
        │   COMPILER   │
        └──────┬───────┘
               │
               ▼
     ┌─────────────────────┐
     │  OPTICAL MACHINE    │
     │                     │
     │  emitters           │
     │  full adders        │
     │  optical routes     │
     │  comparators        │
     │  detectors          │
     └──────────┬──────────┘
                │
                │ simulated light
                ▼
        ┌───────────────┐
        │   DETECTORS   │
        └───────┬───────┘
                │
                ▼
             RESULT
```

The important part is that the scene isn't supposed to be a decorative visualization of an answer.

The long-term idea is:

> **The machine itself is the program.**

A different computation should eventually produce a different physical machine.

---

## Why I built this

I started Tesseract as a Boolean-logic experiment.

The first version was basically:

```text
AND
OR
NOT
XOR
```

with a 3D representation of the logic and a simulated light path.

It worked, but there was a problem.

If I showed someone:

```text
A AND B → 1
```

most people wouldn't care.

If I showed them:

```text
22 + 99
```

and then a physical-looking room assembled itself and light travelled through it until a detector wall produced:

```text
121
```

that's something almost anyone can understand.

So the project changed direction.

The logic gates are still underneath everything, but the front door is normal computation.

The goal is to make the result feel less like:

> "a calculator with a Three.js animation"

and more like:

> **"I wrote some code and the computer physically built the machine required to execute it."**

---

# Current state

Tesseract is still an experimental project and is nowhere near a general-purpose optical computer.

But the current prototype already has the core of the idea working.

### Current pieces

- Arithmetic expression parsing
- Computation graph visualization
- Binary representation of values
- Optical-style light paths
- 8-bit addition
- Chained full-adder modules
- Carry propagation
- Detector arrays
- A physical output detector wall
- Automatic chamber framing
- Cinematic execution mode
- Chamber construction animation
- Comparator/control-flow experiments
- True/false optical branches
- Physical-looking vault gate / actuator concept

The current flagship demonstration is an optical addition chamber.

For example:

```text
22 + 99
```

gets represented as an 8-bit optical machine containing multiple full-adder stages.

The carry signal travels through the stages and the result bits eventually arrive at the detector wall.

The final output is decoded from those detector states.

---

# The execution model

At a high level, an operation goes through several stages.

### 1. Input

A normal expression or program is provided.

For example:

```text
22 + 99
```

or eventually:

```text
if (22 + 99 > 100) {
    vault.open()
}
```

---

### 2. Compilation

The expression is turned into an execution representation.

For arithmetic, values are converted into binary channels.

For addition, Tesseract creates a chain of full-adder modules.

Conceptually:

```text
A0 ─────┐
        ├──► FA0 ───► SUM0
B0 ─────┘       │
                │ carry
                ▼
A1 ─────┐
        ├──► FA1 ───► SUM1
B1 ─────┘       │
                │
                ▼
              FA2
                │
                ▼
               ...
                │
                ▼
              FA7
                │
                ▼
          DETECTOR WALL
```

---

### 3. Chamber construction

The compiler output becomes a 3D execution chamber.

Components are placed into the scene and connected with optical paths.

Instead of immediately showing the finished circuit, the cinematic mode can build the chamber first.

```text
COMPILING...
     ↓
FA_0 materializes
     ↓
FA_1 materializes
     ↓
FA_2 materializes
     ↓
...
     ↓
DETECTOR WALL
     ↓
CHAMBER READY
```

This is one of the parts I care most about visually because it changes the feeling from:

> "here is a circuit"

to:

> **"the program just built itself."**

---

### 4. Light execution

Once the chamber exists, simulated photons travel along the generated optical paths.

Active paths contain animated light pulses.

Carry signals propagate from one full-adder to the next.

The viewer can therefore see the computation progressing through the machine rather than only seeing the final answer.

---

### 5. Detection

The output doesn't immediately appear as a number.

The detector array receives the signals first.

For an addition result, the detector states represent the output bits.

For example:

```text
01111001₂
```

is eventually decoded as:

```text
121
```

The detector wall is therefore the final physical boundary between the optical machine and the human-readable result.

---

# Optical addition

The current main demonstration is an 8-bit ripple-carry adder.

Each bit gets its own full-adder.

A full adder receives:

```text
A
B
Carry In
```

and produces:

```text
Sum
Carry Out
```

Tesseract chains these together.

```text
             carry
               │
               ▼
      ┌────────────────┐
A0 ──►│                │──► SUM0
B0 ──►│     FULL       │
      │     ADDER      │
      └───────┬────────┘
              │
              ▼
      ┌────────────────┐
A1 ──►│                │──► SUM1
B1 ──►│     FULL       │
      │     ADDER      │
      └───────┬────────┘
              │
              ▼
             ...
              │
              ▼
      ┌────────────────┐
A7 ──►│     FULL       │──► SUM7
B7 ──►│     ADDER      │
      └───────┬────────┘
              │
              ▼
       OUTPUT DETECTOR
           WALL
```

The interesting part visually is the carry.

You can actually watch the signal move through the machine.

---

# Control flow

The next step beyond arithmetic is making the optical machine capable of making decisions.

The prototype has already started moving in this direction.

For example:

```text
if (22 + 99 > 100) {
    vault.open()
}
```

can be represented as:

```text
addition
   │
   ▼
detectors
   │
   ▼
comparator
   │
   ▼
optical switch
   │
   ├──────── TRUE ───────► vault
   │
   └──────── FALSE ──────► alternate path
```

This is where the project starts becoming much more interesting than a calculator.

The result of a computation can become a **physical consequence inside the machine**.

A true condition can send the light down one corridor.

A false condition can send it somewhere else.

The eventual goal is for constructs such as:

```text
if
for
while
function calls
```

to have physical representations rather than simply being displayed as text.

---

# Cinematic mode

The normal viewer is useful for development.

But the project has another mode whose entire purpose is to make the execution feel like an actual machine.

A cinematic run follows roughly this sequence:

```text
SOURCE CODE
    │
    ▼
COMPILING
    │
    ▼
ROOM ASSEMBLES
    │
    ▼
CHAMBER READY
    │
    ▼
LIGHT ENTERS
    │
    ▼
CARRY PROPAGATES
    │
    ▼
DETECTOR WALL
    │
    ▼
RESULT
```

The camera can follow the execution through the chamber instead of leaving the user looking at a static graph.

The idea is that a 15-second video of Tesseract should be understandable even if someone knows absolutely nothing about logic gates.

---

# Architecture

The repository is currently split into three main areas:

```text
tesseract/
│
├── compiler/
│   ├── main.go
│   └── go.mod
│
├── tracer/
│   ├── compile_add8.cpp
│   ├── optical_adder.cpp
│   ├── main.cpp
│   ├── geometry.json
│   ├── trace.json
│   └── adder traces...
│
├── viewer/
│   ├── chamber.html
│   ├── chamber.js
│   ├── index.html
│   ├── main.js
│   ├── logic.js
│   ├── math.js
│   └── generated JSON traces
│
└── README.md
```

The exact structure is still evolving as the compiler and execution model get bigger.

---

## Compiler

The compiler side is written in **Go**.

The early compiler parses Boolean expressions such as:

```text
A AND B
A OR B
NOT A
```

and builds an internal representation that can be converted into geometry data.

The arithmetic work then extends the idea toward actual numeric expressions and computation graphs.

The important architectural direction is:

```text
source expression
       ↓
      AST
       ↓
execution representation
       ↓
optical machine description
```

---

## Tracer

The tracer side is written in **C++**.

This is where the project experiments with optical execution and signal propagation.

The current arithmetic tracer generates data describing:

- components
- signals
- routes
- active/inactive paths
- timing
- events
- detector positions
- detector values

The output is serialized as JSON so the browser viewer can consume the execution trace.

A simplified trace looks conceptually like:

```json
{
  "components": [],
  "segments": [],
  "events": [],
  "detectors": []
}
```

This keeps the computation layer separate from the rendering layer.

---

## Viewer

The viewer is built with **Three.js**.

It turns the generated trace into the actual 3D execution chamber.

The viewer is responsible for:

- rendering components
- rendering optical fibres/routes
- rendering detector walls
- displaying labels
- animating photons
- showing binary channels
- framing the chamber
- running replay mode
- running cinematic mode
- displaying the final detector result

Three.js is currently loaded directly in the browser, so the viewer does not need a large frontend build system just to run the demo.

---

# Why the result should come from detectors

One of the most important design decisions in Tesseract is that the visualization shouldn't secretly calculate the answer and then animate something that looks like computation.

The stronger architecture is:

```text
                 ┌─────────────┐
SOURCE ─────────►│  COMPILER   │
                 └──────┬──────┘
                        │
                        ▼
                OPTICAL MACHINE
                        │
                        ▼
                 LIGHT PROPAGATION
                        │
                        ▼
                   DETECTORS
                        │
                        ▼
                    RESULT
```

JavaScript can be used as a verifier.

But ideally the final answer should be reconstructed from the simulated optical state.

That way, if the optical machine is wrong, Tesseract should be capable of showing that it is wrong.

That's much more interesting than:

```js
const answer = a + b;
```

followed by an animation pretending the light discovered it.

---

# Design philosophy

There are a few rules I want Tesseract to follow as it grows.

### 1. The machine should explain itself

Someone should be able to look at a computation and roughly understand what is happening without reading the source code.

### 2. Light should do something

The photons shouldn't just be decoration.

They should represent:

- values
- signals
- timing
- carries
- branches
- outputs

### 3. The scene should come from the program

Different programs should eventually create different machines.

```text
a + b
```

should not produce the same room as:

```text
a * b
```

and:

```text
if (...)
```

should not look like either.

### 4. The result should have a physical location

Instead of a random number appearing in a HUD, the result should arrive somewhere.

The detector wall is the first version of that idea.

### 5. Keep the claims honest

Tesseract is currently a **simulation of optical computation**.

It isn't a real optical computer.

It isn't currently claiming to replace CPUs.

And unless the implementation actually uses GPU ray tracing, it shouldn't be marketed as one.

The interesting thing is already enough:

> **computation represented as a physical optical machine.**

---

# Tech stack

| Part | Technology |
|---|---|
| Compiler | Go |
| Optical tracer | C++ |
| 3D rendering | Three.js |
| Data exchange | JSON |
| Frontend | HTML / CSS / JavaScript |
| Version control | Git |

---

# Running it locally

You will need:

- Go
- a C++17 compiler such as `g++`
- a modern browser
- Git

Python is **not required** for the current viewer.

The Three.js dependency is loaded from a CDN.

### Clone

```bash
git clone <your-repository-url>
cd tesseract
```

### Build the compiler

```bash
cd compiler
go build
```

### Build the tracer

```bash
cd ../tracer
g++ -std=c++17 -O2 compile_add8.cpp -o compile_add8.exe
```

Generate an example optical trace:

```bash
./compile_add8.exe 22 99
```

On Windows:

```powershell
.\compile_add8.exe 22 99
```

This generates the trace consumed by the viewer.

### Run the viewer

Serve the `viewer` directory with any local HTTP server.

For example, with Node:

```bash
npx serve viewer
```

Then open the local address printed by the server.

A local server is needed because the browser fetches the generated JSON trace.

---

# Example

The current showcase is:

```text
22 + 99
```

The machine receives:

```text
A = 22
B = 99
```

The values become binary channels:

```text
00010110
01100011
```

The optical adder processes them through the full-adder chain.

The result is:

```text
01111001
```

The detector wall then resolves:

```text
01111001₂ = 121
```

The important part isn't the number 121.

It's the path:

```text
22 + 99
   ↓
binary light
   ↓
8 optical full adders
   ↓
carry propagation
   ↓
detector wall
   ↓
121
```

---

# What I want Tesseract to become

The current 8-bit adder is basically the first serious proof of the idea.

The bigger version looks more like this:

```text
                    ┌──────────────┐
                    │   PROGRAM    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   COMPILER   │
                    └──────┬───────┘
                           │
                           ▼
             ┌──────────────────────────┐
             │     OPTICAL CHAMBER      │
             │                          │
             │  ┌────┐   ┌────┐        │
             │  │ADD │──►│CMP │───┐    │
             │  └─┬──┘   └────┘   │    │
             │    │                ▼    │
             │    │          ┌────────┐ │
             │    └─────────►│ SWITCH │ │
             │               └───┬────┘ │
             │                  /   \    │
             │                 /     \   │
             │              TRUE    FALSE│
             │                │       │  │
             │                ▼       ▼  │
             │             ┌────┐ ┌────┐ │
             │             │OUT │ │OUT │ │
             │             └────┘ └────┘ │
             └──────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   DETECTORS  │
                    └──────┬───────┘
                           │
                           ▼
                         RESULT
```

Eventually I want to push this much further.

Arithmetic.

Comparisons.

Conditionals.

Loops.

Memory.

Functions.

And eventually a programming model where the **shape of the machine is generated by the program itself**.

At that point, Tesseract stops being a fancy calculator and starts becoming something much more interesting:

> **a visual execution environment where you can walk inside the program while it runs.**

---

# Roadmap

### Done / working

- [x] Boolean expression prototype
- [x] 3D optical visualization
- [x] Arithmetic expression engine
- [x] Computation graph
- [x] Binary value representation
- [x] Large-number light-bus visualization
- [x] 8-bit addition compiler
- [x] Full-adder chain
- [x] Carry propagation
- [x] Detector output
- [x] Output detector wall
- [x] Cinematic camera movement
- [x] Chamber construction animation
- [x] First control-flow / comparator prototype
- [x] True/false optical path prototype
- [x] Physical gate / actuator concept

### Next

- [ ] Make the compiler generate the entire chamber directly from source code
- [ ] Make multiplication use actual optical partial-product stages
- [ ] Improve comparison and branching
- [ ] Add loops as physical paths
- [ ] Add persistent state / memory
- [ ] Make different programs generate visibly different architectures
- [ ] Add first-person exploration mode
- [ ] Let users inspect a component and trace it back to source code
- [ ] Make detector output the authoritative result
- [ ] Build a clean cinematic/demo mode
- [ ] Make the whole thing feel like a real optical computer laboratory

---

# The end goal

I don't want Tesseract to be another:

> "look, I made a calculator in Three.js"

project.

The thing I'm actually trying to build is:

```text
             WRITE CODE
                  │
                  ▼
          CODE BECOMES ARCHITECTURE
                  │
                  ▼
             LIGHT RUNS
                  │
                  ▼
          MACHINE MAKES A DECISION
                  │
                  ▼
              RESULT
```

Imagine typing:

```text
if (22 + 99 > 100) {
    vault.open()
}
```

and instead of getting:

```text
true
```

you watch an optical chamber assemble itself, the addition propagate through the machine, the detector wall resolve `121`, the comparator activate, a light pulse choose the TRUE corridor, and an actual physical gate open.

That's the direction.

**Tesseract is an experiment in making software executable architecture.**

---

## Status

🚧 **Experimental / actively being built**

This project is intentionally evolving. The current implementation is a prototype of the larger idea, not a finished optical computer.

If you find the idea interesting, feel free to explore the code and see how far it can go.

---

## License

MIT