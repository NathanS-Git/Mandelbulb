#version 330 core
layout(location = 0) out vec4 frag_colour;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_zoom;


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


float mandelbulb_distance_estimator(vec3 pos) {
    float power = 8.0;
    int iterations = 64;
    float bailout = 2.0;
    
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < iterations; i++) {
        r = length(z);
        if (r>bailout) break;

        float theta = acos(z.z/r);
        float phi = atan(z.y,z.x);
        dr = pow(r, power-1.0)*power*dr + 1.0;

        float zr = pow(r, power);
        theta = theta*power;
        phi = phi*power;

        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        z += pos;
    }

    return 0.5*log(r)*r/dr;
}

void sphere_fold(inout vec3 z, inout float dz) {
    float fixed_radius2 = 1.0 * 1.0;
    float min_radius2 = 0.5 * 0.5;
    
    float r2 = dot(z,z);
    if (r2 < min_radius2) {
        float temp = (fixed_radius2/min_radius2);
        z *= temp;
        dz *= temp;
    } else if (r2 <fixed_radius2) {
        float temp = (fixed_radius2/r2);
        z *= temp;
        dz *= temp;
    }
}

void box_fold(inout vec3 z, inout float dz) {
    float folding_limit = 0.5;
    z = clamp(z, -folding_limit, folding_limit) * 2.0 - z;
}

float mandelbox_distance_estimator(vec3 z) {
    int iterations = 64;
    float scale = 1.5;

    vec3 offset = z;
    float dr = 1.0;
    for (int n=0; n< iterations; n++) {
        box_fold(z,dr);
        sphere_fold(z,dr);

        z = scale*z + offset;
        dr = dr*abs(scale)+1.0;
    }
    float r = length(z);
    return r/abs(dr);
}

float ray_march(vec3 from, vec3 direction) {
    float total_distance = 0.0;
    int steps;

    int maximum_ray_steps = 100;
    float minimum_distance = 0.0001;

    for (steps=0; steps < maximum_ray_steps; steps++) {
        vec3 p = from + total_distance * direction;
        float dist = mandelbulb_distance_estimator(p);
        total_distance += dist;
        if (dist < minimum_distance) break;
    }

    float ratio = float(steps)/float(maximum_ray_steps);

    return 1.0-ratio;
}

void main() {

    float camera_distance = 5.0;

    float aspect_ratio = u_resolution.x/u_resolution.y;

    vec2 normalized_coords = (gl_FragCoord.xy/u_resolution.xy*vec2(aspect_ratio,1))-vec2(aspect_ratio/2,0.5);

    vec3 from = vec3(normalized_coords*(-u_zoom)*0.1, -camera_distance+u_zoom*0.1);
    vec3 direction = normalize(vec3(normalized_coords, 1.0))*1.0;

    vec4 quaternion_y = vec4(cos(u_mouse.y/u_resolution.y/2), 0, 0, sin(u_mouse.y/u_resolution.y/2));
    vec4 quaternion_x = vec4(cos(u_mouse.x/u_resolution.x/2), 0, sin(u_mouse.x/u_resolution.x/2), 0);
    vec4 quaternion = multiply_quaternions(quaternion_x, quaternion_y);

    vec3 new_from = rotate_by_quaternion(quaternion, from);
    vec3 new_direction = rotate_by_quaternion(quaternion, direction);

    float colour = ray_march(new_from, new_direction);
    frag_colour = vec4(vec3(colour), 1.0);
}
