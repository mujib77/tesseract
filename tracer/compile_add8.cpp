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

void detect(const Signal& signal, const std::string& name, Vec3 position) {
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
}

void writeVec3(std::ofstream& out, const Vec3& v) {
    out << "[" << v.x << ", " << v.y << ", " << v.z << "]";
}

void writeTrace(unsigned int a, unsigned int b) {
    std::ofstream out("../viewer/adder_trace.json");
    out << std::fixed << std::setprecision(3);

    out << "{\n";
    out << "  \"title\": \"8-bit optical addition chamber\",\n";
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

unsigned int parseByte(const char* text) {
    const unsigned long value = std::stoul(text);

    if (value > 255) {
        throw std::runtime_error("This first chamber accepts values from 0 to 255.");
    }

    return static_cast<unsigned int>(value);
}

int main(int argc, char* argv[]) {
    try {
        if (argc != 3) {
            std::cout << "usage: compile_add8 <A:0-255> <B:0-255>\n";
            return 1;
        }

        const unsigned int aValue = parseByte(argv[1]);
        const unsigned int bValue = parseByte(argv[2]);

        const Vec3 carryEmitter {1.0, 0.0, 0.0};

        addComponent("emitter", "CARRY_IN", carryEmitter);
        const Vec3 outputWall {33.0, 0.0, 0.0};
        addComponent("output_wall", "READOUT_WALL", outputWall);

        Signal carry {
            "CARRY_IN",
            false,
            carryEmitter,
            0.0,
            "#ffb000",
        };

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

            detect(output.sum, "SUM_" + suffix, sumDetector);

            carry = output.carry;
        }

        const Vec3 carryDetector {33.0, 0.0, 10.0};
        addComponent("detector", "CARRY_OUT", carryDetector);
        detect(carry, "CARRY_OUT", carryDetector);

        writeTrace(aValue, bValue);

        std::cout << "Compiled optical addition chamber\n";
        std::cout << aValue << " + " << bValue
            << " = " << (aValue + bValue) << "\n";
        std::cout << "Trace written to ../viewer/adder_trace.json\n";

        return 0;
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << "\n";
        return 1;
    }
}