'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Text3D, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Event {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage: string;
  voiceMessage: string;
  images: string[];
  latitude: number;
  longitude: number;
  createdBy: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
  categories: string[];
  creatorName?: string;
}

// 3D Floating Event Title Component
function FloatingTitle({ title }: { title: string }) {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Center>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.5}
          height={0.1}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {title}
          <meshStandardMaterial color="#9333ea" metalness={0.5} roughness={0.2} />
        </Text3D>
      </Center>
    </Float>
  );
}

// 3D Category Tags Component
function CategoryTags({ categories }: { categories: string[] }) {
  return (
    <group position={[0, -1, 0]}>
      {categories.map((category, index) => (
        <Float key={index} speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
          <Center position={[index * 2 - (categories.length - 1), 0, 0]}>
            <Text3D
              font="/fonts/helvetiker_regular.typeface.json"
              size={0.2}
              height={0.05}
              curveSegments={12}
              bevelEnabled
              bevelThickness={0.01}
              bevelSize={0.01}
              bevelOffset={0}
              bevelSegments={5}
            >
              {category}
              <meshStandardMaterial color="#a855f7" metalness={0.3} roughness={0.4} />
            </Text3D>
          </Center>
        </Float>
      ))}
    </group>
  );
}

export default function Scene({ event }: { event: Event }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <FloatingTitle title={event.eventName} />
      {event.categories && <CategoryTags categories={event.categories} />}
      <OrbitControls enableZoom={false} />
      <Environment preset="city" />
    </Canvas>
  );
} 