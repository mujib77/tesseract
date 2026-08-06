#include <iostream>
#include <cmath>

struct Vec3 {
    double x, y, z;

    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator*(double s) const { return {x * s, y * s, z * s}; }

    double dot(const Vec3& o) const { return x * o.x + y * o.y + z * o.z; }

    Vec3 normalize() const {
        double len = std::sqrt(x * x + y * y + z * z);
        return {x / len, y / len, z / len};
    }
};

struct Ray {
    Vec3 origin;
    Vec3 direction;
};

struct Mirror {
    Vec3 point;
    Vec3 normal;
};

struct TransistorCube {
    Vec3 point;
    Vec3 normal;
    bool state; 
};

double intersectPlane(const Ray& ray, const Mirror& mirror) {
    double denom = mirror.normal.dot(ray.direction);
    if (std::fabs(denom) < 1e-6) {
        return -1; 
    }
    double t = (mirror.point - ray.origin).dot(mirror.normal) / denom;    
    return (t > 1e-6) ? t : -1;
}

double intersectTransistor(const Ray& ray, const TransistorCube& cube) {
    if (!cube.state) {
        return -1; 
    }
    double denom = cube.normal.dot(ray.direction);
    if (std::fabs(denom) < 1e-6) {
        return -1;
    }
    double t = (cube.point - ray.origin).dot(cube.normal) / denom;
    return (t > 1e-6) ? t : -1;
}


Vec3 reflect(const Vec3& direction, const Vec3& normal) {
    double d = direction.dot(normal);
    return direction - normal * (2 * d);
}

void traceGate(bool A, bool B) {
    std::cout << "\n=== AND gate test: A=" << A << ", B=" << B << " ===\n";

    TransistorCube cubeA{ {5, 0, 0}, Vec3{-1, 1, 0}.normalize(), A };
    TransistorCube cubeB{ {5, 5, 0}, Vec3{-1, -1, 0}.normalize(), B };

    Ray beam{ {0, 0, 0}, Vec3{1, 0, 0}.normalize() };

    double tA = intersectTransistor(beam, cubeA);
    if (tA < 0) {
        std::cout << "Beam passed through cube A untouched -> gate output: 0 (FALSE)\n";
        return;
    }

    Vec3 hitA = beam.origin + beam.direction * tA;
    Vec3 dirAfterA = reflect(beam.direction, cubeA.normal);
    std::cout << "Beam hit cube A at (" << hitA.x << ", " << hitA.y << ", " << hitA.z << "), reflecting toward cube B\n";

    Ray afterA{ hitA, dirAfterA };
    double tB = intersectTransistor(afterA, cubeB);
    if (tB < 0) {
        std::cout << "Beam passed through cube B untouched -> gate output: 0 (FALSE)\n";
        return;
    }

    Vec3 hitB = afterA.origin + afterA.direction * tB;
    Vec3 dirAfterB = reflect(afterA.direction, cubeB.normal);
    std::cout << "Beam hit cube B at (" << hitB.x << ", " << hitB.y << ", " << hitB.z << ")\n";
    std::cout << "gate output: 1 (TRUE), exiting in direction (" << dirAfterB.x << ", " << dirAfterB.y << ", " << dirAfterB.z << ")\n";
}

int main() {
    Mirror mirror1{
        {5, 0, 0},               
        Vec3{-1, 1, 0}.normalize() 
    };

    Ray beam{
        {0, 0, 0},               
        Vec3{1, 0, 0}.normalize() 
    };

    double t = intersectPlane(beam, mirror1);

    if (t < 0) {
        std::cout << "MISS: beam never hit the mirror\n";
        return 0;
    }

    Vec3 hitPoint = beam.origin + beam.direction * t;
    Vec3 newDirection = reflect(beam.direction, mirror1.normal);

    std::cout << "HIT at (" << hitPoint.x << ", " << hitPoint.y << ", " << hitPoint.z << ")\n";
    std::cout << "New direction: (" << newDirection.x << ", " << newDirection.y << ", " << newDirection.z << ")\n";

    std::cout << "\n--- Transistor test (state=true) ---\n";
    TransistorCube gateA{ {5, 0, 0}, Vec3{-1, 1, 0}.normalize(), true };
    double t2 = intersectTransistor(beam, gateA);
    if (t2 < 0) {
        std::cout << "MISS: beam passed through (unexpected for state=true)\n";
    } else {
        Vec3 hit2 = beam.origin + beam.direction * t2;
        std::cout << "HIT at (" << hit2.x << ", " << hit2.y << ", " << hit2.z << ")\n";
    }

    std::cout << "\n--- Transistor test (state=false) ---\n";
    TransistorCube gateB{ {5, 0, 0}, Vec3{-1, 1, 0}.normalize(), false };
    double t3 = intersectTransistor(beam, gateB);
    if (t3 < 0) {
        std::cout << "PASS-THROUGH: beam ignored the cube (correct for state=false)\n";
    } else {
        std::cout << "unexpected hit\n";
    }
    traceGate(true, true);
    traceGate(true, false);
    traceGate(false, true);
    traceGate(false, false);

    return 0;
}