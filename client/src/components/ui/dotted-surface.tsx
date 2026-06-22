'use client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const { theme } = useTheme();

	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<{
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		particles: THREE.Points[];
		animationId: number;
		count: number;
	} | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		const isDark = theme !== 'light';
		const fogColor = isDark ? 0x0a0a0a : 0xffffff;

		// Scene setup
		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(fogColor, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(scene.fog.color, 0);

		containerRef.current.appendChild(renderer.domElement);

		// Create particles
		const positions: number[] = [];
		const colors: number[] = [];

		// Create geometry for all particles
		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Will be animated
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
				if (theme === 'light') {
					colors.push(0, 0, 0);
				} else {
					colors.push(200, 200, 200);
				}
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		// Create material
		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		// Create points object
		const points = new THREE.Points(geometry, material);
		scene.add(points);

		// `t` is the animation clock. We keep it wrapping smoothly with
		// modulo so it grows forever in *visual* terms without the
		// underlying float ever growing large enough to lose precision
		// (which is what eventually causes long-running wave animations
		// to look jittery or "stick").
		const TWO_PI = Math.PI * 2;
		let t = 0;
		let animationId: number;

		// Animation function — layers several slow sine/cosine waves of
		// different frequency, speed, and direction on top of each other.
		// This is the same trick used for ocean-swell shaders: no single
		// wave ever repeats in sync with another, so the combined surface
		// never visibly "resets" or loops, it just keeps rolling.
		const animate = () => {
			animationId = requestAnimationFrame(animate);

			const positionAttribute = geometry.attributes.position;
			const positions = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					const baseX = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
					const baseZ = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

					// Normalized grid coordinates, used so wave frequency
					// doesn't depend on grid size.
					const nx = ix / AMOUNTX;
					const ny = iy / AMOUNTY;

					// --- Vertical (Y) flow ---
					// Several waves of different wavelength/speed/direction,
					// added together for an organic rolling-swell look.
					const wave1 = Math.sin(nx * 6.0 + t * 1.0) * 35;
					const wave2 = Math.sin(ny * 8.0 - t * 1.4) * 45;
					const wave3 = Math.sin((nx + ny) * 5.0 + t * 0.6) * 25;
					const wave4 = Math.cos((nx - ny) * 7.0 - t * 0.9) * 18;
					const wave5 = Math.sin(nx * 3.0 + ny * 2.0 + t * 1.8) * 12;

					positions[index + 1] = wave1 + wave2 + wave3 + wave4 + wave5;

					// --- Horizontal sway (X) ---
					// Gentle, slower drift so dots don't just bob in place
					// but appear to surge sideways with the swell.
					positions[index] =
						baseX +
						Math.sin(ny * 4.0 + t * 0.5) * 22 +
						Math.cos(nx * 2.5 - t * 0.35) * 14;

					// --- Depth drift (Z) ---
					positions[index + 2] =
						baseZ +
						Math.cos(nx * 4.0 + t * 0.45) * 22 +
						Math.sin(ny * 2.5 - t * 0.3) * 14;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;
			geometry.computeBoundingBox();
			geometry.computeBoundingSphere();

			renderer.render(scene, camera);

			// Wrap `t` using modulo on a value that's a common multiple of
			// the (2π / speed) periods used above, so every wave lands back
			// at a matching phase simultaneously — keeping the loop visually
			// seamless while preventing `t` from growing unbounded.
			t += 0.008;
			if (t > TWO_PI * 1000) {
				t -= TWO_PI * 1000;
			}
		};

		// Handle window resize
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Start animation
		animate();

		// Store references
		sceneRef.current = {
			scene,
			camera,
			renderer,
			particles: [points],
			animationId,
			count: t,
		};

		// Cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);

			if (sceneRef.current) {
				cancelAnimationFrame(sceneRef.current.animationId);

				// Clean up Three.js objects
				sceneRef.current.scene.traverse((object) => {
					if (object instanceof THREE.Points) {
						object.geometry.dispose();
						if (Array.isArray(object.material)) {
							object.material.forEach((material) => material.dispose());
						} else {
							object.material.dispose();
						}
					}
				});

				sceneRef.current.renderer.dispose();

				if (containerRef.current && sceneRef.current.renderer.domElement) {
					containerRef.current.removeChild(
						sceneRef.current.renderer.domElement,
					);
				}
			}
		};
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 -z-1', className)}
			{...props}
		/>
	);
}