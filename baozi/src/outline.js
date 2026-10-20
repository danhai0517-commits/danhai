import * as THREE from 'three';

// Depth + colour edge detection drawn over the toon-shaded scene for an inked, hand-drawn look.
export class OutlinePass {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = true;
    this.target = new THREE.WebGLRenderTarget(2, 2, { samples: 4, depthTexture: new THREE.DepthTexture(2, 2, THREE.UnsignedInt248Type), depthBuffer: true, stencilBuffer: true });
    this.target.depthTexture.format = THREE.DepthStencilFormat;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture }, resolution: { value: new THREE.Vector2(1, 1) },
        cameraNear: { value: camera.near }, cameraFar: { value: camera.far }, ink: { value: new THREE.Color('#3a2014') }, thickness: { value: 1.2 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `#include <packing>
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 resolution; uniform float cameraNear; uniform float cameraFar; uniform vec3 ink; uniform float thickness; varying vec2 vUv;
        float depthAt(vec2 uv){ float z=texture2D(tDepth,uv).x; return -perspectiveDepthToViewZ(z,cameraNear,cameraFar); }
        float luma(vec3 c){ return dot(c,vec3(0.299,0.587,0.114)); }
        void main(){
          vec2 px=thickness/resolution; vec4 base=texture2D(tColor,vUv);
          float d=depthAt(vUv);
          float dl=depthAt(vUv-vec2(px.x,0.0)), dr=depthAt(vUv+vec2(px.x,0.0)), du=depthAt(vUv+vec2(0.0,px.y)), dd=depthAt(vUv-vec2(0.0,px.y));
          float edge=max(max(abs(d-dl),abs(d-dr)),max(abs(d-du),abs(d-dd)));
          float depthEdge=smoothstep(0.012,0.03,edge/d);
          vec3 cl=texture2D(tColor,vUv-vec2(px.x,0.0)).rgb, cr=texture2D(tColor,vUv+vec2(px.x,0.0)).rgb, cu=texture2D(tColor,vUv+vec2(0.0,px.y)).rgb, cd=texture2D(tColor,vUv-vec2(0.0,px.y)).rgb;
          float cEdge=max(max(length(base.rgb-cl),length(base.rgb-cr)),max(length(base.rgb-cu),length(base.rgb-cd)));
          float colorEdge=smoothstep(0.42,0.8,cEdge)*0.55;
          float far=clamp((d-30.0)/50.0,0.0,1.0);
          float o=clamp(depthEdge+colorEdge,0.0,1.0)*(1.0-far*0.7);
          vec3 col=mix(base.rgb,ink*mix(1.0,luma(base.rgb)+0.25,0.35),o*0.88);
          gl_FragColor=vec4(col,1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quadScene = new THREE.Scene(); this.quadScene.add(this.quad); this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) { this.target.setSize(w, h); this.material.uniforms.resolution.value.set(w, h); }
  render() {
    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    this.material.uniforms.cameraNear.value = this.camera.near; this.material.uniforms.cameraFar.value = this.camera.far;
    this.renderer.setRenderTarget(this.target); this.renderer.render(this.scene, this.camera); this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }
}
