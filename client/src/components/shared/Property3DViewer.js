import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Property3DViewer = ({ modelPath, propertyTitle, onClose }) => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);
    
    // CAMERA
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // MODEL LOADER (GLTF)
    const loadModel = () => {
      if (modelPath && (modelPath.endsWith('.glb') || modelPath.endsWith('.gltf'))) {
        const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
        const loader = new GLTFLoader();
        
        // Ensure path is absolute for localhost
        const fullPath = modelPath.startsWith('http') ? modelPath : `http://localhost:5000/${modelPath}`;
        
        loader.load(
          fullPath,
          (gltf) => {
            scene.add(gltf.scene);
            
            // Center model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.sub(center);
            gltf.scene.position.y += (box.max.y - box.min.y) / 2;
            
            setLoading(false);
          },
          (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
          },
          (error) => {
            console.error('An error happened', error);
            setError('Failed to load 3D model. Falling back to preview.');
            addPlaceholder();
          }
        );
      } else {
        addPlaceholder();
      }
    };

    const addPlaceholder = () => {
      // PLACEHOLDER HOUSE
      const group = new THREE.Group();

      // Floor
      const floorGeo = new THREE.PlaneGeometry(10, 10);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      group.add(floor);

      // Base
      const baseGeo = new THREE.BoxGeometry(5, 3, 5);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x667eea });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 1.5;
      group.add(base);

      // Roof
      const roofGeo = new THREE.ConeGeometry(4, 2, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x764ba2 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 4;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);

      scene.add(group);
      setLoading(false);
    };

    loadModel();

    // ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // RESIZE HANDLER
    const handleResize = () => {
      if(!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // CLEANUP
    return () => {
      window.removeEventListener('resize', handleResize);
      if(mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [modelPath]);

  return (
    <div className="property-3d-viewer-modal">
      <div className="viewer-container">
        <div className="viewer-header">
          <h3>3D View: {propertyTitle}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="viewer-content" ref={mountRef}>
          {loading && <div className="viewer-loading">Initializing 3D Environment...</div>}
          {error && <div className="viewer-error">{error}</div>}
        </div>
        <div className="viewer-footer">
          <p>🖱️ Left Click: Rotate | 🛠️ Right Click: Pan | 📜 Scroll: Zoom</p>
        </div>
      </div>
      <style>{`
        .property-3d-viewer-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .viewer-container {
          width: 80%;
          height: 80%;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .viewer-header {
          padding: 15px 25px;
          background: #f8f9fa;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .viewer-header h3 { margin: 0; color: #2c3e50; }
        .close-btn { 
          background: none; border: none; font-size: 24px; cursor: pointer; color: #999;
          transition: color 0.2s;
        }
        .close-btn:hover { color: #ff4757; }
        .viewer-content { flex: 1; position: relative; cursor: move; }
        .viewer-loading, .viewer-error {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-weight: 600; color: #666;
        }
        .viewer-footer {
          padding: 10px; background: #2c3e50; color: white; text-align: center; font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default Property3DViewer;
