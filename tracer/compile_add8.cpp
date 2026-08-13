#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
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

struct FullAdderOutput {
    Signal sum;
    Signal carry;
};

struct BranchOutput {
    Signal whenTrue;
    Signal whenFalse;
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
    const double travelTime = distance(signal.position, destination) / 5.0;

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

FullAdderOutput fullAdder(
    const std::string& name,
    Vec3 position,
    const Signal& a,
    const Signal& b,
    const Signal& carryIn
) {
    const bool sumValue = a.value != b.value != carryIn.value;

    const bool carryValue =
        (a.value && b.value) ||
        (a.value && carryIn.value) ||
        (b.value && carryIn.value);

    const double outputTime =
        std::max({a.time, b.time, carryIn.time}) + 0.55;

    events.push_back({
        "full_adder",
        name,
        sumValue || carryValue,
        outputTime,
    });

    return {
        {
            name + ".sum",
            sumValue,
            position,
            outputTime,
            "#68ff88",
        },
        {
            name + ".carry",
            carryValue,
            position,
            outputTime,
            "#ffb000",
        },
    };
}

Signal detect(const Signal& signal, const std::string& name, Vec3 position) {
    Signal arrival = route(signal, position, name);

    detectors.push_back({
        name,
        arrival.value,
        position,
        arrival.time,
    });

    events.push_back({
        "detector",
        name,
        arrival.value,
        arrival.time,
    });

    return arrival;
}

Signal compareGreater(
    const std::string& name,
    Vec3 position,
    const std::vector<Signal>& resultBits,
    unsigned int threshold
) {
    unsigned int result = 0;
    double latestInput = 0.0;

    for (size_t bit = 0; bit < resultBits.size(); ++bit) {
        if (resultBits[bit].value) {
            result |= 1u << bit;
        }

        latestInput = std::max(latestInput, resultBits[bit].time);
    }

    const bool passed = result > threshold;
    const double outputTime = latestInput + 0.75;

    events.push_back({
        "comparator",
        name,
        passed,
        outputTime,
    });

    return {
        name + ".result",
        passed,
        position,
        outputTime,
        passed ? "#68ff88" : "#ff355f",
    };
}

BranchOutput opticalSwitch(
    const std::string& name,
    Vec3 position,
    const Signal& timingPulse,
    bool condition
) {
    const double outputTime = timingPulse.time + 0.45;

    events.push_back({
        "optical_switch",
        name,
        condition,
        outputTime,
    });

    return {
        {
            name + ".true",
            condition,
            position,
            outputTime,
            "#68ff88",
        },
        {
            name + ".false",
            !condition,
            position,
            outputTime,
            "#ff355f",
        },
    };
}

void activate(
    const Signal& signal,
    const std::string& actuatorName,
    Vec3 actuatorPosition
) {
    Signal arrival = route(signal, actuatorPosition, actuatorName + ".input");

    events.push_back({
        "actuator",
        actuatorName,
        arrival.value,
        arrival.time,
    });
}

void writeVec3(std::ofstream& out, const Vec3& v) {
    out << "[" << v.x << ", " << v.y << ", " << v.z << "]";
}

void writeTrace(
    unsigned int a,
    unsigned int b,
    unsigned int threshold
) {
    std::ofstream out("../viewer/adder_trace.json");
    out << std::fixed << std::setprecision(3);

    out << "{\n";
    out << "  \"title\": \"8-bit optical branch chamber\",\n";
    out << "  \"program\": {"
        << "\"source\": \"if (" << a << " + " << b << " > "
        << threshold << ") vault.open()\", "
        << "\"threshold\": " << threshold << "},\n";

    out << "  \"inputs\": {\"a\": " << a
        << ", \"b\": " << b
        << ", \"carryIn\": false, \"width\": 8},\n";

    out << "  \"components\": [\n";
    for (size_t i = 0; i < components.size(); ++i) {
        const Component& component = components[i];

        out << "    {\"type\": \"" << component.type
            << "\", \"name\": \"" << component.name
            << "\", \"position\": ";

        writeVec3(out, component.position);
        out << "}";

        if (i + 1 != components.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"segments\": [\n";
    for (size_t i = 0; i < segments.size(); ++i) {
        const Segment& segment = segments[i];

        out << "    {\"from\": \"" << segment.from
            << "\", \"to\": \"" << segment.to
            << "\", \"active\": " << (segment.active ? "true" : "false")
            << ", \"start\": ";

        writeVec3(out, segment.start);

        out << ", \"end\": ";
        writeVec3(out, segment.end);

        out << ", \"startTime\": " << segment.startTime
            << ", \"endTime\": " << segment.endTime
            << ", \"color\": \"" << segment.color << "\"}";

        if (i + 1 != segments.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"events\": [\n";
    for (size_t i = 0; i < events.size(); ++i) {
        const Event& event = events[i];

        out << "    {\"type\": \"" << event.type
            << "\", \"name\": \"" << event.name
            << "\", \"value\": " << (event.value ? "true" : "false")
            << ", \"time\": " << event.time << "}";

        if (i + 1 != events.size()) out << ",";
        out << "\n";
    }
    out << "  ],\n";

    out << "  \"detectors\": [\n";
    for (size_t i = 0; i < detectors.size(); ++i) {
        const Detector& detector = detectors[i];

        out << "    {\"name\": \"" << detector.name
            << "\", \"value\": " << (detector.value ? "true" : "false")
            << ", \"position\": ";

        writeVec3(out, detector.position);

        out << ", \"time\": " << detector.time << "}";

        if (i + 1 != detectors.size()) out << ",";
        out << "\n";
    }
    out << "  ]\n";
    out << "}\n";
}

unsigned int parseValue(const char* text, unsigned int maximum) {
    const unsigned long value = std::stoul(text);

    if (value > maximum) {
        throw std::runtime_error(
            "Value must be between 0 and " + std::to_string(maximum) + "."
        );
    }

    return static_cast<unsigned int>(value);
}

int main(int argc, char* argv[]) {
    try {
        if (argc != 4) {
            std::cout
                << "usage: compile_add8 <A:0-255> <B:0-255> <threshold:0-511>\n";
            return 1;
        }

        const unsigned int aValue = parseValue(argv[1], 255);
        const unsigned int bValue = parseValue(argv[2], 255);
        const unsigned int threshold = parseValue(argv[3], 511);

        const std::string comparatorName = "GT_" + std::to_string(threshold);

        const Vec3 carryEmitter {1.0, 0.0, 0.0};
        const Vec3 outputWall {33.0, 0.0, 0.0};
        const Vec3 comparatorPosition {37.0, 0.0, 5.5};
        const Vec3 switchPosition {41.5, 0.0, 5.5};
        const Vec3 vaultGatePosition {47.0, 5.0, 0.0};
        const Vec3 falseExitPosition {47.0, -5.0, 0.0};

        addComponent("emitter", "CARRY_IN", carryEmitter);
        addComponent("output_wall", "READOUT_WALL", outputWall);
        addComponent("comparator", comparatorName, comparatorPosition);
        addComponent("optical_switch", "BRANCH_ROUTER", switchPosition);
        addComponent("vault_gate", "VAULT_GATE", vaultGatePosition);
        addComponent("branch_beacon", "LOCKED_EXIT", falseExitPosition);

        Signal carry {
            "CARRY_IN",
            false,
            carryEmitter,
            0.0,
            "#ffb000",
        };

        std::vector<Signal> readoutBits;

        for (int bit = 0; bit < 8; ++bit) {
            const double x = 4.0 + bit * 3.4;

            const Vec3 aEmitter {x, 3.0, 0.0};
            const Vec3 bEmitter {x, -3.0, 0.0};
            const Vec3 fullAdderPosition {x, 0.0, 0.0};
            const Vec3 sumDetector {
                33.0,
                0.0,
                1.0 + bit * 1.1,
            };

            const std::string suffix = std::to_string(bit);

            addComponent("emitter", "A_" + suffix, aEmitter);
            addComponent("emitter", "B_" + suffix, bEmitter);
            addComponent("full_adder", "FA_" + suffix, fullAdderPosition);
            addComponent("detector", "SUM_" + suffix, sumDetector);

            Signal a {
                "A_" + suffix,
                ((aValue >> bit) & 1u) == 1u,
                aEmitter,
                0.0,
                "#00e5ff",
            };

            Signal b {
                "B_" + suffix,
                ((bValue >> bit) & 1u) == 1u,
                bEmitter,
                0.0,
                "#ff35d3",
            };

            Signal aAtCell = route(a, fullAdderPosition, "A_" + suffix + "_to_FA");
            Signal bAtCell = route(b, fullAdderPosition, "B_" + suffix + "_to_FA");
            Signal carryAtCell = route(carry, fullAdderPosition, "carry_to_FA_" + suffix);

            FullAdderOutput output = fullAdder(
                "FA_" + suffix,
                fullAdderPosition,
                aAtCell,
                bAtCell,
                carryAtCell
            );

            readoutBits.push_back(
                detect(output.sum, "SUM_" + suffix, sumDetector)
            );

            carry = output.carry;
        }

        const Vec3 carryDetector {33.0, 0.0, 10.0};
        addComponent("detector", "CARRY_OUT", carryDetector);

        readoutBits.push_back(
            detect(carry, "CARRY_OUT", carryDetector)
        );

        std::vector<Signal> comparatorInputs;

        for (size_t bit = 0; bit < readoutBits.size(); ++bit) {
            comparatorInputs.push_back(
                route(
                    readoutBits[bit],
                    comparatorPosition,
                    "READOUT_" + std::to_string(bit) + "_to_" + comparatorName
                )
            );
        }

        Signal comparison = compareGreater(
            comparatorName,
            comparatorPosition,
            comparatorInputs,
            threshold
        );

        Signal decisionPulse {
            comparison.name + ".strobe",
            true,
            comparatorPosition,
            comparison.time,
            "#a882ff",
        };

        Signal pulseAtRouter = route(
            decisionPulse,
            switchPosition,
            comparatorName + "_to_BRANCH_ROUTER"
        );

        BranchOutput branch = opticalSwitch(
            "BRANCH_ROUTER",
            switchPosition,
            pulseAtRouter,
            comparison.value
        );

        activate(
            branch.whenTrue,
            "VAULT_GATE",
            vaultGatePosition
        );

        activate(
            branch.whenFalse,
            "LOCKED_EXIT",
            falseExitPosition
        );

        writeTrace(aValue, bValue, threshold);

        const unsigned int expectedResult = aValue + bValue;
        const bool expectedBranch = expectedResult > threshold;

        std::cout << "Compiled optical branch chamber\n";
        std::cout << "Program: if (" << aValue << " + " << bValue
            << " > " << threshold << ") vault.open()\n";
        std::cout << "Verifier: " << expectedResult
            << (expectedBranch ? " > " : " <= ") << threshold
            << " -> " << (expectedBranch ? "TRUE / VAULT OPEN" : "FALSE / LOCKED")
            << "\n";
        std::cout << "Trace written to ../viewer/adder_trace.json\n";

        return 0;
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << "\n";
        return 1;
    }
}