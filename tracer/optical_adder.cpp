#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

struct Vec3 {
    double x, y, z;
};

struct Signal {
    std::string name;
    bool value;
    Vec3 position;
    double time;
    std::string color;
};

struct Segment {
    std::string from;
    std::string to;
    bool active;
    Vec3 start;
    Vec3 end;
    double startTime;
    double endTime;
    std::string color;
};

struct Component {
    std::string type;
    std::string name;
    Vec3 position;
};

struct Event {
    std::string type;
    std::string name;
    bool value;
    double time;
};

struct Detector {
    std::string name;
    bool value;
    Vec3 position;
    double time;
};

std::vector<Segment> segments;
std::vector<Component> components;
std::vector<Event> events;
std::vector<Detector> detectors;

double distance(const Vec3& a, const Vec3& b) {
    const double dx = a.x - b.x;
    const double dy = a.y - b.y;
    const double dz = a.z - b.z;
    return std::sqrt(dx * dx + dy * dy + dz * dz);
}

void addComponent(const std::string& type, const std::string& name, Vec3 position) {
    components.push_back({type, name, position});
}

Signal route(const Signal& signal, Vec3 destination, const std::string& nextName) {
    const double travelTime = distance(signal.position, destination) / 4.0;

    segments.push_back({
        signal.name,
        nextName,
        signal.value,
        signal.position,
        destination,
        signal.time,
        signal.time + travelTime,
        signal.color,
    });

    return {
        nextName,
        signal.value,
        destination,
        signal.time + travelTime,
        signal.color,
    };
}

std::pair<Signal, Signal> split(
    const Signal& signal,
    const std::string& splitterName,
    Vec3 splitterPosition
) {
    Signal arrival = route(signal, splitterPosition, splitterName);
    const double outputTime = arrival.time + 0.25;

    events.push_back({"splitter", splitterName, arrival.value, outputTime});

    Signal left {
        splitterName + ".left",
        arrival.value,
        splitterPosition,
        outputTime,
        arrival.color,
    };

    Signal right {
        splitterName + ".right",
        arrival.value,
        splitterPosition,
        outputTime,
        arrival.color,
    };

    return {left, right};
}

Signal gate(
    const std::string& type,
    const std::string& gateName,
    Vec3 position,
    const std::vector<Signal>& inputs
) {
    bool output = false;

    if (type == "XOR") {
        output = inputs[0].value != inputs[1].value;
    } else if (type == "AND") {
        output = inputs[0].value && inputs[1].value;
    } else if (type == "OR") {
        output = inputs[0].value || inputs[1].value;
    }

    double latestInput = 0.0;
    for (const Signal& input : inputs) {
        latestInput = std::max(latestInput, input.time);
    }

    const double outputTime = latestInput + 0.45;
    events.push_back({"gate", gateName, output, outputTime});

    return {
        gateName + ".out",
        output,
        position,
        outputTime,
        "#d18cff",
    };
}

void detect(const Signal& signal, const std::string& detectorName, Vec3 position) {
    Signal arrival = route(signal, position, detectorName);

    detectors.push_back({
        detectorName,
        arrival.value,
        position,
        arrival.time,
    });

    events.push_back({
        "detector",
        detectorName,
        arrival.value,
        arrival.time,
    });
}

void writeVec3(std::ofstream& out, const Vec3& v) {
    out << "[" << v.x << ", " << v.y << ", " << v.z << "]";
}

void writeTrace(const std::string& path, bool a, bool b, bool carryIn) {
    std::ofstream out(path);
    out << std::fixed << std::setprecision(3);

    out << "{\n";
    out << "  \"title\": \"1-bit optical full adder\",\n";
    out << "  \"inputs\": {\"a\": " << (a ? "true" : "false")
        << ", \"b\": " << (b ? "true" : "false")
        << ", \"carryIn\": " << (carryIn ? "true" : "false") << "},\n";

    out << "  \"components\": [\n";
    for (size_t i = 0; i < components.size(); ++i) {
        const Component& c = components[i];
        out << "    {\"type\": \"" << c.type
            << "\", \"name\": \"" << c.name
            << "\", \"position\": ";
        writeVec3(out, c.position);
        out << "}";
        if (i + 1 != components.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"segments\": [\n";
    for (size_t i = 0; i < segments.size(); ++i) {
        const Segment& s = segments[i];
        out << "    {\"from\": \"" << s.from
            << "\", \"to\": \"" << s.to
            << "\", \"active\": " << (s.active ? "true" : "false")
            << ", \"start\": ";
        writeVec3(out, s.start);
        out << ", \"end\": ";
        writeVec3(out, s.end);
        out << ", \"startTime\": " << s.startTime
            << ", \"endTime\": " << s.endTime
            << ", \"color\": \"" << s.color << "\"}";
        if (i + 1 != segments.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"events\": [\n";
    for (size_t i = 0; i < events.size(); ++i) {
        const Event& e = events[i];
        out << "    {\"type\": \"" << e.type
            << "\", \"name\": \"" << e.name
            << "\", \"value\": " << (e.value ? "true" : "false")
            << ", \"time\": " << e.time << "}";
        if (i + 1 != events.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"detectors\": [\n";
    for (size_t i = 0; i < detectors.size(); ++i) {
        const Detector& d = detectors[i];
        out << "    {\"name\": \"" << d.name
            << "\", \"value\": " << (d.value ? "true" : "false")
            << ", \"position\": ";
        writeVec3(out, d.position);
        out << ", \"time\": " << d.time << "}";
        if (i + 1 != detectors.size()) out << ",";
        out << "\n";
    }
    out << "  ]\n";
    out << "}\n";
}

bool parseBit(const char* text) {
    const std::string value(text);

    if (value == "0") return false;
    if (value == "1") return true;

    throw std::runtime_error("Inputs must be 0 or 1.");
}

int main(int argc, char* argv[]) {
    try {
        if (argc != 4) {
            std::cout << "usage: optical_adder <A:0|1> <B:0|1> <CarryIn:0|1>\n";
            return 1;
        }

        const bool aValue = parseBit(argv[1]);
        const bool bValue = parseBit(argv[2]);
        const bool carryValue = parseBit(argv[3]);

        const Vec3 aEmitter {0, 3, 0};
        const Vec3 bEmitter {0, 0, 0};
        const Vec3 carryEmitter {0, -3, 0};

        const Vec3 splitA {2, 3, 0};
        const Vec3 splitB {2, 0, 0};
        const Vec3 splitCarry {5, -3, 0};

        const Vec3 xorOne {4, 1.5, 0};
        const Vec3 andOne {4, -1.5, 0};
        const Vec3 xorTwo {8, 1.3, 0};
        const Vec3 andTwo {8, -2.0, 0};
        const Vec3 orGate {12, -1.0, 0};

        const Vec3 sumDetector {12, 2.8, 0};
        const Vec3 carryDetector {15, -1.0, 0};

        addComponent("emitter", "A", aEmitter);
        addComponent("emitter", "B", bEmitter);
        addComponent("emitter", "CarryIn", carryEmitter);

        addComponent("splitter", "split_A", splitA);
        addComponent("splitter", "split_B", splitB);
        addComponent("splitter", "split_CarryIn", splitCarry);

        addComponent("xor_gate", "xor_1", xorOne);
        addComponent("and_gate", "and_1", andOne);
        addComponent("xor_gate", "xor_2", xorTwo);
        addComponent("and_gate", "and_2", andTwo);
        addComponent("or_gate", "or_1", orGate);

        addComponent("detector", "SUM", sumDetector);
        addComponent("detector", "CARRY", carryDetector);

        Signal a {"A", aValue, aEmitter, 0.0, "#00e5ff"};
        Signal b {"B", bValue, bEmitter, 0.0, "#ff35d3"};
        Signal carryIn {"CarryIn", carryValue, carryEmitter, 0.0, "#ffb000"};

        auto aBranches = split(a, "split_A", splitA);
        auto bBranches = split(b, "split_B", splitB);
        auto carryBranches = split(carryIn, "split_CarryIn", splitCarry);

        Signal xorOneOut = gate(
            "XOR",
            "xor_1",
            xorOne,
            {
                route(aBranches.first, xorOne, "A_to_xor_1"),
                route(bBranches.first, xorOne, "B_to_xor_1"),
            }
        );

        Signal andOneOut = gate(
            "AND",
            "and_1",
            andOne,
            {
                route(aBranches.second, andOne, "A_to_and_1"),
                route(bBranches.second, andOne, "B_to_and_1"),
            }
        );

        Signal xorTwoOut = gate(
            "XOR",
            "xor_2",
            xorTwo,
            {
                route(xorOneOut, xorTwo, "xor_1_to_xor_2"),
                route(carryBranches.first, xorTwo, "CarryIn_to_xor_2"),
            }
        );

        Signal andTwoOut = gate(
            "AND",
            "and_2",
            andTwo,
            {
                route(xorOneOut, andTwo, "xor_1_to_and_2"),
                route(carryBranches.second, andTwo, "CarryIn_to_and_2"),
            }
        );

        Signal carryOut = gate(
            "OR",
            "or_1",
            orGate,
            {
                route(andOneOut, orGate, "and_1_to_or_1"),
                route(andTwoOut, orGate, "and_2_to_or_1"),
            }
        );

        detect(xorTwoOut, "SUM", sumDetector);
        detect(carryOut, "CARRY", carryDetector);

        writeTrace("../viewer/adder_trace.json", aValue, bValue, carryValue);

        const int decimal = (xorTwoOut.value ? 1 : 0) + (carryOut.value ? 2 : 0);

        std::cout << "Optical full adder complete\n";
        std::cout << "A=" << aValue
            << " B=" << bValue
            << " CarryIn=" << carryValue
            << " -> Carry=" << carryOut.value
            << " Sum=" << xorTwoOut.value
            << " (decimal " << decimal << ")\n";
        std::cout << "Trace written to ../viewer/adder_trace.json\n";

        return 0;
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << "\n";
        return 1;
    }
}