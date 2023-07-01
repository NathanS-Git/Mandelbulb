#version 330 core
layout(location = 0) out vec4 FragColour;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_zoom;

// Complex multiply
vec2 cmul(in vec2 c, in vec2 z) {
    return vec2(c.x*z.x-c.y*z.y, c.x*z.y+c.y*z.x);
}

// Brings a complex number to an arbitrary power
vec2 cpow(in vec2 c, in float p) {
    float r = sqrt(c.x*c.x+c.y*c.y);
    float theta = atan(c.y/c.x);
    return pow(r,p)*vec2(cos(p*theta),sin(p*theta));
}

// Complex square
vec2 csqr(in vec2 c) {
    return cmul(c,c);
}

// Complex conjugate
vec2 cconj(in vec2 c){
    return c*vec2(1,-1);
}


// Fractal functions
vec2 mandelbrot(in vec2 z, in vec2 c) {
    return csqr(z)+c;
}

vec2 tricorn(in vec2 z, in vec2 c) {
    return csqr(cconj(z))+c;
}

vec2 burning_ship(in vec2 z, in vec2 c) {
    return vec2(z.x*z.x - z.y*z.y, 2.0*abs(z.x*z.y))+c;
}


#define fractal(function, z, c) \
while( dot(z,z) <= smoothness*smoothness && iteration < max_iteration) { \
    z = function(z,c); \
    iteration += 1; \
}


float DistanceEstimator(vec3 pos) {
    float Power = 8.0;
    int Iterations = 64;
    float Bailout = 50.0;
    
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < Iterations; i++) {
        r = length(z);
        if (r>Bailout) break;

        float theta = acos(z.z/r);
        float phi = atan(z.y,z.x);
        dr = pow(r, Power-1.0)*Power*dr + 1.0;

        float zr = pow(r, Power);
        theta = theta*Power;
        phi = phi*Power;

        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        z += pos;
    }

    return 0.5*log(r)*r/dr;
}

float trace(vec3 from, vec3 direction) {
    float totalDistance = 0.0;
    int steps;

    int MaximumRaySteps = 100;
    float MinimumDistance = 0.0001;

    for (steps=0; steps < MaximumRaySteps; steps++) {
        vec3 p = from + totalDistance * direction;
        float dist = DistanceEstimator(p);
        totalDistance += dist;
        if (dist < MinimumDistance) break;
    }
    return 1.0-float(steps)/float(MaximumRaySteps);
}

void main() {

    float aspect_ratio = u_resolution.x/u_resolution.y;

    vec2 normalizedCoords = ((gl_FragCoord.xy/u_resolution.xy)*2.0)-1.0;

    vec3 colour = vec3(trace(vec3(normalizedCoords, -1.0+u_zoom), vec3(normalizedCoords, 1.0+u_zoom)));
    FragColour = vec4(colour, 1.0);
}