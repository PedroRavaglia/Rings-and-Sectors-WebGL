
const canvas = document.querySelector('#glcanvas');
const gl = canvas.getContext('webgl');

if (!gl){
    console.log("Not ennable to run WebGL with this browser");
}

const regl = createREGL(canvas);

const draw = regl({
    vert: `
    attribute vec2 position;
        void main () {
        gl_Position = vec4(position, 0, 1);
    }`,

    frag: `
    precision mediump float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform float u_rings, u_sectors, u_color, u_combination;
    // uniform int iFrame;
    // uniform vec4 iMouse;
    
    #define PI 3.1416

    // Anéis
    float sdCircle(in vec2 p) {
        return sin(u_rings * PI * length(p));
    }

    // Setores
    float sdSector(in vec2 p) {
        return sin(atan(p.x, p.y) * u_sectors);
    }

    // min(Anéis, Setores)
    float sdMin(in vec2 p) {
        return min(sdSector(p), sdCircle(p));
    }

    // max(Anéis, Setores)
    float sdMax(in vec2 p) {
        return max(sdSector(p), sdCircle(p));
    }

    // Anéis * Setores
    float sdMul(in vec2 p) {
        return sdSector(p) * sdCircle(p);
    }

    // Anéis + Setores
    float sdAdd(in vec2 p) {
        return sdSector(p) + sdCircle(p);
    }

    float signedDistance(in vec2 p) {
        vec3 comb_1 = vec3(sdCircle(p), sdSector(p), sdMin(p)); // [0, 1, 2]
        vec3 comb_2 = vec3(sdMax(p), sdMul(p), sdAdd(p));       // [3, 4, 5]
        
        for(int i=0; i<6; i++) {
            if(i<3 && int(u_combination) == i) return comb_1[i];

            if(i>2 && int(u_combination) == i) return comb_2[i-3];
        }
    }

    // Inigo Quilez's coloring scheme for a distance function. Draws isolines
    // and highlights the region close to the border. Nice!
    vec3 iqcolor(in float d) {
        vec3 col = vec3(1.0) - sign(d)*vec3(0.1, 0.4, 0.7);
        col *= 1.0 - exp(-5.0 * abs(d));
        float c = abs(cos(20.0*d + iTime));
        col *= 0.7 + 0.3 * pow(c, 10.);
        return col;
    }

    // Simple coloring scheme for distance d: white inside and orange outside
    vec3 plainColor(in float d){
        return vec3(1.0) - sign(d)*vec3(0.1, 0.4, 0.7);
    }

    vec3 color (in float d) {
        return iqcolor(d)*u_color + plainColor(d)*(1.0 - u_color);
    }

    void main() {
        // Translate coordinates to center of screen and normalize to range [-1..1]
        vec2 p = gl_FragCoord.xy;
        // if (iMouse.z > 0.) p = p - (iMouse.xy - iResolution.xy/2.0);
        p = (2.0*p - iResolution.xy) / iResolution.y;
        
        // Compute signed distance to the shape and offset it
        float d = signedDistance(p);
        
        // Coloring
        vec3 col = color(d);
        
        gl_FragColor = vec4(col, 1.0); 
    }`,

    attributes: {
        position: [[-1, -1], [1, -1], [1, 1], [1, 1], [-1, 1], [-1, -1]]
    },

    uniforms: {
        iResolution: [canvas.width, canvas.height],
        iTime: regl.prop('iTime'),
        // iTime: Math.abs(Date.now() /10.0),
        u_rings: regl.prop('u_rings'),
        u_sectors: regl.prop('u_sectors'),
        u_color: regl.prop('u_color'),
        u_combination: regl.prop('u_combination')

    },

    count: 6
});

let now = Date.now();

regl.frame(() => {
    draw({
        iTime: Math.abs((Date.now() - now)/500),
        u_rings: parseFloat(+document.querySelector('#rings').value),
        u_sectors: parseFloat(+document.querySelector('#sectors').value),
        u_color: parseFloat(+document.querySelector('#color').value),
        u_combination: parseFloat(+document.querySelector('#comb').value)
    });
});