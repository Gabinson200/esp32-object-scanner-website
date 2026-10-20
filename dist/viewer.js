import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js';

export function createViewer(host) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(0xf9faf6,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label','Interactive 3D preview of the generated marker board');
  renderer.domElement.setAttribute('role','img');host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,0.1,3000);
  scene.add(new THREE.HemisphereLight(0xffffff,0xc1c8b5,2.8));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(30,160,70);scene.add(light);
  const grid=new THREE.GridHelper(200,40,0xbac8b0,0xdfe5d7);grid.position.y=-0.2;grid.material.transparent=true;grid.material.opacity=0.45;scene.add(grid);
  const root=new THREE.Group();root.rotation.x=-Math.PI/2;scene.add(root);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minPolarAngle=.05;controls.maxPolarAngle=Math.PI/2-.02;
  let size=80,active=true;
  function reset(){camera.position.set(size*1.18,size*1.35,size*1.6);controls.target.set(0,1,0);controls.minDistance=size*.6;controls.maxDistance=size*6;controls.update();}
  function update(meshes){
    for(const child of [...root.children]){root.remove(child);child.geometry.dispose();child.material.dispose();}
    const {width,height}=meshes.layout;size=Math.max(width,height);
    for(const [color,triangles] of [[0xf7f7ef,meshes.white],[0x101612,meshes.black]]) {
      const positions=new Float32Array(triangles.length*9);let i=0;
      for(const tri of triangles)for(const v of tri){positions[i++]=v[0]-width/2;positions[i++]=v[1]-height/2;positions[i++]=v[2];}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();
      root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9,metalness:0})));
    }
    grid.scale.setScalar(size/80);reset();
  }
  const observer=new ResizeObserver(()=>{
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  });observer.observe(host);
  const visibility=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;});visibility.observe(host);
  renderer.setAnimationLoop(()=>{if(active&&!document.hidden){controls.update();renderer.render(scene,camera);}});
  return {update,reset};
}
