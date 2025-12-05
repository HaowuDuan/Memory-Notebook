import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleCanvasProps {
  imageUrl: string | null;
  isActive: boolean;
  audioLevel: number; // 0 to 1
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ imageUrl, isActive, audioLevel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number>(0);
  
  // Animation State
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  // Generate a soft circle texture programmatically
  const getSpriteMaterial = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.PointsMaterial({
      size: 0.15,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Important for transparency overlap
    });
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002); // Deep fading fog
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // HANDLE RESIZE
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Particles based on Image
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Cleanup old particles
    if (particlesRef.current) {
      scene.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      (particlesRef.current.material as THREE.Material).dispose();
      particlesRef.current = null;
    }

    const createParticles = (img?: HTMLImageElement) => {
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const colors: number[] = [];

      if (img) {
        // --- IMAGE MODE ---
        const width = 200; // Resolution of point cloud
        const height = Math.floor(width * (img.height / img.width));
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i] / 255;
            const g = data[i+1] / 255;
            const b = data[i+2] / 255;
            const a = data[i+3];

            if (a > 50 && (r+g+b) > 0.1) { // Skip dark/transparent pixels
              // Center the positions
              const pX = (x - width / 2) * 0.2;
              const pY = -(y - height / 2) * 0.2; // Invert Y for 3D
              
              // Z displacement based on brightness (Relief effect)
              const brightness = (r + g + b) / 3;
              const pZ = (brightness - 0.5) * 10; 

              vertices.push(pX, pY, pZ);
              colors.push(r, g, b);
            }
          }
        }
      } else {
        // --- LANDING MODE: Deep Starfield ---
        const particleCount = 2000;
        for (let i = 0; i < particleCount; i++) {
          const x = (Math.random() - 0.5) * 150;
          const y = (Math.random() - 0.5) * 150;
          const z = (Math.random() - 0.5) * 100;
          vertices.push(x, y, z);
          
          // Bluish / White memory color
          colors.push(0.8, 0.9, 1);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const material = getSpriteMaterial();
      // Adjust size based on mode
      material.size = img ? 0.3 : 0.6; 

      const points = new THREE.Points(geometry, material);
      scene.add(points);
      particlesRef.current = points;
    };

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;
      img.onload = () => createParticles(img);
    } else {
      createParticles();
    }
  }, [imageUrl]);

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const time = Date.now() * 0.0005;

        // Smooth Mouse Rotation
        targetRotationRef.current.x += (mouseRef.current.x - targetRotationRef.current.x) * 0.05;
        targetRotationRef.current.y += (mouseRef.current.y - targetRotationRef.current.y) * 0.05;

        // Orbit Logic
        if (particlesRef.current) {
          // Rotate the entire cloud gently
          particlesRef.current.rotation.y = time * 0.1 + targetRotationRef.current.x * 0.5;
          particlesRef.current.rotation.x = targetRotationRef.current.y * 0.2;
          
          // Audio Reactivity (Breathing Scale)
          // Smoothly interpolate scale for organic feel
          const targetScale = 1 + (audioLevel * 0.3);
          const currentScale = particlesRef.current.scale.x;
          const newScale = currentScale + (targetScale - currentScale) * 0.1;
          
          particlesRef.current.scale.set(newScale, newScale, newScale);
        }

        // Camera Drift
        cameraRef.current.position.x = Math.sin(time * 0.5) * 2;
        cameraRef.current.position.y = Math.cos(time * 0.3) * 2;
        cameraRef.current.lookAt(0, 0, 0);

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => cancelAnimationFrame(frameIdRef.current);
  }, [audioLevel]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Normalize mouse position -1 to 1
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseRef.current = { x, y };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default ParticleCanvas;