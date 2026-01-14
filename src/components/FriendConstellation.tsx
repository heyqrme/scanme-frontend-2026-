import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Friend } from '../utils/friends-store';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useWindowSize } from 'react-use';
import { Skeleton } from '@/components/ui/skeleton';
import * as THREE from 'three';

// Polyfill AFRAME and THREE to prevent crash in react-force-graph dependencies (like aframe-extras)
// which expect these to be globally defined.
if (typeof window !== 'undefined') {
  // Create a mutable copy of THREE because the namespace import is frozen
  const mutableTHREE = { ...THREE };

  // Force assignment to ensure we have a mutable version, even if HMR/previous runs left a frozen one
  (window as any).THREE = mutableTHREE;

  if (!(window as any).AFRAME) {
    (window as any).AFRAME = {
      registerComponent: () => {},
      registerGeometry: () => {},
      registerShader: () => {},
      registerSystem: () => {},
      registerPrimitive: () => {},
      registerElement: () => {},
      THREE: mutableTHREE,
      // Add storage objects checking for existence
      components: {},
      systems: {},
      geometries: {},
      primitives: {},
      shaders: {},
      utils: {
        device: {
          isMobile: () => false,
          isTablet: () => false,
          checkHeadsetConnected: () => false,
          checkVRSupport: () => false,
        },
        styleParser: {
          parse: () => {},
        },
      },
    };
  } else {
     // Ensure AFRAME also uses the mutable THREE
    (window as any).AFRAME.THREE = mutableTHREE;
    
    // Ensure storage objects exist if AFRAME was already defined but incomplete
    const aframe = (window as any).AFRAME;
    if (!aframe.components) aframe.components = {};
    if (!aframe.systems) aframe.systems = {};
    if (!aframe.geometries) aframe.geometries = {};
    if (!aframe.primitives) aframe.primitives = {};
    if (!aframe.shaders) aframe.shaders = {};
  }
}

// Lazy load ForceGraph2D to avoid A-Frame dependency issues on initial load
// react-force-graph might try to initialize VR components (needing AFRAME) when imported
const ForceGraph2D = React.lazy(() => 
  import('react-force-graph').then(module => ({ default: module.ForceGraph2D }))
);

interface FriendConstellationProps {
  friends: Friend[];
  currentUser: User | null;
  height?: number;
}

export function FriendConstellation({ friends, currentUser, height = 400 }: FriendConstellationProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>();
  const [width, setWidth] = useState(800);
  
  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (!currentUser) return { nodes: [], links: [] };

    // Central node (User)
    const nodes = [
      {
        id: 'me',
        name: currentUser.displayName || 'Me',
        val: 20, // Size
        color: '#a855f7', // Purple
        isUser: true,
        img: currentUser.photoURL
      }
    ];

    const links: any[] = [];

    // Friend nodes
    friends.forEach((friend) => {
      nodes.push({
        id: friend.userId,
        name: friend.displayName || 'Friend',
        val: 10,
        color: '#22d3ee', // Cyan
        isUser: false,
        img: friend.photoURL
      });

      links.push({
        source: 'me',
        target: friend.userId
      });
    });

    return { nodes, links };
  }, [friends, currentUser]);

  return (
    <div ref={containerRef} className="w-full border border-gray-800 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm relative">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          Constellation View
        </h3>
        <p className="text-gray-400 text-xs">Drag nodes to interact • Click to view profile</p>
      </div>
      
      <React.Suspense fallback={
        <div className="w-full h-[400px] flex items-center justify-center bg-gray-900/50">
           <div className="flex flex-col items-center gap-2">
             <Skeleton className="w-16 h-16 rounded-full" />
             <Skeleton className="w-32 h-4" />
             <p className="text-xs text-gray-500 mt-2">Loading constellation...</p>
           </div>
        </div>
      }>
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          nodeRelSize={6}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          backgroundColor="rgba(0,0,0,0)"
          onNodeClick={(node: any) => {
            if (!node.isUser) {
              navigate(`/member?id=${node.id}`);
            }
          }}
          // Custom node rendering to show avatars if available, or glowing dots
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            // Ensure coordinates are finite before drawing to prevent canvas errors
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

            const label = node.name;
            const fontSize = 12/globalScale;
            const r = Math.sqrt(node.val) * 3;
            
            // Draw Glow
            const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2);
            gradient.addColorStop(0, node.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 2, 0, 2 * Math.PI, false);
            ctx.fill();

            // Draw Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();
            
            // Draw Label
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, node.x, node.y + r + fontSize);
          }}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current?.zoomToFit(400)}
        />
      </React.Suspense>
    </div>
  );
}
