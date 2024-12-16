const commonShader = `
    mat4 identity() {
        return mat4(
            1., 0., 0., 0.,
            0., 1., 0., 0.,
            0., 0., 1., 0.,
            0., 0., 0., 1.
        );
    }
    
    mat4 yzAndInverse() { // we want to flip the y and z coords, and invert them to make the new position as if the camera is viewing from the top of the book
        return mat4(
            1. / screenRatio, 0., 0., 0., // take in account the screen ratio, so that the comics doesn't fill up the entire screen when in screen space mode
            0., 0., -1., 0.,
            0., -1., 0., 0.,
            0., 0., 0., 1.
        );
    }
    
    mat4 lerpMatrix(mat4 a, mat4 b, float t) {
        mat4 res = mat4(0.);
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                res[i][j] = mix(a[i][j], b[i][j], t);
            }
        }
        return res;
    }
    
    float remap01(float x, float low, float high) {
        return clamp((x - low) / (high - low), 0., 1.);
    }
            
    float remap(float x, float lowIn, float highIn, float lowOut, float highOut) {
        return mix(lowOut, highOut, remap01(x, lowIn, highIn));
    }
`;

export const fragmentShader = `
    varying vec2 vUv;
    varying float initialNormalY;
    
    uniform sampler2D comicTextureFront;
    uniform sampler2D comicTextureBack;

    void main() {
        vec3 col = vec3(0.);
        
        vec2 uv = vUv;
        if (initialNormalY < 0.) {
            uv = vec2(1.) - uv; // make the bottom side of the cube have inverse uv, so that the comics look upright on the flip side
            col += texture2D(comicTextureBack, uv).rgb; // also have a different comic texture on the flip side
        } else {
            col += texture2D(comicTextureFront, uv).rgb;
        }

        gl_FragColor = vec4(col, 1.);
    }
`;

export const vertexShader = `
    #define PI 3.14159
    
    uniform float matrixT;
    
    uniform int division;
    uniform float segmentLength;
    uniform float bendAngle;
    uniform float rotateAngle;
    
    uniform float minX;
    uniform float maxX;
    
    uniform float yOffset;
    uniform float xOffset;
    
    uniform float screenRatio;
    ${commonShader}
    
    varying vec2 vUv;
    varying float initialNormalY;

    void main() {
        vUv = uv;
        initialNormalY = normal.y;
        
        float a = bendAngle / float(division); // the inverse-y flipping direction
        float a2 = -bendAngle / float(division); // this is the physically correct flipping direction
        float l = segmentLength;
        vec3 vPosition = position;
        
        // float operations = ceil(uv.x * float(division)); // this only works with plane, since it only has 1 uv, which is [0., 1.] from left to right
        float amount = remap(position.x, minX, maxX, 0., 1.);
        float operations = ceil(amount * float(division)); // but for a box geometry, we actually need to be clever, and compare the position.x with the min and max x position to determine how much angle each vertex needs to bend

        for (float i = 0.; i < operations; i++) {
            // vPosition += vec3(-(l - l * cos(i * a + rotateAngle)), l * sin(i * a + rotateAngle), 0.);
            vPosition += vec3(-(l - l * cos(i * a2 + rotateAngle)), l * sin(i * a2 + rotateAngle), 0.);
        }
        
        float offsetY = mix(yOffset, -yOffset, rotateAngle / PI);
        vPosition.y += offsetY;
        float offsetX = mix(xOffset, -xOffset, rotateAngle / PI);
        vPosition.x += offsetX;

        mat4 tt = lerpMatrix(projectionMatrix * modelViewMatrix, yzAndInverse(), matrixT);
        gl_Position = tt * vec4(vPosition, 1.);
    }
`;
