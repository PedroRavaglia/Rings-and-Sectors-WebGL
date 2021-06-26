
const canvas = document.querySelector('#canvas');
const gl = canvas.getContext('webgl');

if (!gl){
    console.log("Not ennable to run WebGL with this browser");
}

const regl = createREGL(canvas);

// Setting the size of canvas when loading the page to fully fit it
window.addEventListener('load', () => {
    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
})

// Resizing canvas when page is resized 
window.addEventListener('resize', () => {
    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
})



// regl instance where we will write the vertex and fragment shaders
const draw_RS = regl({
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
    uniform vec3 iMouse;
    
    #define PI 3.1416

    // Rings
    float sdCircle(in vec2 p) {
        return sin(u_rings * PI * length(p));
    }

    // Sectors
    float sdSector(in vec2 p) {
        return sin(atan(p.x, p.y) * u_sectors);
    }

    // min(Rings, Sectors)
    float sdMin(in vec2 p) {
        return min(sdSector(p), sdCircle(p));
    }

    // max(Rings, Sectors)
    float sdMax(in vec2 p) {
        return max(sdSector(p), sdCircle(p));
    }

    // Rings * Sectors
    float sdMul(in vec2 p) {
        return sdSector(p) * sdCircle(p);
    }

    // Rings + Sectors
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
    // and highlights the region close to the border.
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
        if (iMouse.z > 0.) {
            p.x = p.x - (iMouse.x - iResolution.x/2.0);
            p.y = p.y + (iMouse.y - iResolution.y/2.0);
        }
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
        iMouse: regl.prop('iMouse'),
        iResolution: regl.prop('iResolution'),
        iTime: regl.prop('iTime'),
        u_rings: regl.prop('u_rings'),
        u_sectors: regl.prop('u_sectors'),
        u_color: regl.prop('u_color'),
        u_combination: regl.prop('u_combination')

    },

    count: 6
});



// SETTING UI

let settings = {
    sectors: 4,
    rings: 3,
    color: 0,
    comb: 0
}
webglLessonsUI.setupUI(document.querySelector('#ui'), settings, [
    {type: 'slider', key: 'sectors', name: 'Sectors',    min: 1, max: 10, slide: (event, ui) => {settings.sectors = ui.value}},
    {type: 'slider', key: 'rings', name: 'Rings',        min: 1, max: 10, slide: (event, ui) => {settings.rings = ui.value}},
    {type: 'option', key: 'color', name: 'Color Scheme', options: ['Plain', 'Iq'], change: (event, ui) => {}},
    {type: 'option', key: 'comb', name: 'Combnation',    options: ['Rings', 'Sectors', 'Min', 'Max', 'Mul', 'Add'], change: (event, ui) => {console.log(settings.comb)}}
]);



// CANVAS EVENTS

// Variable that will contain the mouse coordinates in the canvas and if we will
// move the image (1) or not (0)
let iMouse = [0, 0, 0];

document.addEventListener('mousedown', (event) => {
    iMouse[0] = event.layerX;
    iMouse[1] = event.layerY;
    iMouse[2] = 1;
    
    // Change iMouse[2] to 0 when mouse is in the ui area of the canvas
    if (event.clientX > canvas.width - 300 && event.clientY < 160) {
        iMouse[2] = 0;
    }
})

document.addEventListener('mouseup', (event) => {
    iMouse[2] = 0;
})

document.addEventListener('mousemove', (event) => {
    iMouse[0] = event.layerX;
    iMouse[1] = event.layerY;
})

// Increase or decrease number of circles using the mouse wheel
document.addEventListener('mousewheel', (event) => {
    settings.rings -= event.wheelDelta/120;
})



// Drawing in the canvas with updated variables by frame
let now = Date.now();
regl.frame(() => {
    draw_RS({
        iMouse: iMouse,
        iResolution: [canvas.width, canvas.height],
        iTime: Math.abs((Date.now() - now)/500),
        u_rings: settings.rings, 
        u_sectors: settings.sectors,
        u_color: settings.color,
        u_combination: settings.comb
    });
});