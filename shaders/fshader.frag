#version 330 core
layout(location = 0) out vec4 FragColour;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_zoom;


#define fractal(function, z, c) \
while( dot(z,z) <= smoothness*smoothness && iteration < max_iteration) { \
    z = function(z,c); \
    iteration += 1; \
}


vec3 rotate_by_quaternion(vec4 q, vec3 v) {
    return v+2.0*cross(q.xyz,cross(q.xyz, v) + q.w*v);
}

vec4 multiply_quaternions(vec4 q1, vec4 q2) {
    vec4 q;
    q.x = (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y);
    q.y = (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x);
    q.z = (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w);
    q.w = (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z);
    return q;
}


float DistanceEstimator(vec3 pos) {
    float Power = 8.0;
    int Iterations = 100;
    float Bailout = 3.0;
    
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

void sphereFold(inout vec3 z, inout float dz) {
    float fixedRadius2 = 1.0 * 1.0;
    float minRadius2 = 0.5 * 0.5;
    
    float r2 = dot(z,z);
    if (r2<minRadius2) {
        float temp = (fixedRadius2/minRadius2);
        z *= temp;
        dz *= temp;
    } else if (r2<fixedRadius2) {
        float temp = (fixedRadius2/r2);
        z *= temp;
        dz *= temp;
    }
}

void boxFold(inout vec3 z, inout float dz) {
    float foldingLimit = 1.0;
    z = clamp(z, -foldingLimit, foldingLimit) * 2.0 - z;
}

float DE(vec3 z) {
    int Iterations = 64;
    float Scale = 2.0;

    vec3 offset = z;
    float dr = 1.0;
    for (int n=0; n< Iterations; n++) {
        boxFold(z,dr);
        sphereFold(z,dr);

        z = Scale*z + offset;
        dr = dr*abs(Scale)+1.0;
    }
    float r = length(z);
    return r/abs(dr);
}

float ray_march(vec3 from, vec3 direction) {
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

    vec2 normalizedCoords = ((gl_FragCoord.xy/u_resolution.xy)*1.0)-0.5;

    vec3 from = vec3(normalizedCoords*(-u_zoom)*0.1, -2.0);
    vec3 direction = vec3((normalizedCoords), 1.0);

    vec4 quaternionY = vec4(cos(u_mouse.y/u_resolution.y/2), 0, 0, sin(u_mouse.y/u_resolution.y/2));
    vec4 quaternionX = vec4(cos(u_mouse.x/u_resolution.x/2), 0, sin(u_mouse.x/u_resolution.x/2), 0);
    vec4 quaternion = multiply_quaternions(quaternionX, quaternionY);


    vec3 newFrom = rotate_by_quaternion(quaternion, from);
    vec3 newDirection = rotate_by_quaternion(quaternion, direction);

    float colour = ray_march(newFrom, newDirection);
    FragColour = vec4(vec3((sin(colour*1.0)*0.5)+0.5), 1.0);
}