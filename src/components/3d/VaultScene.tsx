/**
 * 3D Vault Scene Component
 * 
 * A React Three Fiber scene with an animated bank vault door,
 * floating coins, and a glowing shield - representing security.
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Float, 
  Environment,
  Stars,
  Sparkles
} from '@react-three/drei';
import * as THREE from 'three';

// Animated spinning coin with more visible animation
function Coin({ position, delay = 0, scale = 1 }: { position: [number, number, number]; delay?: number; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      // Continuous spin around Y axis
      ref.current.rotation.y = state.clock.elapsedTime * 2 + delay;
      // Gentle bobbing motion
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.15;
      // Slight tilt for more 3D effect
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + delay) * 0.1;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 32]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={1} 
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Dollar sign on coin */}
      <mesh position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Credit card floating
function CreditCard({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 + (rotation?.[1] || 0);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={ref} position={position} rotation={rotation}>
        <boxGeometry args={[0.85, 0.54, 0.02]} />
        <meshStandardMaterial 
          color="#1e3a5f" 
          metalness={0.8} 
          roughness={0.2}
        />
        {/* Card chip */}
        <mesh position={[-0.2, 0.1, 0.015]}>
          <boxGeometry args={[0.12, 0.1, 0.01]} />
          <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} />
        </mesh>
      </mesh>
    </Float>
  );
}

// Glowing shield representing security with pulsing animation
function SecurityShield() {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle swaying motion
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      // Breathing scale effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      groupRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      // Pulsing glow
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  // Shield shape using custom geometry
  const shieldShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.7);
    shape.quadraticCurveTo(0.5, 0.6, 0.5, 0.2);
    shape.quadraticCurveTo(0.5, -0.4, 0, -0.6);
    shape.quadraticCurveTo(-0.5, -0.4, -0.5, 0.2);
    shape.quadraticCurveTo(-0.5, 0.6, 0, 0.7);
    return shape;
  }, []);

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Shield base */}
        <mesh ref={glowRef}>
          <extrudeGeometry args={[shieldShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }]} />
          <meshStandardMaterial 
            color="#0ea5e9" 
            metalness={0.8}
            roughness={0.2}
            emissive="#0ea5e9"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Inner glow ring */}
        <mesh position={[0, 0.05, 0.06]}>
          <ringGeometry args={[0.15, 0.25, 32]} />
          <meshStandardMaterial 
            color="#22c55e" 
            emissive="#22c55e" 
            emissiveIntensity={0.8}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* Check mark - horizontal part */}
        <mesh position={[-0.02, 0, 0.08]}>
          <boxGeometry args={[0.12, 0.04, 0.02]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
        </mesh>
        {/* Check mark - diagonal part */}
        <mesh position={[0.1, 0.1, 0.08]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.22, 0.04, 0.02]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

// Vault door with animated gears - more visible rotation
function VaultDoor() {
  const gearRef1 = useRef<THREE.Mesh>(null);
  const gearRef2 = useRef<THREE.Mesh>(null);
  const gearRef3 = useRef<THREE.Mesh>(null);
  const handleRef = useRef<THREE.Group>(null);
  const doorRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Gear rotations - faster and more visible
    if (gearRef1.current) {
      gearRef1.current.rotation.z = time * 1.5;
    }
    if (gearRef2.current) {
      gearRef2.current.rotation.z = -time * 2;
    }
    if (gearRef3.current) {
      gearRef3.current.rotation.z = time * 1.2;
    }
    
    // Handle wheel rotation
    if (handleRef.current) {
      handleRef.current.rotation.z = time * 0.3;
    }
    
    // Subtle door pulse
    if (doorRef.current) {
      doorRef.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }
  });

  // Create gear teeth geometry
  const createGear = (outerRadius: number, innerRadius: number, teeth: number) => {
    const shape = new THREE.Shape();
    const toothDepth = outerRadius - innerRadius;
    
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
      const afterAngle = ((i + 1) / teeth) * Math.PI * 2;
      
      if (i === 0) {
        shape.moveTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      }
      shape.lineTo(Math.cos(nextAngle) * innerRadius, Math.sin(nextAngle) * innerRadius);
      shape.lineTo(Math.cos(afterAngle) * outerRadius, Math.sin(afterAngle) * outerRadius);
    }
    shape.closePath();
    return shape;
  };

  return (
    <group ref={doorRef} position={[0, 0, -2.5]}>
      {/* Main vault door frame */}
      <mesh>
        <torusGeometry args={[1.4, 0.18, 16, 100]} />
        <meshStandardMaterial 
          color="#1e293b" 
          metalness={0.95} 
          roughness={0.2}
        />
      </mesh>
      
      {/* Door surface */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial 
          color="#334155" 
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Decorative gears with more prominent appearance */}
      <mesh ref={gearRef1} position={[-0.6, 0.5, 0.15]}>
        <extrudeGeometry args={[createGear(0.2, 0.15, 12), { depth: 0.03, bevelEnabled: false }]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.1} emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      
      <mesh ref={gearRef2} position={[0.6, -0.5, 0.15]}>
        <extrudeGeometry args={[createGear(0.15, 0.1, 10), { depth: 0.03, bevelEnabled: false }]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.1} emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      
      <mesh ref={gearRef3} position={[0.55, 0.55, 0.15]}>
        <extrudeGeometry args={[createGear(0.12, 0.08, 8), { depth: 0.03, bevelEnabled: false }]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.2} />
      </mesh>

      {/* Handle wheel - continuously rotating */}
      <group ref={handleRef} position={[0, 0, 0.22]}>
        <mesh>
          <torusGeometry args={[0.4, 0.05, 16, 50]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Handle spokes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <mesh key={i} rotation={[0, 0, (angle * Math.PI) / 180]}>
            <boxGeometry args={[0.8, 0.04, 0.04]} />
            <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.15} />
          </mesh>
        ))}
        {/* Center hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.08, 32]} />
          <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Glowing edge - pulsing */}
      <mesh position={[0, 0, 0.05]}>
        <ringGeometry args={[1.2, 1.28, 64]} />
        <meshStandardMaterial 
          color="#0ea5e9" 
          emissive="#0ea5e9" 
          emissiveIntensity={1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Lock bolts around the edge */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos((angle * Math.PI) / 180) * 1,
            Math.sin((angle * Math.PI) / 180) * 1,
            0.15
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// Animated network nodes (representing secure connections)
function NetworkNodes() {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      pts.push(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5 - 3
      ));
    }
    return pts;
  }, []);

  return (
    <group>
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Main scene component
function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, -5, 3]} intensity={0.5} color="#0ea5e9" />
      <spotLight 
        position={[0, 5, 5]} 
        angle={0.3} 
        penumbra={1} 
        intensity={1} 
        color="#fbbf24"
        castShadow
      />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
      {/* Sparkles for magic effect */}
      <Sparkles count={100} scale={10} size={2} speed={0.5} color="#0ea5e9" />

      {/* Main security shield */}
      <group position={[0, 0, 1]}>
        <SecurityShield />
      </group>

      {/* Vault door in background */}
      <VaultDoor />

      {/* Floating coins - more visible */}
      <Coin position={[-2.5, 0.8, 0.5]} delay={0} scale={1.2} />
      <Coin position={[2.5, -0.5, 0.8]} delay={1} scale={1} />
      <Coin position={[-1.8, -1, 0.3]} delay={2} scale={0.9} />
      <Coin position={[2, 1.2, -0.3]} delay={3} scale={1.1} />
      <Coin position={[0, -1.5, 1]} delay={4} scale={0.8} />
      <Coin position={[-2.8, -0.2, -0.5]} delay={5} scale={1} />

      {/* Floating credit cards */}
      <CreditCard position={[-2.5, 0, -1]} rotation={[0.2, 0.5, 0.1]} />
      <CreditCard position={[2.8, 0.5, -0.5]} rotation={[-0.1, -0.3, 0]} />

      {/* Network nodes */}
      <NetworkNodes />

      {/* Environment for reflections */}
      <Environment preset="city" />
    </>
  );
}

// Props for the VaultScene component
interface VaultSceneProps {
  className?: string;
  style?: React.CSSProperties;
}

// Main exported component
export default function VaultScene({ className, style }: VaultSceneProps) {
  return (
    <div className={className} style={{ 
      width: '100%', 
      height: '100%', 
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
      ...style 
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: true
        }}
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        frameloop="always"
        onCreated={(state) => {
          // Prevent context loss issues
          const canvas = state.gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost, attempting to restore...');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          });
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
